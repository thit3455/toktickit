import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("IT Staff queue queries", () => {
  const prisma = getPrisma();
  const stamp = `queue-${Date.now()}`;
  const staff = request.agent(app), requester = request.agent(app), admin = request.agent(app);
  const userIds: number[] = [], ids: number[] = [];
  let categoryId: number, systemId: number;
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("QueueTest123!", 10);
    for (const [index, role] of (["IT_STAFF", "REQUESTER", "ADMINISTRATOR"] as const).entries()) {
      const email = `${stamp}-${index}@example.test`;
      const user = await prisma.user.create({ data: { name: `Queue user ${index}`, email, passwordHash, role, mustChangePassword: false } });
      userIds.push(user.id);
      expect((await [staff, requester, admin][index].post("/api/auth/login").send({ email, password: "QueueTest123!" })).status).toBe(200);
    }
    categoryId = (await prisma.category.create({ data: { name: stamp } })).id;
    systemId = (await prisma.relatedSystem.create({ data: { name: stamp } })).id;
    for (let index = 0; index < 3; index++) {
      ids.push((await prisma.ticket.create({ data: {
        ticketNumber: `${stamp}-ticket-${index}`, summary: `${stamp} ${index === 0 ? "Printer" : "Network"}`, description: "Queue fixture",
        requesterId: userIds[1], assignedStaffId: index === 1 ? userIds[0] : null, categoryId, relatedSystemId: systemId,
        requestedPriority: (["LOW", "HIGH", "MEDIUM"] as const)[index], itPriority: (["URGENT", "LOW", "HIGH"] as const)[index],
        currentStatus: (["OPEN", "IN_PROGRESS", "CLOSED"] as const)[index],
        createdAt: new Date(`2026-01-0${index + 1}T00:00:00Z`), updatedAt: new Date(`2026-02-0${3 - index}T00:00:00Z`),
      } })).id);
    }
  }, 30000);
  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    if (systemId) await prisma.relatedSystem.delete({ where: { id: systemId } });
  });
  const queue = (query = {}) => staff.get("/api/staff/tickets").query({ search: stamp, ...query });
  const ticketIds = (response: { body: { data: { id: number }[] } }) => response.body.data.map(ticket => ticket.id);
  it("loads all statuses with default newest-first order and safe owner fields", async () => {
    const response = await queue();
    expect(response.status).toBe(200);
    expect(ticketIds(response)).toEqual([...ids].reverse());
    expect(response.body.pagination).toMatchObject({ total: 3, page: 1, totalPages: 1 });
    expect(response.body.data[1].assignedStaff).toMatchObject({ id: userIds[0] });
    expect(response.body.data[1].assignedStaff).not.toHaveProperty("passwordHash");
    expect(response.body.data[0].assignedStaff).toBeNull();
    expect(response.body.data[0]).toMatchObject({ itPriority: "HIGH", requestedPriority: "MEDIUM", currentStatus: "CLOSED" });
  });
  it("searches number and summary case-insensitively", async () => {
    expect(ticketIds(await queue({ search: `${stamp.toUpperCase()}-ticket-1` }))).toEqual([ids[1]]);
    expect(ticketIds(await queue({ search: `${stamp.toUpperCase()} PRINTER` }))).toEqual([ids[0]]);
  });
  it.each([
    [{ status: "CLOSED" }, [2]], [{ priority: "HIGH" }, [1]], [{ itPriority: "URGENT" }, [0]],
    [{ assigned: "true" }, [1]], [{ assigned: "false" }, [2, 0]],
    [{ status: "OPEN", priority: "LOW", itPriority: "URGENT", assigned: "false" }, [0]],
  ])("filters actual ticket data with %j", async (filter, indices) => {
    const response = await queue(filter);
    expect(response.status).toBe(200);
    expect(ticketIds(response)).toEqual(indices.map(index => ids[index]));
    expect(response.body.pagination.total).toBe(indices.length);
  });
  it.each([
    ["createdAt", "asc", [0, 1, 2]], ["updatedAt", "desc", [0, 1, 2]],
    ["ticketNumber", "asc", [0, 1, 2]], ["requestedPriority", "desc", [1, 2, 0]],
    ["itPriority", "desc", [0, 2, 1]], ["itPriority", "asc", [1, 2, 0]],
  ])("sorts %s %s", async (sort, order, indices) => {
    expect(ticketIds(await queue({ sort, order }))).toEqual(indices.map(index => ids[index]));
  });
  it("paginates matching results, uses stable ties and clamps stale pages", async () => {
    expect(ticketIds(await queue({ limit: 2, page: 1 }))).toEqual([ids[2], ids[1]]);
    const last = await queue({ limit: 2, page: 2 });
    expect(ticketIds(last)).toEqual([ids[0]]);
    expect(last.body.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    const filtered = await queue({ limit: 2, page: 99, assigned: "true" });
    expect(ticketIds(filtered)).toEqual([ids[1]]);
    expect(filtered.body.pagination.page).toBe(1);
    await prisma.ticket.updateMany({ where: { id: { in: ids } }, data: { updatedAt: new Date("2026-03-01") } });
    expect(ticketIds(await queue({ sort: "updatedAt", limit: 2 }))).toEqual([ids[2], ids[1]]);
  });
  it("returns a safe empty result", async () => {
    const response = await queue({ search: `${stamp}-not-found`, page: 8 });
    expect(response.body).toEqual({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  });
  it.each([{ page: "0" }, { page: "-1" }, { page: "1.5" }, { limit: "101" }, { limit: "NaN" }, { sort: "passwordHash" }, { order: "sideways" }, { status: "FAKE" }, { priority: "URGENT" }, { itPriority: "FAKE" }, { assigned: "yes" }, { search: ["one", "two"] }])("rejects malformed queries %j", async query => {
    expect((await queue(query)).status).toBe(400);
  });
  it("enforces existing staff-only access on the server", async () => {
    expect((await request(app).get("/api/staff/tickets")).status).toBe(401);
    expect((await requester.get("/api/staff/tickets")).status).toBe(403);
    expect((await admin.get("/api/staff/tickets")).status).toBe(403);
  });
  it("returns a safe server failure without database details", async () => {
    const spy = vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("private database error"));
    try {
      const response = await queue();
      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe("Unable to retrieve ticket queue.");
      expect(JSON.stringify(response.body)).not.toContain("private database");
    } finally { spy.mockRestore(); }
  });
});
