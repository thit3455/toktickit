import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { requesterFixture } from "../helpers/requester.js";

describe("Lab 3 Requester authorization and resolution", () => {
  const prisma = getPrisma();
  let f: Awaited<ReturnType<typeof requesterFixture>>;
  let ticketId: number, otherId: number, attachmentId: number;
  beforeAll(async () => {
    f = await requesterFixture();
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const data = { categoryId: category.id, relatedSystemId: system.id, summary: "Requester regression network issue", description: "Cannot connect to the wireless network.", requestedPriority: "HIGH" as const };
    ticketId = (await f.agents[0].post("/api/tickets").send(data)).body.data.id;
    otherId = (await f.agents[1].post("/api/tickets").send(data)).body.data.id;
    const uploaded = await f.agents[0].post(`/api/tickets/${ticketId}/attachments`).attach("file", Buffer.from("pdf test"), { filename: "evidence.pdf", contentType: "application/pdf" });
    expect(uploaded.status).toBe(201); attachmentId = uploaded.body.data.id;
    await prisma.ticketInternalNote.create({ data: { ticketId, userId: f.users[2].id, message: "PRIVATE NOTE CONTENT" } });
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => f?.cleanup());

  it("uses the session for list/detail even when requesterId is forged", async () => {
    const list = await f.agents[0].get("/api/tickets").query({ requesterId: f.users[1].id });
    expect(list.status).toBe(200);
    expect(list.body.data.map((t: { id: number }) => t.id)).toEqual([ticketId]);
    expect((await f.agents[0].get("/api/tickets/my")).body.data).toEqual(list.body.data);
    const detail = await f.agents[0].get(`/api/tickets/${ticketId}`).query({ requesterId: f.users[1].id });
    expect(detail.body.data.requesterId).toBe(f.users[0].id);
    expect(detail.body.data.internalNotes).toBeUndefined();
    const denied = await f.agents[1].get(`/api/tickets/${ticketId}`).query({ requesterId: f.users[0].id });
    const missing = await f.agents[1].get("/api/tickets/2147483647");
    expect(denied.status).toBe(404); expect(denied.body).toEqual(missing.body);
  });
  it("filters all Lab 3 statuses without exposing another owner's tickets", async () => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "IN_PROGRESS" } });
    const result = await f.agents[0].get("/api/tickets").query({ currentStatus: "IN_PROGRESS" });
    expect(result.status).toBe(200);
    expect(result.body.data.map((t: { id: number }) => t.id)).toEqual([ticketId]);
    expect((await f.agents[0].get("/api/tickets").query({ currentStatus: "NOT_A_STATUS" })).status).toBe(400);
  });
  it("protects attachment list/upload/download/removal despite forged identity", async () => {
    expect((await f.agents[0].get(`/api/tickets/${ticketId}/attachments`)).body.data[0].id).toBe(attachmentId);
    expect((await f.agents[0].get(`/api/attachments/${attachmentId}/download`)).status).toBe(200);
    const query = { requesterId: f.users[0].id };
    expect((await f.agents[1].get(`/api/tickets/${ticketId}/attachments`).query(query)).status).toBe(404);
    expect((await f.agents[1].post(`/api/tickets/${ticketId}/attachments`).query(query).attach("file", Buffer.from("pdf"), { filename: "test.pdf", contentType: "application/pdf" })).status).toBe(404);
    const denied = await f.agents[1].get(`/api/attachments/${attachmentId}/download`).query(query);
    const missing = await f.agents[1].get("/api/attachments/2147483647/download");
    expect(denied.status).toBe(404); expect(denied.body).toEqual(missing.body);
    expect((await f.agents[1].delete(`/api/attachments/${attachmentId}`).query(query).send({ removalReason: "forged" })).status).toBe(404);
    expect((await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } })).isRemoved).toBe(false);
  });
  it("creates append-only public comments with backend author and creation time", async () => {
    const start = Date.now();
    const posted = await f.agents[0].post(`/api/tickets/${ticketId}/comments`).send({ message: "  Connection is working again.  ", userId: f.users[1].id, createdAt: "2000-01-01" });
    expect(posted.status).toBe(201);
    expect(posted.body.data).toMatchObject({ userId: f.users[0].id, message: "Connection is working again." });
    expect(Date.parse(posted.body.data.createdAt)).toBeGreaterThanOrEqual(start);
    for (const index of [0, 2, 3]) {
      const list = await f.agents[index].get(`/api/tickets/${ticketId}/comments`);
      expect(list.status).toBe(200);
      expect(list.body.data[0].user.id).toBe(f.users[0].id);
    }
    for (const method of ["patch", "delete"] as const) expect((await f.agents[0][method](`/api/tickets/${ticketId}/comments/${posted.body.data.id}`).send({ message: "edited" })).status).toBe(404);
  });
  it.each(["", "   \n\t", "x".repeat(10001)])("rejects invalid public comment %#", async message => {
    expect((await f.agents[0].post(`/api/tickets/${ticketId}/comments`).send({ message })).status).toBe(400);
  });
  it("accepts the documented comment boundary and denies other owners", async () => {
    expect((await f.agents[0].post(`/api/tickets/${ticketId}/comments`).send({ message: "x".repeat(10000) })).status).toBe(201);
    for (const method of ["get", "post"] as const) {
      const result = await f.agents[1][method](`/api/tickets/${ticketId}/comments`).send({ message: "forged", requesterId: f.users[0].id });
      expect(result.status).toBe(404);
      expect(result.text).not.toContain("Connection");
    }
  });
  it("forbids internal notes identically for existing and missing tickets", async () => {
    for (const method of ["get", "post"] as const) {
      const own = await f.agents[0][method](`/api/tickets/${ticketId}/internal-notes`).send({ message: "forged" });
      const missing = await f.agents[0][method]("/api/tickets/2147483647/internal-notes").send({ message: "forged" });
      expect(own.status).toBe(403); expect(own.body).toEqual(missing.body);
      expect(own.text).not.toContain("PRIVATE");
    }
  });
  it.each(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const)("persists resolution indication without changing %s status", async currentStatus => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus, requesterResolvedAt: null } });
    const path = `/api/tickets/${ticketId}/resolution-indication`;
    const result = await f.agents[0].patch(path).send({ currentStatus: "CLOSED", requesterResolvedAt: "2000-01-01" });
    expect(result.status).toBe(200); expect(result.body.data.currentStatus).toBe(currentStatus);
    expect(result.body.data.requesterResolvedAt).toBeTruthy();
    const saved = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
    expect(saved.currentStatus).toBe(currentStatus);
    expect(saved.requesterResolvedAt?.toISOString()).toBe(result.body.data.requesterResolvedAt);
    expect((await f.agents[0].get(`/api/tickets/${ticketId}`)).body.data.requesterResolvedAt).toBe(result.body.data.requesterResolvedAt);
    const staffDetail = await f.agents[2].get(`/api/staff/tickets/${ticketId}`);
    expect(staffDetail.status).toBe(200);
    expect(staffDetail.body.data).toMatchObject({ id: ticketId, requesterResolvedAt: result.body.data.requesterResolvedAt, currentStatus });
    const otherStaffDetail = await f.agents[2].get(`/api/staff/tickets/${otherId}`);
    expect(otherStaffDetail.status).toBe(200);
    expect(otherStaffDetail.body.data).toMatchObject({ id: otherId, requesterResolvedAt: null });
    expect((await f.agents[0].patch(path)).body.data.requesterResolvedAt).toBe(result.body.data.requesterResolvedAt);
  });
  it("rejects resolution by other owners, other roles and invalid IDs", async () => {
    const before = await prisma.ticket.findUniqueOrThrow({ where: { id: otherId } });
    expect((await f.agents[0].patch(`/api/tickets/${otherId}/resolution-indication`).send({ requesterId: f.users[1].id })).status).toBe(404);
    for (const i of [2, 3]) expect((await f.agents[i].patch(`/api/tickets/${ticketId}/resolution-indication`)).status).toBe(403);
    expect((await f.agents[0].patch("/api/tickets/nope/resolution-indication")).status).toBe(400);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: otherId } })).requesterResolvedAt).toEqual(before.requesterResolvedAt);
  });
  it("rejects unauthenticated protected endpoints and requester staff mutations", async () => {
    for (const path of ["/api/tickets", `/api/tickets/${ticketId}`, `/api/tickets/${ticketId}/attachments`, `/api/attachments/${attachmentId}/download`, `/api/tickets/${ticketId}/comments`, `/api/tickets/${ticketId}/internal-notes`]) expect((await request(app).get(path)).status).toBe(401);
    for (const action of ["assign", "status", "priority"]) expect((await f.agents[0].patch(`/api/staff/tickets/${ticketId}/${action}`).send({ currentStatus: "CLOSED" })).status).toBe(403);
    expect((await f.agents[0].get("/api/staff/tickets")).status).toBe(403);
    expect((await request(app).patch(`/api/tickets/${ticketId}/resolution-indication`)).status).toBe(401);
    for (const i of [2, 3]) expect((await f.agents[i].post("/api/tickets").send({})).status).toBe(403);
  });
  it("returns safe server failure without leaking database details", async () => {
    vi.spyOn(prisma.ticket, "updateMany").mockRejectedValueOnce(new Error("secret database connection"));
    const result = await f.agents[0].patch(`/api/tickets/${ticketId}/resolution-indication`);
    expect(result.status).toBe(500); expect(result.text).not.toContain("secret");
    vi.spyOn(prisma.ticketComment, "findMany").mockRejectedValueOnce(new Error("secret note"));
    const comments = await f.agents[0].get(`/api/tickets/${ticketId}/comments`);
    expect(comments.status).toBe(500); expect(comments.text).not.toContain("secret");
  });
  it("allows staff and administrator public comments without trusting the supplied author", async () => {
    for (const index of [2, 3]) {
      const response = await f.agents[index].post(`/api/tickets/${ticketId}/comments`).send({ message: "Public progress update", userId: f.users[0].id });
      expect(response.status).toBe(201);
      expect(response.body.data.userId).toBe(f.users[index].id);
    }
  });
  it("rejects unauthenticated writes and initial-password access", async () => {
    for (const path of ["/api/tickets", `/api/tickets/${ticketId}/comments`, `/api/tickets/${ticketId}/internal-notes`, `/api/tickets/${ticketId}/attachments`]) expect((await request(app).post(path).send({ message: "forged" })).status).toBe(401);
    expect((await request(app).delete(`/api/attachments/${attachmentId}`).send({ removalReason: "forged" })).status).toBe(401);
    await prisma.user.update({ where: { id: f.users[1].id }, data: { mustChangePassword: true } });
    try {
      expect((await f.agents[1].get("/api/auth/me")).status).toBe(200);
      const denied = await f.agents[1].get("/api/tickets");
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    } finally {
      await prisma.user.update({ where: { id: f.users[1].id }, data: { mustChangePassword: false } });
    }
  });
  it("invalidates the actual session after logout, including replayed cookies", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: f.users[0].email, password: f.password });
    const cookie = login.headers["set-cookie"][0].split(";")[0];
    expect((await request(app).post("/api/auth/logout").set("Cookie", cookie)).status).toBe(200);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
    expect((await request(app).get(`/api/tickets/${ticketId}`).set("Cookie", cookie)).status).toBe(401);
    expect((await request(app).patch(`/api/tickets/${ticketId}/resolution-indication`).set("Cookie", cookie)).status).toBe(401);
  });
});
