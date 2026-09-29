import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("IT Staff authenticated workflow", () => {
  const prisma = getPrisma();
  const stamp = `staff-test-${Date.now()}`;
  const agents = [request.agent(app), request.agent(app), request.agent(app), request.agent(app)];
  const userIds: number[] = [];
  const administrator = request.agent(app);
  let inactiveId: number;
  let ticketId: number, categoryId: number, systemId: number, attachmentId: number;
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("StaffTest123!", 10);
    for (let i = 0; i < agents.length; i++) {
      const email = `${stamp}-${i}@example.test`;
      const user = await prisma.user.create({ data: { name: `Test user ${i}`, email, passwordHash, role: i < 2 ? "IT_STAFF" : "REQUESTER", mustChangePassword: false } });
      userIds.push(user.id);
      const login = await agents[i].post("/api/auth/login").send({ email, password: "StaffTest123!" });
      expect(login.status).toBe(200);
      expect(login.body.data.user.id).toBe(user.id);
    }
    const inactive = await prisma.user.create({ data: { name: "Inactive staff fixture", email: `${stamp}-inactive@example.test`, passwordHash, role: "IT_STAFF", isActive: false } });
    inactiveId = inactive.id;
    userIds.push(inactive.id);
    const adminEmail = `${stamp}-admin@example.test`;
    userIds.push((await prisma.user.create({ data: { name: "Admin fixture", email: adminEmail, passwordHash, role: "ADMINISTRATOR", mustChangePassword: false } })).id);
    expect((await administrator.post("/api/auth/login").send({ email: adminEmail, password: "StaffTest123!" })).status).toBe(200);
    categoryId = (await prisma.category.create({ data: { name: stamp } })).id;
    systemId = (await prisma.relatedSystem.create({ data: { name: stamp } })).id;
    ticketId = (await prisma.ticket.create({ data: { ticketNumber: stamp, requesterId: userIds[2], categoryId, relatedSystemId: systemId, summary: "Staff workflow test", description: "Isolated fixture", requestedPriority: "LOW" } })).id;
  }, 30000);
  afterAll(async () => {
    if (ticketId) await prisma.ticket.delete({ where: { id: ticketId } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    if (systemId) await prisma.relatedSystem.delete({ where: { id: systemId } });
  });
  for (const index of [0, 1]) {
    it(`staff account ${index + 1} can view queue/detail, claim, update priority and status`, async () => {
      await prisma.ticket.update({ where: { id: ticketId }, data: { assignedStaffId: null } });
      expect((await agents[index].get("/api/staff/tickets")).status).toBe(200);
      expect((await agents[index].get(`/api/staff/tickets/${ticketId}`)).status).toBe(200);
      const claim = await agents[index].patch(`/api/staff/tickets/${ticketId}/assign`);
      expect(claim.status).toBe(200);
      expect(claim.body.data.assignedStaffId).toBe(userIds[index]);
      for (const itPriority of ["LOW", "MEDIUM", "HIGH", "URGENT"]) {
        expect((await agents[index].patch(`/api/staff/tickets/${ticketId}/priority`).send({ itPriority })).status).toBe(200);
        expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).itPriority).toBe(itPriority);
      }
      for (const currentStatus of ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED"]) {
        expect((await agents[index].patch(`/api/staff/tickets/${ticketId}/status`).send({ currentStatus })).status).toBe(200);
        expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).currentStatus).toBe(currentStatus);
      }
    });
  }
  it("includes closed tickets in the default queue and allows opening them", async () => {
    const queue = await agents[0].get("/api/staff/tickets").query({ search: stamp });
    expect(queue.status).toBe(200);
    expect(queue.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: ticketId, currentStatus: "CLOSED" })]));
    expect((await agents[0].get(`/api/staff/tickets/${ticketId}`)).status).toBe(200);
  });
  it("reopens a closed ticket and persists its reopened status", async () => {
    const response = await agents[0].patch(`/api/staff/tickets/${ticketId}/status`).send({ currentStatus: "REOPENED" });
    expect(response.status).toBe(200);
    expect(response.body.data.currentStatus).toBe("REOPENED");
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).currentStatus).toBe("REOPENED");
  });
  it("lists only active IT Staff and excludes account secrets", async () => {
    const response = await agents[0].get("/api/staff/users");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: userIds[0] }), expect.objectContaining({ id: userIds[1] })]));
    expect(response.body.data.some((user: { id: number }) => user.id === inactiveId || user.id === userIds[2] || user.id === userIds[5])).toBe(false);
    for (const user of response.body.data) expect(Object.keys(user).sort()).toEqual(["email", "id", "name"]);
  });
  it("persists reassignment and returns the new owner in fresh detail and queue requests", async () => {
    const response = await agents[1].patch(`/api/staff/tickets/${ticketId}/assign`).send({ assignedStaffId: userIds[0] });
    expect(response.status).toBe(200);
    expect(response.body.data.assignedStaff.id).toBe(userIds[0]);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).assignedStaffId).toBe(userIds[0]);
    const detail = await agents[0].get(`/api/staff/tickets/${ticketId}`);
    expect(detail.body.data.assignedStaff.id).toBe(userIds[0]);
    const queue = await agents[1].get("/api/staff/tickets").query({ search: stamp });
    expect(queue.body.data[0].assignedStaff.id).toBe(userIds[0]);
  });
  it("does not let Claim overwrite another owner", async () => {
    expect((await agents[1].patch(`/api/staff/tickets/${ticketId}/assign`)).status).toBe(409);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).assignedStaffId).toBe(userIds[0]);
  });
  it.each([null, "1", -1, 0, 1.5, 2147483647])("rejects invalid reassignment ID %s", async assignedStaffId => {
    const response = await agents[0].patch(`/api/staff/tickets/${ticketId}/assign`).send({ assignedStaffId });
    expect(response.status).toBe(400);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).assignedStaffId).toBe(userIds[0]);
  });
  it("rejects inactive staff and nonstaff owners", async () => {
    for (const assignedStaffId of [inactiveId, userIds[2], userIds[5]]) {
      expect((await agents[0].patch(`/api/staff/tickets/${ticketId}/assign`).send({ assignedStaffId })).status).toBe(400);
    }
  });
  it("protects staff-list and reassignment APIs against unauthenticated and other roles", async () => {
    expect((await request(app).get("/api/staff/users")).status).toBe(401);
    expect((await request(app).patch(`/api/staff/tickets/${ticketId}/assign`).send({ assignedStaffId: userIds[0] })).status).toBe(401);
    for (const agent of [agents[2], administrator]) {
      expect((await agent.get("/api/staff/users")).status).toBe(403);
      expect((await agent.patch(`/api/staff/tickets/${ticketId}/assign`).send({ assignedStaffId: userIds[0] })).status).toBe(403);
    }
  });
  it("rejects unauthenticated and requester staff actions", async () => {
    expect((await request(app).get("/api/staff/tickets")).status).toBe(401);
    expect((await agents[2].get("/api/staff/tickets")).status).toBe(403);
    expect((await agents[2].get(`/api/staff/tickets/${ticketId}`)).status).toBe(403);
    for (const action of ["assign", "priority", "status"]) {
      expect((await agents[2].patch(`/api/staff/tickets/${ticketId}/${action}`).send({ itPriority: "HIGH", currentStatus: "CLOSED" })).status).toBe(403);
    }
  });
  it("rejects invalid actions and missing tickets", async () => {
    for (const action of ["priority", "status"]) {
      expect((await agents[0].patch(`/api/staff/tickets/${ticketId}/${action}`).send({ itPriority: "INVALID", currentStatus: "INVALID" })).status).toBe(400);
      expect((await agents[0].patch(`/api/staff/tickets/invalid/${action}`).send({})).status).toBe(400);
    }
    expect((await agents[0].patch("/api/staff/tickets/2147483647/assign")).status).toBe(404);
  });
  it("shares public comments with the owner but protects other requesters", async () => {
    expect((await agents[0].post(`/api/tickets/${ticketId}/comments`).send({ message: "Public update" })).status).toBe(201);
    const result = await agents[2].get(`/api/tickets/${ticketId}/comments`);
    expect(result.status).toBe(200);
    expect(result.body.data[0].message).toBe("Public update");
    expect((await agents[3].get(`/api/tickets/${ticketId}/comments`)).status).toBe(404);
    expect((await agents[3].post(`/api/tickets/${ticketId}/comments`).send({ message: "Denied" })).status).toBe(404);
  });
  it("shares internal notes with another staff member only", async () => {
    expect((await agents[0].post(`/api/tickets/${ticketId}/internal-notes`).send({ message: "Private diagnosis" })).status).toBe(201);
    const result = await agents[1].get(`/api/tickets/${ticketId}/internal-notes`);
    expect(result.status).toBe(200);
    expect(result.body.data[0].message).toBe("Private diagnosis");
    expect((await agents[2].get(`/api/tickets/${ticketId}/internal-notes`)).status).toBe(403);
    expect((await agents[2].post(`/api/tickets/${ticketId}/internal-notes`).send({ message: "Denied" })).status).toBe(403);
    expect((await agents[0].post(`/api/tickets/${ticketId}/internal-notes`).send({ message: "  " })).status).toBe(400);
  });
  it("staff can upload, list and download attachments; outsiders cannot", async () => {
    const uploaded = await agents[0].post(`/api/tickets/${ticketId}/attachments`).attach("file", Buffer.from("%PDF-test"), { filename: "evidence.pdf", contentType: "application/pdf" });
    expect(uploaded.status).toBe(201);
    attachmentId = uploaded.body.data.id;
    const listed = await agents[1].get(`/api/tickets/${ticketId}/attachments`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((a: { id: number }) => a.id === attachmentId)).toBe(true);
    const download = await agents[1].get(`/api/attachments/${attachmentId}/download`);
    expect(download.status).toBe(200);
    expect(download.body.toString()).toBe("%PDF-test");
    expect((await agents[3].get(`/api/attachments/${attachmentId}/download`)).status).toBe(404);
    expect((await request(app).delete(`/api/attachments/${attachmentId}`).query({ requesterId: userIds[2] }).send({ removalReason: "spoofed" })).status).toBe(401);
  });
});
