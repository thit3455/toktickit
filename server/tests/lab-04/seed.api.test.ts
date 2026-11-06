import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";
import { app } from "../../src/app.js";
import { seedLab4 } from "../../prisma/seed-lab4.js";
import { isolatedLab4Database } from "../helpers/lab4-database.js";

let isolated: PrismaClient;
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => isolated }));
describe.skipIf(!process.env.LAB4_TEST_DATABASE_URL)("Create-only Lab 4 seed (SEED-01, AC-20)", () => {
  let database: Awaited<ReturnType<typeof isolatedLab4Database>>;
  beforeAll(async () => { database = await isolatedLab4Database(); isolated = database.prisma; database.migrate(); }, 120000);
  afterAll(async () => { await database?.dispose(); });
  it("preserves intervening edits/passwords/dates/history across full seed reruns and supplies the required scenarios", async () => {
    const originalPassword = "SeedOriginal123!", changedPassword = "SeedChanged123!";
    // Use the real existing seed entry point twice, not a mock of its behavior.
    const { runDatabaseTool } = await import("../helpers/lab4-database.js");
    const { resolve } = await import("node:path");
    const runSeed = () => runDatabaseTool(process.execPath, ["--import", "tsx", resolve("prisma/seed.ts")], { ...process.env, DATABASE_URL: database.url.toString() });
    runSeed();
    const statuses = await isolated.ticket.groupBy({ by: ["currentStatus"] });
    expect(statuses.map(value => value.currentStatus).sort()).toEqual(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"].sort());
    expect((await isolated.ticket.groupBy({ by: ["itPriority"] })).length).toBe(4);
    expect((await isolated.ticket.groupBy({ by: ["requestedPriority"] })).length).toBe(3);
    const actionsPerTicket = await isolated.ticket.findMany({ where: { ticketNumber: { startsWith: "TKT-LAB4-" } }, select: { _count: { select: { actions: true } } } });
    for (const count of [0, 1, 3]) expect(actionsPerTicket.some(ticket => ticket._count.actions === count)).toBe(true);
    const completed = await isolated.actionTaken.findFirstOrThrow({ where: { status: "COMPLETED" } });
    expect(new Set([completed.createdById, completed.assignedToId, completed.performedById]).size).toBe(3);
    expect(await isolated.actionTaken.count({ where: { followUpRequired: true } })).toBeGreaterThan(0);
    expect(await isolated.actionTaken.count({ where: { assignedTo: { OR: [{ isActive: false }, { role: { not: "IT_STAFF" } }] } } })).toBe(0);
    const inactive = await isolated.user.findUniqueOrThrow({ where: { email: "lab4-inactive-assignee@toktickit.test" } });
    expect(inactive.isActive).toBe(false);
    const worker = request.agent(app);
    expect((await worker.post("/api/auth/login").send({ email: "lab4-creator@toktickit.test", password: "Password123!" })).status).toBe(200);
    expect((await worker.post("/api/auth/change-password").send({ currentPassword: "Password123!", newPassword: "SeedWorkerChanged123!" })).status).toBe(200);
    const parent = await isolated.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-LAB4-009" } });
    const countBeforeRejection = await isolated.actionTaken.count();
    const rejected = await worker.post(`/api/tickets/${parent.id}/actions-taken`).send({
      requestId: "aab37f31-89b6-4f8a-8102-a86f7d0c51cf", expectedTicketVersion: parent.version, assignedToId: inactive.id, description: "Must reject inactive assignment",
    });
    expect(rejected.status).toBe(400); expect(rejected.body.error.code).toBe("INVALID_ASSIGNEE");
    expect(await isolated.actionTaken.count()).toBe(countBeforeRejection);
    expect(await isolated.ticket.findUniqueOrThrow({ where: { id: parent.id } })).toEqual(parent);
    const emptyRequester = await isolated.user.findUniqueOrThrow({ where: { email: "lab4-empty-requester@toktickit.test" } });
    expect(await isolated.ticket.count({ where: { requesterId: emptyRequester.id } })).toBe(0);
    const changedHash = await bcrypt.hash(changedPassword, 4);
    await isolated.user.update({ where: { id: emptyRequester.id }, data: { name: "Retain changed name", passwordHash: changedHash, mustChangePassword: false } });
    await isolated.ticket.update({ where: { id: completed.ticketId }, data: { summary: "Retain staff changes", itPriority: "URGENT" } });
    await isolated.actionTaken.update({ where: { id: completed.id }, data: { result: "Retain corrected work", followUpRequired: false } });
    // Later real account changes are historical state: complete reruns must
    // preserve all participants and their existing work rather than repair roles.
    await isolated.user.update({ where: { email: "lab4-assignee@toktickit.test" }, data: { isActive: false } });
    await isolated.user.update({ where: { email: "lab4-creator@toktickit.test" }, data: { role: "REQUESTER" } });
    await isolated.user.update({ where: { email: "lab4-performer@toktickit.test" }, data: { isActive: false } });
    const snapshot = async () => ({
      users: await isolated.user.findMany({ orderBy: { id: "asc" } }), tickets: await isolated.ticket.findMany({ orderBy: { id: "asc" } }),
      actions: await isolated.actionTaken.findMany({ orderBy: { id: "asc" } }), revisions: await isolated.actionTakenRevision.findMany({ orderBy: { id: "asc" } }),
      events: await isolated.ticketStatusEvent.findMany({ orderBy: { id: "asc" } }),
    });
    const before = await snapshot(); runSeed(); expect(await snapshot()).toEqual(before);
    // Also exercise the exported increment with a different supplied initial hash:
    // existing password/work state must still win over seed defaults.
    await seedLab4(isolated, await bcrypt.hash(originalPassword, 4)); expect(await snapshot()).toEqual(before);
    const requester = request.agent(app);
    expect((await requester.post("/api/auth/login").send({ email: emptyRequester.email, password: changedPassword })).status).toBe(200);
    expect((await requester.get("/api/tickets/my")).status).toBe(200);
  }, 120000);
  it.each([
    { key: "creator", role: "IT_STAFF" as const, isActive: false, purpose: "creator" },
    { key: "creator", role: "REQUESTER" as const, isActive: true, purpose: "creator" },
    { key: "assignee", role: "IT_STAFF" as const, isActive: false, purpose: "assignee" },
    { key: "assignee", role: "REQUESTER" as const, isActive: true, purpose: "assignee" },
    { key: "performer", role: "IT_STAFF" as const, isActive: false, purpose: "performer/Ticket Owner" },
    { key: "performer", role: "REQUESTER" as const, isActive: true, purpose: "performer/Ticket Owner" },
    { key: "performer", role: "ADMINISTRATOR" as const, isActive: true, purpose: "performer/Ticket Owner" },
  ])("refuses new fixtures for ineligible $key ($role, active=$isActive) without overwriting it", async ({ key, role, isActive, purpose }) => {
    const fresh = await isolatedLab4Database();
    try {
      fresh.migrate();
      const account = await fresh.prisma.user.create({ data: { name: "Keep worker settings", email: `lab4-${key}@toktickit.test`, role, isActive, passwordHash: await bcrypt.hash("KeepPassword123!", 4) } });
      await expect(seedLab4(fresh.prisma, account.passwordHash)).rejects.toThrow(purpose);
      expect(await fresh.prisma.user.findUniqueOrThrow({ where: { id: account.id } })).toEqual(account);
      expect(await fresh.prisma.ticket.count()).toBe(0);
      expect(await fresh.prisma.actionTaken.count()).toBe(0);
      expect(await fresh.prisma.actionTakenRevision.count()).toBe(0);
    } finally { await fresh.dispose(); }
  }, 120000);
  it("allows an eligible existing Administrator creator and snapshots its current attribution", async () => {
    const fresh = await isolatedLab4Database();
    try {
      fresh.migrate();
      const creator = await fresh.prisma.user.create({ data: { name: "Preserved Admin creator", email: "lab4-creator@toktickit.test", role: "ADMINISTRATOR", passwordHash: await bcrypt.hash("KeepPassword123!", 4) } });
      await seedLab4(fresh.prisma, creator.passwordHash);
      expect(await fresh.prisma.user.findUniqueOrThrow({ where: { id: creator.id } })).toEqual(creator);
      const revisions = await fresh.prisma.actionTakenRevision.findMany({ where: { operation: "CREATE" } });
      expect(revisions.length).toBeGreaterThan(0);
      for (const revision of revisions) expect(revision).toMatchObject({ actorId: creator.id, actorName: creator.name, actorRole: "ADMINISTRATOR" });
    } finally { await fresh.dispose(); }
  }, 120000);
  it("preserves an existing partial fixture and refuses remaining work for an ineligible actor", async () => {
    const fresh = await isolatedLab4Database();
    try {
      fresh.migrate();
      const passwordHash = await bcrypt.hash("KeepPassword123!", 4);
      const creator = await fresh.prisma.user.create({ data: { name: "Keep changed creator", email: "lab4-creator@toktickit.test", role: "REQUESTER", passwordHash } });
      const category = await fresh.prisma.category.create({ data: { name: "Network" } });
      const system = await fresh.prisma.relatedSystem.create({ data: { name: "Campus Wi-Fi" } });
      const existing = await fresh.prisma.ticket.create({ data: { ticketNumber: "TKT-LAB4-001", requesterId: creator.id, categoryId: category.id, relatedSystemId: system.id, summary: "Retain partial fixture edits", description: "Earlier saved record must remain intact", requestedPriority: "HIGH", version: 7 } });
      await expect(seedLab4(fresh.prisma, passwordHash)).rejects.toThrow("creator");
      expect(await fresh.prisma.ticket.findMany()).toEqual([existing]);
      expect(await fresh.prisma.user.findUniqueOrThrow({ where: { id: creator.id } })).toEqual(creator);
      expect(await fresh.prisma.actionTaken.count()).toBe(0);
      expect(await fresh.prisma.actionTakenRevision.count()).toBe(0);
    } finally { await fresh.dispose(); }
  }, 120000);
});
