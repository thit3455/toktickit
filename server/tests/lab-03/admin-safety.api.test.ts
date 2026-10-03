import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import bcrypt from "bcrypt";
import request from "supertest";
import { app } from "../../src/app.js";

// Only redirect the database connection; routes, authentication, transactions and counts are real.
let isolated: PrismaClient;
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => isolated }));

describe("Administrator safety in an isolated database schema", () => {
  const schema = `admin_safety_${randomUUID().replaceAll("-", "")}`;
  const existing = new PrismaClient();
  let schemaCreated = false;
  let adminId: number;
  let actor: ReturnType<typeof request.agent>;
  let snapshot: Awaited<ReturnType<typeof administratorStates>>;
  const password = "IsolatedAdmin123!";
  function administratorStates(ids?: number[]) {
    // Seed/development accounts use toktickit.test. Parallel suites create and
    // remove disposable example.test Administrators; those are not this suite's data.
    // Re-read captured IDs without a role filter so a demotion/deletion still fails.
    return existing.user.findMany({
      where: ids ? { id: { in: ids } } : { role: "ADMINISTRATOR", email: { endsWith: "@toktickit.test", mode: "insensitive" } },
      select: { id: true, role: true, isActive: true, updatedAt: true }, orderBy: { id: "asc" },
    });
  }
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) process.loadEnvFile(".env");
    const url = new URL(process.env.DATABASE_URL!);
    if (!/^admin_safety_[a-f0-9]{32}$/.test(schema) || url.searchParams.get("schema") === schema) throw new Error("Unsafe test schema");
    snapshot = await administratorStates();
    url.searchParams.set("schema", schema);
    isolated = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    // This statement can only create the unique test schema, never alter an existing schema.
    await existing.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    try {
      execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--schema", "prisma/schema.prisma", "--skip-generate"], {
        env: { ...process.env, DATABASE_URL: url.toString() }, stdio: "pipe", timeout: 60000,
      });
    } catch { throw new Error("Unable to initialize isolated safety-test schema"); }
  }, 70000);
  beforeEach(async () => {
    await isolated.session.deleteMany();
    await isolated.user.deleteMany();
    const admin = await isolated.user.create({ data: { name: "Isolated Administrator", email: "isolated-admin@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, passwordHash: await bcrypt.hash(password, 4) } });
    adminId = admin.id;
    expect(await isolated.user.count({ where: { role: "ADMINISTRATOR", isActive: true } })).toBe(1);
    actor = request.agent(app);
    expect((await actor.post("/api/auth/login").send({ email: admin.email, password })).status).toBe(200);
  });
  afterAll(async () => {
    try {
      if (snapshot) expect(await administratorStates(snapshot.map(user => user.id))).toEqual(snapshot);
    } finally {
      await isolated?.$disconnect();
      if (schemaCreated && /^admin_safety_[a-f0-9]{32}$/.test(schema)) await existing.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      await existing.$disconnect();
    }
  });
  async function remainsActive() {
    expect(await isolated.user.findUniqueOrThrow({ where: { id: adminId }, select: { isActive: true, role: true } })).toEqual({ isActive: true, role: "ADMINISTRATOR" });
    expect(await isolated.user.count({ where: { role: "ADMINISTRATOR", isActive: true } })).toBe(1);
    expect((await actor.get("/api/admin/users")).status).toBe(200);
  }
  it("rejects authenticated self-deactivation and keeps the Administrator active", async () => {
    const result = await actor.patch(`/api/admin/users/${adminId}`).send({ isActive: false });
    expect(result.status).toBe(409);
    expect(result.body.error).toMatchObject({ code: "SELF_DEACTIVATION", message: "You cannot deactivate your own account." });
    await remainsActive();
  });
  it("rejects deactivation of the sole active Administrator through a direct API request", async () => {
    const result = await actor.patch(`/api/admin/users/${adminId}`).send({ isActive: false, role: "REQUESTER" });
    expect(result.status).toBe(409);
    expect(result.body.error).toMatchObject({ code: "SELF_DEACTIVATION", message: "You cannot deactivate your own account." });
    await remainsActive();
  });
  it.each(["REQUESTER", "IT_STAFF"])("rejects changing the sole active Administrator to %s through the API", async role => {
    const result = await actor.patch(`/api/admin/users/${adminId}`).send({ role });
    expect(result.status).toBe(409);
    expect(result.body.error).toMatchObject({ code: "LAST_ADMINISTRATOR", message: "At least one active Administrator must remain." });
    await remainsActive();
  });
  it("rejects unauthenticated deactivation of the sole active Administrator", async () => {
    const result = await request(app).patch(`/api/admin/users/${adminId}`).send({ isActive: false });
    expect(result.status).toBe(401);
    await remainsActive();
  });
});
