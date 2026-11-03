import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
const db = vi.hoisted(() => ({
  session: { findUnique: vi.fn(), delete: vi.fn() }, user: { findUnique: vi.fn(), findFirst: vi.fn() },
  ticket: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() }, actionTaken: { count: vi.fn(), findMany: vi.fn() }, $transaction: vi.fn(),
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => db }));
import { app } from "../../src/app.js";
const instant = "2026-10-27T05:00:00.000Z", fixed = new Date(instant);
function role(role = "REQUESTER", changes = {}) {
  const user = { id: 7, name: "Dashboard actor", role, isActive: true, mustChangePassword: false, ...changes };
  db.session.findUnique.mockResolvedValue({ sessionId: "dashboard-unit", expiresAt: new Date("2099-01-01"), user });
  db.user.findUnique.mockResolvedValue(user); db.user.findFirst.mockResolvedValue({ id: 7 }); return user;
}
const get = (path: string) => request(app).get(path).set("Cookie", "toktickit_session=dashboard-unit");
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(fixed); role();
  db.$transaction.mockImplementation(async work => work(db));
  db.ticket.count.mockResolvedValue(6); db.ticket.findMany.mockResolvedValue([]); db.ticket.groupBy.mockResolvedValue([{ itPriority: "LOW", _count: { _all: 1 } }, { itPriority: "URGENT", _count: { _all: 2 } }]);
  db.actionTaken.count.mockResolvedValue(12); db.actionTaken.findMany.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());
describe("I5 real routes and authentication with mocked database delegates", () => {
  it("returns owned full counts and bounded summaries using one RepeatableRead snapshot", async () => {
    const response = await get("/api/requester/dashboard"); expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ asOf: instant, timeZone: "Asia/Bangkok", metrics: { myOpenTickets: 6, needsMyAttention: 6, recentlyResolved: 6 }, recentTickets: [], attentionTickets: [] });
    for (const [query] of db.ticket.count.mock.calls) expect(query.where).toMatchObject({ requesterId: 7, createdAt: { lte: fixed }, updatedAt: { lte: fixed } });
    for (const [query] of db.ticket.findMany.mock.calls) expect(query).toMatchObject({ where: { requesterId: 7 }, take: 5, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|sessionId|internalNotes|attachment/);
  });
  it("does not recalculate asOf when the clock advances between queries", async () => {
    db.user.findUnique.mockImplementation(async () => { vi.setSystemTime(new Date("2026-10-28T08:00:00.000Z")); return { id: 7, role: "REQUESTER", isActive: true, mustChangePassword: false }; });
    const { body } = await get("/api/requester/dashboard"); expect(body.data.asOf).toBe(instant); expect(body.data.window.end).toBe(instant);
    for (const value of Object.values(body.data.drillDown) as { query: { asOf: string } }[]) expect(value.query.asOf).toBe(instant);
    for (const [query] of db.ticket.count.mock.calls) expect(query.where.updatedAt.lte).toEqual(fixed);
  });
  it.each(["IT_STAFF", "ADMINISTRATOR"])("returns operational data and literal assignee counts for %s", async actor => {
    role(actor); const response = await get("/api/staff/dashboard"); expect(response.status).toBe(200);
    expect(response.body.data.metrics).toEqual({ unassignedActiveTickets: 6, myActiveTickets: 6, myActiveActions: 12, activeTicketsByItPriority: { LOW: 1, MEDIUM: 0, HIGH: 0, URGENT: 2 } });
    expect(db.actionTaken.count).toHaveBeenCalledWith({ where: expect.objectContaining({ assignedToId: 7, status: { in: ["PLANNED", "IN_PROGRESS"] }, ticket: { createdAt: { lte: fixed }, updatedAt: { lte: fixed } }, createdAt: { lte: fixed }, updatedAt: { lte: fixed } }) });
    expect(db.actionTaken.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    expect(response.body.data.drillDown.activeTicketsByItPriority.URGENT.query).toMatchObject({ asOf: instant, itPriority: "URGENT" });
  });
  it.each(["requesterId=99", "asOf=2026-10-27T05%3A00%3A00.000Z", "timeZone=UTC", "anything=1"])("rejects requester dashboard query %s before reading metrics", async query => {
    const response = await get("/api/requester/dashboard?" + query); expect(response.status).toBe(400); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each(["userId=99", "window=1"])("rejects operational dashboard query %s", async query => {
    role("IT_STAFF"); expect((await get("/api/staff/dashboard?" + query)).status).toBe(400); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each([["REQUESTER", "/api/staff/dashboard"], ["IT_STAFF", "/api/requester/dashboard"], ["ADMINISTRATOR", "/api/requester/dashboard"]])("denies %s on %s", async (actor, path) => {
    role(actor); expect((await get(path)).status).toBe(403); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each(["/api/requester/dashboard", "/api/staff/dashboard"])("denies anonymous %s without reading metrics", async path => {
    expect((await request(app).get(path)).status).toBe(401); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each([[{ isActive: false }, "ACCOUNT_INACTIVE"], [{ mustChangePassword: true }, "PASSWORD_CHANGE_REQUIRED"]])("preserves account gates %#", async (changes, code) => {
    role("REQUESTER", changes); const response = await get("/api/requester/dashboard"); expect(response.status).toBe(403); expect(response.body.error.code).toBe(code); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("revalidates role inside the snapshot", async () => {
    db.user.findUnique.mockResolvedValue({ id: 7, role: "IT_STAFF", isActive: true, mustChangePassword: false });
    expect((await get("/api/requester/dashboard")).status).toBe(403); expect(db.ticket.count).not.toHaveBeenCalled();
  });
  it("returns safe failure without database details", async () => {
    db.ticket.count.mockRejectedValue(new Error("private database detail"));
    const response = await get("/api/requester/dashboard"); expect(response.status).toBe(500); expect(response.body).toEqual({ error: { code: "SERVER_ERROR", message: "Unable to load the dashboard. Please try again." } });
  });
  it("keeps owner=me narrower than assigned=true in the queue", async () => {
    role("IT_STAFF"); expect((await get("/api/staff/tickets?owner=me&assigned=true&asOf=" + instant)).status).toBe(200);
    expect(db.ticket.count).toHaveBeenCalledWith({ where: expect.objectContaining({ assignedStaffId: 7, updatedAt: { lte: fixed } }) });
  });
});
