import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import bcrypt from "bcrypt";
import request from "supertest";
import { app } from "../../src/app.js";

let isolated: PrismaClient;
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => isolated }));

describe("Lab 2 migration and initial-password authentication", () => {
  const schema = `migration_auth_${randomUUID().replaceAll("-", "")}`;
  const existing = new PrismaClient();
  const repair = "20261003090000_repair_migrated_requester_passwords";
  const initialPassword = "Password123!";
  const marker = "$2b$10$TemporaryPasswordHash";
  let created = false;
  let validHash: string;

  async function applyMigration(name: string) {
    // Execute the repository SQL on one connection: the ownership migration uses
    // a temporary mapping table. These migrations contain no procedural SQL.
    const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
    const statements = sql.replace(/--[^\n]*/g, "").split(";").map(s => s.trim()).filter(Boolean);
    await isolated.$transaction(async tx => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
    });
  }

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) process.loadEnvFile(".env");
    const url = new URL(process.env.DATABASE_URL!);
    if (!/^migration_auth_[a-f0-9]{32}$/.test(schema) || url.searchParams.get("schema") === schema) throw new Error("Unsafe test schema");
    await existing.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    url.searchParams.set("schema", schema);
    isolated = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    validHash = await bcrypt.hash("ExistingPassword123!", 4);
    const migrations = readdirSync("prisma/migrations", { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
    for (const migration of migrations) {
      await applyMigration(migration);
      if (migration === "20260904185209_lab2_ticket_attachments") {
        await isolated.$executeRawUnsafe(`INSERT INTO "RequesterUser" (id,name,email,"isActive","updatedAt") VALUES
          (101,'Legacy active','legacy@example.test',true,'2026-09-01'),
          (202,'Legacy inactive','inactive@example.test',false,'2026-09-01'),
          (303,'Existing account','existing@example.test',true,'2026-09-01')`);
        await isolated.$executeRawUnsafe(`INSERT INTO "Category" (id,name) VALUES (1,'Hardware')`);
        await isolated.$executeRawUnsafe(`INSERT INTO "RelatedSystem" (id,name,"updatedAt") VALUES (1,'Office','2026-09-01')`);
        await isolated.$executeRawUnsafe(`INSERT INTO "Ticket" (id,"ticketNumber","requesterId","categoryId","relatedSystemId",summary,description,"requestedPriority","updatedAt") VALUES
          (1,'MIG-001',101,1,1,'Laptop failure','Cannot start laptop','HIGH','2026-09-01'),
          (2,'MIG-002',202,1,1,'Monitor failure','Blank screen','LOW','2026-09-01'),
          (3,'MIG-003',303,1,1,'Keyboard failure','Broken keys','MEDIUM','2026-09-01')`);
        await isolated.$executeRawUnsafe(`INSERT INTO "Attachment" ("ticketId","fileName","mimeType","fileSize",content) VALUES (1,'error.txt','text/plain',3,decode('616263','hex'))`);
      }
      if (migration === "20260916152458_lab3_user_foundation") {
        await isolated.$executeRaw`INSERT INTO "User" (name,email,"passwordHash",role,"mustChangePassword","updatedAt") VALUES ('Existing account','existing@example.test',${validHash},'REQUESTER',false,'2026-09-01')`;
      }
      if (migration === "20260917_migrate_requester_to_user") {
        expect((await isolated.user.findUniqueOrThrow({ where: { email: "legacy@example.test" } })).passwordHash).toBe(marker);
      }
    }
  }, 60000);

  afterAll(async () => {
    await isolated?.$disconnect();
    if (created && /^migration_auth_[a-f0-9]{32}$/.test(schema)) await existing.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await existing.$disconnect();
  });

  it.each([
    ["7 characters", "a".repeat(7), 400],
    ["8 characters", "a".repeat(8), 200],
    ["72 bytes", "a".repeat(72), 200],
    ["73 bytes", "a".repeat(73), 400],
    ["72 multibyte bytes", "é".repeat(36), 200],
    ["73 multibyte bytes", "é".repeat(36) + "a", 400],
  ])("validates password boundary: %s", async (_label, password, status) => {
    const user = await isolated.user.create({ data: { name: "Boundary", email: `${randomUUID()}@example.test`, role: "REQUESTER", passwordHash: validHash, mustChangePassword: true } });
    try {
      const actor = request.agent(app);
      expect((await actor.post("/api/auth/login").send({ email: user.email, password: "ExistingPassword123!" })).status).toBe(200);
      const result = await actor.post("/api/auth/change-password").send({ currentPassword: "ExistingPassword123!", newPassword: password });
      expect(result.status).toBe(status);
      const saved = await isolated.user.findUniqueOrThrow({ where: { id: user.id } });
      if (status === 400) {
        expect(result.body.error.code).toBe("WEAK_PASSWORD");
        expect(saved.passwordHash).toBe(validHash);
        expect(saved.mustChangePassword).toBe(true);
      } else {
        expect(await bcrypt.compare(String(password), saved.passwordHash)).toBe(true);
        expect(saved.mustChangePassword).toBe(false);
      }
    } finally {
      await isolated.session.deleteMany({ where: { userId: user.id } });
      await isolated.user.delete({ where: { id: user.id } });
    }
  });

  it("migrates legacy Requesters and preserves ownership and attachments when IDs change", async () => {
    expect(await isolated.user.count()).toBe(3);
    const tickets = await isolated.ticket.findMany({ orderBy: { id: "asc" }, include: { requester: true, attachments: true } });
    expect(tickets.map(t => t.requester.email)).toEqual(["legacy@example.test", "inactive@example.test", "existing@example.test"]);
    expect(tickets.map(t => t.ticketNumber)).toEqual(["MIG-001", "MIG-002", "MIG-003"]);
    expect(tickets[0].requesterId).not.toBe(101);
    expect(tickets[0].requester).toMatchObject({ name: "Legacy active", role: "REQUESTER", isActive: true });
    expect(tickets[0].attachments[0].content).toEqual(Buffer.from("abc"));
    expect(tickets[1].requester).toMatchObject({ name: "Legacy inactive", role: "REQUESTER", isActive: false });
  });

  it("preserves existing usable credentials and inactive account state", async () => {
    const user = await isolated.user.findUniqueOrThrow({ where: { email: "existing@example.test" } });
    expect(user).toMatchObject({ passwordHash: validHash, mustChangePassword: false });
    const inactive = await isolated.user.findUniqueOrThrow({ where: { email: "inactive@example.test" } });
    expect(await bcrypt.compare(initialPassword, inactive.passwordHash)).toBe(true);
    expect(inactive.mustChangePassword).toBe(true);
    const result = await request(app).post("/api/auth/login").send({ email: inactive.email, password: initialPassword });
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("ACCOUNT_INACTIVE");
  });

  it("requires password change after migrated login and preserves the new password when repair reruns", async () => {
    const actor = request.agent(app);
    const user = await isolated.user.findUniqueOrThrow({ where: { email: "legacy@example.test" } });
    expect(await bcrypt.compare(initialPassword, user.passwordHash)).toBe(true);
    const login = await actor.post("/api/auth/login").send({ email: user.email, password: initialPassword });
    expect(login.status).toBe(200);
    expect(login.body.data.user.mustChangePassword).toBe(true);
    const blocked = await actor.get("/api/tickets");
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect((await actor.post("/api/auth/change-password").send({ currentPassword: initialPassword, newPassword: "ChangedMigration123!" })).status).toBe(200);
    const changed = await isolated.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(changed.mustChangePassword).toBe(false);
    await applyMigration(repair);
    await applyMigration(repair);
    expect(await isolated.user.findUniqueOrThrow({ where: { id: user.id } })).toEqual(changed);
    await actor.post("/api/auth/logout");
    expect((await actor.post("/api/auth/login").send({ email: user.email, password: initialPassword })).status).toBe(401);
    expect((await actor.post("/api/auth/login").send({ email: user.email, password: "ChangedMigration123!" })).status).toBe(200);
    expect((await actor.get("/api/tickets")).status).toBe(200);
    expect((await actor.get("/api/tickets/1")).status).toBe(200);
    expect((await isolated.ticket.findUniqueOrThrow({ where: { id: 1 } })).requesterId).toBe(user.id);
  });
});
