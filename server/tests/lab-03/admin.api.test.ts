import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import request from "supertest";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { requesterFixture } from "../helpers/requester.js";

describe("Administrator user management API", () => {
  const prisma = getPrisma();
  const stamp = randomUUID();
  const ids: number[] = [];
  let f: Awaited<ReturnType<typeof requesterFixture>>;
  let number = 0;
  const input = (overrides = {}) => ({ name: "Admin managed account", email: `admin-test-${stamp}-${number++}@example.test`, role: "REQUESTER", password: "InitialPass123!", ...overrides });
  const create = async (overrides = {}) => {
    const body = input(overrides);
    const result = await f.agents[3].post("/api/admin/users").send(body);
    if (result.body.data?.id) ids.push(result.body.data.id);
    return { result, body };
  };
  beforeAll(async () => { f = await requesterFixture(); });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await f?.cleanup();
  });
  it("lists existing accounts without password hashes or sessions", async () => {
    const result = await f.agents[3].get("/api/admin/users");
    expect(result.status).toBe(200);
    expect(result.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: f.users[0].id, role: "REQUESTER", isActive: true })]));
    for (const user of result.body.data) expect(Object.keys(user).sort()).toEqual(["id", "name", "email", "role", "isActive", "mustChangePassword"].sort());
  });
  it("searches name/email case-insensitively and combines role/status filters", async () => {
    const { result, body } = await create({ name: `Unique Name ${stamp}`, role: "IT_STAFF", isActive: false });
    expect(result.status).toBe(201);
    for (const search of [body.name.toUpperCase(), body.email.toUpperCase()]) {
      const found = await f.agents[3].get("/api/admin/users").query({ search, role: "IT_STAFF", active: "false" });
      expect(found.status).toBe(200);
      expect(found.body.data.map((user: { id: number }) => user.id)).toEqual([result.body.data.id]);
    }
    expect((await f.agents[3].get("/api/admin/users").query({ search: body.email, active: "true" })).body.data).toEqual([]);
    expect((await f.agents[3].get("/api/admin/users").query({ search: `absent-${stamp}` })).body.data).toEqual([]);
  });
  it.each(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"])("creates %s with a hashed initial password", async role => {
    const { result, body } = await create({ role });
    expect(result.status).toBe(201);
    expect(result.body.data).toMatchObject({ name: body.name, email: body.email, role, isActive: true, mustChangePassword: true });
    expect(result.text).not.toContain(body.password);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: result.body.data.id } });
    expect(saved.passwordHash).not.toBe(body.password);
    expect(await bcrypt.compare(body.password, saved.passwordHash)).toBe(true);
  });
  it.each([
    { name: "" }, { name: "   " }, { name: "x".repeat(121) }, { email: "invalid" },
    { email: "x@y" }, { email: "x y@example.test" }, { role: "SUPERUSER" }, { role: ["IT_STAFF", "ADMINISTRATOR"] },
    { isActive: "false" }, { password: "short" }, { password: "x".repeat(73) }, { passwordHash: "forged" },
    { mustChangePassword: false }, { id: 1 }, { sessions: [] }
  ])("rejects invalid/unsupported create fields %#", async invalid => {
    const result = await f.agents[3].post("/api/admin/users").send(input(invalid));
    expect(result.status).toBe(400);
    expect(result.text).not.toContain("forged");
  });
  it("rejects duplicate email on create and edit including case variations", async () => {
    const { result, body } = await create();
    const duplicate = await f.agents[3].post("/api/admin/users").send(input({ email: body.email.toUpperCase() }));
    expect(duplicate.status).toBe(409); expect(duplicate.body.error.fields.email).toBeDefined();
    const edit = await f.agents[3].patch(`/api/admin/users/${result.body.data.id}`).send({ email: f.users[0].email.toUpperCase() });
    expect(edit.status).toBe(409);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: result.body.data.id } })).email).toBe(body.email);
  });
  it("allows only one of two concurrent duplicate creations", async () => {
    const body = input();
    const results = await Promise.all([f.agents[3].post("/api/admin/users").send(body), f.agents[3].post("/api/admin/users").send(body)]);
    for (const result of results) if (result.body.data?.id) ids.push(result.body.data.id);
    expect(results.map(result => result.status).sort()).toEqual([201, 409]);
  });
  it("persists edited fields, one role and activation through a fresh list request", async () => {
    const { result } = await create();
    const id = result.body.data.id;
    const changes = { name: "Edited staff account", email: `edited-${stamp}@example.test`, role: "IT_STAFF", isActive: false };
    const edit = await f.agents[3].patch(`/api/admin/users/${id}`).send(changes);
    expect(edit.status).toBe(200); expect(edit.body.data).toMatchObject(changes);
    expect(await prisma.user.findUniqueOrThrow({ where: { id } })).toMatchObject(changes);
    expect((await f.agents[3].get("/api/admin/users").query({ search: changes.email })).body.data[0]).toMatchObject(changes);
    expect((await f.agents[3].patch(`/api/admin/users/${id}`).send({ isActive: true })).body.data.isActive).toBe(true);
  });
  it.each([{}, { name: " " }, { email: "bad" }, { role: "OWNER" }, { roles: ["ADMINISTRATOR"] }, { password: "forged" }, { passwordHash: "forged" }, { mustChangePassword: false }, { isActive: 0 }])("rejects unsupported/invalid edits %#", async changes => {
    const result = await f.agents[3].patch(`/api/admin/users/${f.users[0].id}`).send(changes);
    expect(result.status).toBe(400);
  });
  it("deactivation invalidates existing sessions and blocks login until activation", async () => {
    const target = f.users[1];
    expect((await f.agents[1].get("/api/tickets")).status).toBe(200);
    expect((await f.agents[3].patch(`/api/admin/users/${target.id}`).send({ isActive: false })).status).toBe(200);
    expect((await f.agents[1].get("/api/tickets")).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: target.email, password: f.password })).status).toBe(403);
    await f.agents[3].patch(`/api/admin/users/${target.id}`).send({ isActive: true });
    expect((await f.agents[1].post("/api/auth/login").send({ email: target.email, password: f.password })).status).toBe(200);
  });
  it("rejects self-deactivation through direct API requests", async () => {
    const result = await f.agents[3].patch(`/api/admin/users/${f.users[3].id}`).send({ isActive: false });
    expect(result.status).toBe(409); expect(result.body.error.code).toBe("SELF_DEACTIVATION");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.users[3].id } })).isActive).toBe(true);
  });
  it("protects the last active Administrator without modifying real administrators", async () => {
    // Simulate a database containing only the fixture Administrator; writes still use a real transaction.
    const transaction = prisma.$transaction.bind(prisma);
    vi.spyOn(prisma, "$transaction").mockImplementationOnce(((work: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) =>
      transaction(async tx => {
        vi.spyOn(tx.user, "count").mockResolvedValueOnce(1);
        return work(tx);
      }, options)) as typeof prisma.$transaction);
    const result = await f.agents[3].patch(`/api/admin/users/${f.users[3].id}`).send({ role: "REQUESTER" });
    expect(result.status).toBe(409); expect(result.body.error.code).toBe("LAST_ADMINISTRATOR");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.users[3].id } })).role).toBe("ADMINISTRATOR");
  });
  it("allows self-role change when another active Administrator remains and revokes the old session", async () => {
    const { result, body } = await create({ role: "ADMINISTRATOR" });
    const actor = request.agent(app);
    await actor.post("/api/auth/login").send({ email: body.email, password: body.password });
    await actor.post("/api/auth/change-password").send({ currentPassword: body.password, newPassword: "ChangedPass123!" });
    const changed = await actor.patch(`/api/admin/users/${result.body.data.id}`).send({ role: "REQUESTER" });
    expect(changed.status).toBe(200);
    expect((await actor.get("/api/admin/users")).status).toBe(401);
    await actor.post("/api/auth/login").send({ email: body.email, password: "ChangedPass123!" });
    expect((await actor.get("/api/admin/users")).status).toBe(403);
  });
  it("sets a hashed initial password, revokes sessions and requires password change", async () => {
    const target = f.users[1];
    const result = await f.agents[3].post(`/api/admin/users/${target.id}/password`).send({ password: "ResetInitial123!" });
    expect(result.status).toBe(200); expect(result.body.data.mustChangePassword).toBe(true);
    expect(result.text).not.toContain("ResetInitial");
    expect((await f.agents[1].get("/api/auth/me")).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: target.email, password: f.password })).status).toBe(401);
    expect((await f.agents[1].post("/api/auth/login").send({ email: target.email, password: "ResetInitial123!" })).status).toBe(200);
    expect((await f.agents[1].get("/api/tickets")).status).toBe(403);
    expect((await f.agents[1].post("/api/auth/change-password").send({ currentPassword: "ResetInitial123!", newPassword: "UserChanged123!" })).status).toBe(200);
    expect((await f.agents[1].get("/api/tickets")).status).toBe(200);
  });
  it.each(["", "invalid", "0", "-1", "2147483648"])("rejects missing or invalid user ID %s", async id => {
    expect((await f.agents[3].patch(`/api/admin/users/${id}`).send({ name: "Changed" })).status).toBe(id ? 400 : 404);
  });
  it("returns safe not-found and invalid password responses", async () => {
    expect((await f.agents[3].patch("/api/admin/users/2147483647").send({ name: "Changed" })).status).toBe(404);
    expect((await f.agents[3].post("/api/admin/users/2147483647/password").send({ password: "NewInitial123!" })).status).toBe(404);
    expect((await f.agents[3].post(`/api/admin/users/${f.users[0].id}/password`).send({ password: "short" })).status).toBe(400);
    expect((await f.agents[3].delete(`/api/admin/users/${f.users[0].id}`)).status).toBe(404);
  });
  it.each([{ role: "OWNER" }, { active: "yes" }, { search: ["one", "two"] }, { role: ["REQUESTER", "IT_STAFF"] }, { search: "x".repeat(201) }])("rejects invalid filters %#", async query => {
    expect((await f.agents[3].get("/api/admin/users").query(query)).status).toBe(400);
  });
  it.each([0, 2, -1])("denies all endpoints to non-administrator actor %s", async index => {
    const actor = index < 0 ? request(app) : f.agents[index];
    const expected = index < 0 ? 401 : 403;
    // Target a different fixture user for both authenticated non-Administrator actors.
    for (const [method, path] of [["get", "/api/admin/users"], ["post", "/api/admin/users"], ["patch", `/api/admin/users/${f.users[1].id}`], ["post", `/api/admin/users/${f.users[1].id}/password`]] as const) {
      const result = await actor[method](path).send(input({ requesterId: f.users[3].id, role: "ADMINISTRATOR" }));
      expect(result.status).toBe(expected); expect(result.body.data).toBeUndefined(); expect(result.text).not.toContain(f.users[0].email);
    }
  });
  it("returns safe failures and retries serialization conflicts", async () => {
    // Prisma delegates are proxies; restore the original method explicitly.
    const findMany = prisma.user.findMany;
    prisma.user.findMany = vi.fn().mockRejectedValue(new Error("secret database configuration"));
    try {
      const failed = await f.agents[3].get("/api/admin/users");
      expect(failed.status).toBe(500); expect(failed.text).not.toContain("secret");
    } finally { prisma.user.findMany = findMany; }
    const tx = vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "test" }));
    const changed = await f.agents[3].patch(`/api/admin/users/${f.users[0].id}`).send({ name: "Retried update" });
    expect(changed.status).toBe(200); expect(tx).toHaveBeenCalledTimes(2);
    expect(tx).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it("logout prevents reuse of the Administrator session", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: f.users[3].email, password: f.password });
    const cookie = login.headers["set-cookie"][0].split(";")[0];
    expect((await request(app).get("/api/admin/users").set("Cookie", cookie)).status).toBe(200);
    await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect((await request(app).get("/api/admin/users").set("Cookie", cookie)).status).toBe(401);
  });
});
