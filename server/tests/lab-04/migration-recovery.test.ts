import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { app } from "../../src/app.js";
import { disposableUrl, isolatedLab4Database, lab4Migration, postgres18Tools, runPostgresTool } from "../helpers/lab4-database.js";

let isolated: PrismaClient;
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => isolated }));
const earlierTables = ["User", "Category", "RelatedSystem", "Ticket", "Attachment", "TicketComment", "TicketInternalNote", "Session"];
async function preservedRows(prisma: PrismaClient) {
  const result: Record<string, unknown> = {};
  for (const table of earlierTables) {
    // Only constants from the allowlist above are interpolated; omit the single
    // approved new field while comparing every earlier value including bytea.
    result[table] = await prisma.$queryRawUnsafe(`SELECT COALESCE(jsonb_agg(to_jsonb(t) - 'version' ORDER BY t.id), '[]'::jsonb) AS rows FROM "${table}" t`);
  }
  return result;
}
async function recoveredActionRows(prisma: PrismaClient) {
  // Quiescent fixture: compare exact versions, timestamps, FKs and JSON payloads,
  // including Ticket.version omitted only by the earlier-data migration check.
  return {
    tickets: await prisma.ticket.findMany({ orderBy: { id: "asc" } }),
    actions: await prisma.actionTaken.findMany({ orderBy: { id: "asc" } }),
    revisions: await prisma.actionTakenRevision.findMany({ orderBy: { id: "asc" } }),
    requests: await prisma.actionCreateRequest.findMany({ orderBy: { id: "asc" } }),
  };
}
async function populateRecoveryWork(prisma: PrismaClient, email: string, password: string) {
  const requester = await prisma.user.findUniqueOrThrow({ where: { email } });
  const common = { passwordHash: requester.passwordHash, mustChangePassword: false };
  const creator = await prisma.user.create({ data: { ...common, name: "Recovery creator", email: "recovery-creator@example.test", role: "IT_STAFF" } });
  const assignee = await prisma.user.create({ data: { ...common, name: "Recovery assignee", email: "recovery-assignee@example.test", role: "IT_STAFF" } });
  const performer = await prisma.user.create({ data: { ...common, name: "Recovery performer", email: "recovery-performer@example.test", role: "ADMINISTRATOR" } });
  const category = await prisma.category.create({ data: { name: "Recovery active category" } });
  const system = await prisma.relatedSystem.create({ data: { name: "Recovery active system" } });
  const ticket = await prisma.ticket.create({ data: { ticketNumber: "LAB4-RECOVERY-WORK", requesterId: requester.id, assignedStaffId: assignee.id, categoryId: category.id, relatedSystemId: system.id, summary: "Recover persisted action work", description: "Isolated recovery fixture", requestedPriority: "HIGH" } });
  const worker = request.agent(app), completingActor = request.agent(app);
  expect((await worker.post("/api/auth/login").send({ email: creator.email, password })).status).toBe(200);
  expect((await completingActor.post("/api/auth/login").send({ email: performer.email, password })).status).toBe(200);
  const path = `/api/tickets/${ticket.id}/actions-taken`;
  const payload = { requestId: "0e8359d1-a3fa-4f9f-9cdd-aed60d223010", expectedTicketVersion: 0, assignedToId: assignee.id, description: "Planned recovery work" };
  const created = await worker.post(path).send(payload);
  expect(created.status).toBe(201);
  const original = created.body.data;
  const id = original.action.id;
  const started = await worker.patch(`${path}/${id}`).send({ expectedVersion: 1, expectedTicketVersion: 1, status: "IN_PROGRESS" });
  expect(started.status).toBe(200);
  const completed = await completingActor.patch(`${path}/${id}`).send({ expectedVersion: 2, expectedTicketVersion: 2, status: "COMPLETED", result: "Verified recovery result" });
  expect(completed.status).toBe(200);
  const corrected = await worker.patch(`${path}/${id}`).send({ expectedVersion: 3, expectedTicketVersion: 3, result: "Corrected recovery result" });
  expect(corrected.status).toBe(200);
  expect(corrected.body.data.action).toMatchObject({ version: 4, createdBy: { id: creator.id }, assignedTo: { id: assignee.id }, performedBy: { id: performer.id }, completedAt: completed.body.data.action.completedAt });
  const pending = await worker.post(path).send({ ...payload, requestId: "0e8359d1-a3fa-4f9f-9cdd-aed60d223011", expectedTicketVersion: 4, description: "Pending recovery follow-up", followUpRequired: true, followUpNote: "Retest restored state" });
  expect(pending.status).toBe(201);
  expect(pending.body.data.ticketVersion).toBe(5);
  // Current account names may change; historical revision attribution must not.
  await prisma.user.update({ where: { id: creator.id }, data: { name: "Renamed recovery creator" } });
  return { path, ticketId: ticket.id, actionId: id, pendingId: pending.body.data.action.id, creator, assignee, performer, payload, original };
}
describe.skipIf(!process.env.LAB4_TEST_DATABASE_URL)("Actual migration and isolated recovery (MIG-01/02, AC-19/21)", () => {
  let database: Awaited<ReturnType<typeof isolatedLab4Database>>;
  let before: Awaited<ReturnType<typeof preservedRows>>;
  let ticketId: number;
  let tools: ReturnType<typeof postgres18Tools>;
  const email = "legacy-requester@example.test", password = "LegacyTest123!";
  beforeAll(async () => {
    // Check all selected client versions before this suite creates any schema.
    if (process.env.LAB4_RECOVERY_DATABASE_URL) tools = postgres18Tools();
    database = await isolatedLab4Database(); isolated = database.prisma;
    database.migrate(false); // replay every unmodified pre-Lab-4 SQL migration
    const passwordHash = await bcrypt.hash(password, 4);
    const requester = await isolated.user.create({ data: { name: "Legacy requester", email, role: "REQUESTER", passwordHash, mustChangePassword: false } });
    const owner = await isolated.user.create({ data: { name: "Legacy inactive owner", email: "legacy-owner@example.test", role: "IT_STAFF", passwordHash, isActive: false } });
    const category = await isolated.category.create({ data: { name: "Legacy category", isActive: false } });
    const system = await isolated.relatedSystem.create({ data: { name: "Legacy system", isActive: false } });
    // New Prisma Ticket defaults include version, which deliberately does not
    // exist yet. Insert this earlier-shape fixture using parameterized SQL.
    const rows = await isolated.$queryRaw<{ id: number }[]>`INSERT INTO "Ticket" ("ticketNumber", "requesterId", "assignedStaffId", "categoryId", "relatedSystemId", "summary", "description", "requestedPriority", "itPriority", "currentStatus", "requesterResolvedAt", "createdAt", "updatedAt") VALUES ('LEGACY-LAB4-PRESERVE', ${requester.id}, ${owner.id}, ${category.id}, ${system.id}, 'Preserve earlier data', 'Unicode ภาษาไทย and attachment bytes', 'HIGH', 'URGENT', 'RESOLVED', '2026-10-01 02:03:04.123'::timestamp, '2026-09-01 01:02:03.456'::timestamp, '2026-10-02 03:04:05.789'::timestamp) RETURNING id`;
    ticketId = rows[0].id;
    await isolated.attachment.create({ data: { ticketId, fileName: "legacy.pdf", mimeType: "application/pdf", fileSize: 6, content: Buffer.from([0, 1, 2, 127, 128, 255]), isRemoved: true, removalReason: "Retained earlier removal reason", uploadedAt: new Date("2026-09-01T01:02:03.456Z"), removedAt: new Date("2026-09-02T01:02:03.456Z") } });
    await isolated.ticketComment.create({ data: { ticketId, userId: requester.id, message: "Preserve shared comment" } });
    await isolated.ticketInternalNote.create({ data: { ticketId, userId: owner.id, message: "Preserve private note" } });
    await isolated.session.create({ data: { userId: requester.id, sessionId: "legacy-session-preservation-fixture", expiresAt: new Date("2099-01-01T00:00:00.000Z") } });
    before = await preservedRows(isolated);
  }, 120000);
  afterAll(async () => { await database?.dispose(); });
  it("adds versions/tables while preserving all earlier records and creating no fictional history", async () => {
    database.migrate();
    expect(await preservedRows(isolated)).toEqual(before);
    expect(await isolated.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { version: true, currentStatus: true } })).toEqual({ version: 0, currentStatus: "RESOLVED" });
    expect(await isolated.actionTaken.count()).toBe(0);
    expect(await isolated.actionTakenRevision.count()).toBe(0);
    expect(await isolated.actionCreateRequest.count()).toBe(0);
    expect(await isolated.ticketStatusEvent.count()).toBe(0);
    const newInstants = await isolated.$queryRaw<{ data_type: string; datetime_precision: number }[]>`SELECT data_type, datetime_precision FROM information_schema.columns WHERE table_schema = ${database.schema} AND table_name IN ('ActionTaken', 'ActionTakenRevision', 'TicketStatusEvent', 'ActionCreateRequest') AND column_name IN ('createdAt', 'updatedAt', 'completedAt', 'cancelledAt')`;
    expect(newInstants.length).toBe(7);
    expect(newInstants.every(column => column.data_type === "timestamp with time zone" && column.datetime_precision === 3)).toBe(true);
    const agent = request.agent(app);
    expect((await agent.post("/api/auth/login").send({ email, password })).status).toBe(200);
    expect((await agent.get(`/api/tickets/${ticketId}`)).status).toBe(200);
    const actions = await agent.get(`/api/tickets/${ticketId}/actions-taken`);
    expect(actions.status).toBe(200); expect(actions.body.data).toMatchObject({ ticketVersion: 0, items: [] });
    const applied = await isolated.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name`;
    expect(applied.map(row => row.migration_name)).toContain(lab4Migration);
  }, 120000);
  it.skipIf(!process.env.LAB4_RECOVERY_DATABASE_URL)("backs up, verifies and restores into a distinct empty disposable database namespace", async () => {
    // Also supports selecting this recovery test independently of MIG-01.
    database.migrate();
    const target = disposableUrl("LAB4_RECOVERY_DATABASE_URL");
    if (target.pathname === database.url.pathname && target.port === database.url.port && target.hostname === database.url.hostname) throw new Error("Recovery target must be a distinct disposable database.");
    target.searchParams.set("schema", database.schema);
    const restored = new PrismaClient({ datasources: { db: { url: target.toString() } } });
    const exists = await restored.$queryRaw<{ exists: boolean }[]>`SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = ${database.schema}) AS exists`;
    if (exists[0].exists) { await restored.$disconnect(); throw new Error("Refusing to restore over an existing schema."); }
    const backup = join(database.directory, "preservation.dump");
    let restoreStarted = false;
    const source = isolated;
    try {
      const work = await populateRecoveryWork(source, email, password);
      const beforeLegacy = await preservedRows(source);
      const beforeActions = await recoveredActionRows(source);
      expect(beforeActions.actions).toHaveLength(2);
      expect(beforeActions.revisions).toHaveLength(5);
      expect(beforeActions.requests).toHaveLength(2);
      runPostgresTool(tools, "pg_dump", ["--format=custom", "--no-owner", "--no-acl", `--schema=${database.schema}`, `--file=${backup}`], database.url);
      const digest = createHash("sha256").update(readFileSync(backup)).digest("hex");
      const contents = runPostgresTool(tools, "pg_restore", ["--list", backup]).toString();
      expect(contents).toContain("_prisma_migrations"); expect(contents).toContain("Ticket");
      for (const table of ["ActionTaken", "ActionTakenRevision", "ActionCreateRequest"]) expect(contents).toContain(table);
      writeFileSync(join(database.directory, "backup-metadata.json"), JSON.stringify({ schema: database.schema, migration: lab4Migration, sha256: digest, createdAt: new Date().toISOString() }, null, 2));
      restoreStarted = true;
      runPostgresTool(tools, "pg_restore", ["--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", backup], target);
      expect(createHash("sha256").update(readFileSync(backup)).digest("hex")).toBe(digest);
      expect(await preservedRows(restored)).toEqual(beforeLegacy);
      expect(await recoveredActionRows(restored)).toEqual(beforeActions);
      const levels = (client: PrismaClient) => client.$queryRaw<Prisma.JsonObject[]>`SELECT migration_name, checksum, finished_at FROM "_prisma_migrations" ORDER BY migration_name`;
      expect(await levels(restored)).toEqual(await levels(source));
      isolated = restored;
      const agent = request.agent(app);
      expect((await agent.post("/api/auth/login").send({ email, password })).status).toBe(200);
      const detail = await agent.get(`/api/tickets/${ticketId}`);
      expect(detail.status).toBe(200); expect(detail.body.data.ticketNumber).toBe("LEGACY-LAB4-PRESERVE");
      expect((await agent.get(`/api/tickets/${ticketId}/actions-taken`)).body.data.items).toEqual([]);
      const current = await agent.get(work.path);
      expect(current.status).toBe(200);
      expect(current.body.data.ticketVersion).toBe(5);
      expect(current.body.data.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: work.actionId, status: "COMPLETED", version: 4, result: "Corrected recovery result", createdBy: { id: work.creator.id, name: "Renamed recovery creator" }, assignedTo: { id: work.assignee.id, name: work.assignee.name, role: "IT_STAFF", isActive: true }, performedBy: { id: work.performer.id, name: work.performer.name } }),
        expect.objectContaining({ id: work.pendingId, status: "PLANNED", followUpRequired: true, followUpNote: "Retest restored state" }),
      ]));
      const worker = request.agent(app);
      expect((await worker.post("/api/auth/login").send({ email: work.creator.email, password })).status).toBe(200);
      const history = await worker.get(`${work.path}/${work.actionId}/history`);
      expect(history.status).toBe(200);
      expect(history.body.data.items.map((revision: { version: number }) => revision.version)).toEqual([1, 2, 3, 4]);
      expect(history.body.data.items[0]).toMatchObject({ operation: "CREATE", actor: { id: work.creator.id, name: work.creator.name, role: "IT_STAFF" }, snapshot: { status: "PLANNED", performedById: null, version: 1 } });
      expect(history.body.data.items[2]).toMatchObject({ operation: "STATUS", actor: { id: work.performer.id, name: work.performer.name, role: "ADMINISTRATOR" }, snapshot: { status: "COMPLETED", performedById: work.performer.id, version: 3 } });
      const replay = await worker.post(work.path).send(work.payload);
      expect(replay.status).toBe(201);
      expect(replay.body.data).toEqual({ ...work.original, replayed: true });
      const mismatch = await worker.post(work.path).send({ ...work.payload, description: "Changed replay must conflict" });
      expect(mismatch.status).toBe(409); expect(mismatch.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
      expect(await recoveredActionRows(restored)).toEqual(beforeActions);
      // Restored sequences and FKs must also support subsequent real writes.
      const additional = await worker.post(work.path).send({ ...work.payload, requestId: "0e8359d1-a3fa-4f9f-9cdd-aed60d223012", expectedTicketVersion: 5, description: "New work after restore" });
      expect(additional.status).toBe(201);
      expect(additional.body.data.action.id).toBeGreaterThan(Math.max(...beforeActions.actions.map(action => action.id)));
      expect(additional.body.data.ticketVersion).toBe(6);
      expect(await restored.actionTakenRevision.findMany({ where: { actionId: { in: beforeActions.actions.map(action => action.id) } }, orderBy: { id: "asc" } })).toEqual(beforeActions.revisions);
      expect(await restored.actionCreateRequest.count()).toBe(3);
      // Post-restore logins/replay/new writes must not mutate the source schema.
      expect(await preservedRows(source)).toEqual(beforeLegacy);
      expect(await recoveredActionRows(source)).toEqual(beforeActions);
    } finally {
      isolated = source;
      // The namespace was verified absent before this restore. No --clean,
      // database reset/drop or restore over an existing schema is ever used.
      if (restoreStarted && /^lab4_[a-f0-9]{32}$/.test(database.schema)) await restored.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${database.schema}" CASCADE`);
      await restored.$disconnect();
    }
  }, 120000);
});
