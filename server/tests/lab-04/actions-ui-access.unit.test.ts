import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Exercise real authentication/role middleware and routes without a DB client.
const db = vi.hoisted(() => ({
  session: { findUnique: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(),
  ticket: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => db }));
import { app } from "../../src/app.js";

const session = (role = "ADMINISTRATOR", changes = {}) => ({ sessionId: "ui-access", expiresAt: new Date("2099-01-01"),
  user: { id: 9, name: "Operator", role, isActive: true, mustChangePassword: false, ...changes } });
const authenticated = (method: "get" | "patch", path: string) => request(app)[method](path).set("Cookie", "toktickit_session=ui-access");
beforeEach(() => {
  vi.resetAllMocks();
  db.session.findUnique.mockResolvedValue(session());
  db.ticket.count.mockResolvedValue(1);
  db.ticket.findMany.mockResolvedValue([{ id: 5, ticketNumber: "UI-5", assignedStaff: null }]);
  db.$transaction.mockImplementation(async work => work(db));
});
describe("I3 Administrator queue read prerequisite (no database)", () => {
  it.each(["ADMINISTRATOR", "IT_STAFF"])("allows authenticated %s queue reads", async role => {
    db.session.findUnique.mockResolvedValue(session(role));
    const response = await authenticated("get", "/api/staff/tickets?search=UI&limit=10");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [{ id: 5, ticketNumber: "UI-5", assignedStaff: null }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    expect(db.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }));
  });
  it("rejects anonymous queue reads before accessing data", async () => {
    expect((await request(app).get("/api/staff/tickets")).status).toBe(401);
    expect(db.session.findUnique).not.toHaveBeenCalled(); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each([
    [session("REQUESTER"), 403, "FORBIDDEN"],
    [session("ADMINISTRATOR", { isActive: false }), 403, "ACCOUNT_INACTIVE"],
    [session("ADMINISTRATOR", { mustChangePassword: true }), 403, "PASSWORD_CHANGE_REQUIRED"],
    [null, 401, "INVALID_SESSION"],
  ])("retains account/session restrictions %#", async (value, status, code) => {
    db.session.findUnique.mockResolvedValue(value);
    const response = await authenticated("get", "/api/staff/tickets");
    expect(response.status).toBe(status); expect(response.body.error.code).toBe(code);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("rejects expired sessions", async () => {
    db.session.findUnique.mockResolvedValue({ ...session(), expiresAt: new Date("2000-01-01") });
    const response = await authenticated("get", "/api/staff/tickets");
    expect(response.status).toBe(401); expect(response.body.error.code).toBe("SESSION_EXPIRED");
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each(["assign", "priority", "status"])("does not authorize Administrator Ticket %s writes", async operation => {
    const response = await authenticated("patch", `/api/staff/tickets/5/${operation}`).send({ assignedStaffId: 9, itPriority: "HIGH", currentStatus: "OPEN" });
    expect(response.status).toBe(403); expect(response.body.error.code).toBe("FORBIDDEN");
    expect(db.ticket.update).not.toHaveBeenCalled(); expect(db.ticket.updateMany).not.toHaveBeenCalled(); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("keeps the staff-specific detail route restricted to IT Staff", async () => {
    expect((await authenticated("get", "/api/staff/tickets/5")).status).toBe(403);
    expect(db.ticket.findUnique).not.toHaveBeenCalled();
  });
});
