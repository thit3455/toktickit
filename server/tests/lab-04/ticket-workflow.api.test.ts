import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, PrismaClient, Ticket, TicketStatus } from "@prisma/client";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { requesterFixture } from "../helpers/requester.js";
import { isolatedLab4Database } from "../helpers/lab4-database.js";
import { appendRevision } from "../../src/actions/actions.service.js";

let isolated: PrismaClient;
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => isolated }));
describe("I4 anonymous transport boundary (no DB)", () => {
  it.each([["get", "/api/tickets/1/status-history"], ["patch", "/api/staff/tickets/1/status"], ["patch", "/api/staff/tickets/1/assign"], ["patch", "/api/staff/tickets/1/priority"]] as const)("%s %s requires authentication before data", async (method, path) => {
    expect((await request(app)[method](path).send({})).status).toBe(401);
  });
});
describe.skipIf(!process.env.LAB4_TEST_DATABASE_URL)("I4 real workflow transactions (AC-01–06, WF-01–07, CON-01)", () => {
  let database: Awaited<ReturnType<typeof isolatedLab4Database>>, f: Awaited<ReturnType<typeof requesterFixture>>;
  let ticket: Ticket, ownerId: number, categoryId: number, systemId: number;
  beforeAll(async () => {
    database = await isolatedLab4Database(); isolated = database.prisma; database.migrate();
    f = await requesterFixture();
    ownerId = (await isolated.user.create({ data: { name: "Independent Ticket owner", email: "i4-owner@example.test", passwordHash: f.users[2].passwordHash, role: "IT_STAFF", isActive: true, mustChangePassword: false } })).id;
    categoryId = (await isolated.category.create({ data: { name: "I4 category" } })).id;
    systemId = (await isolated.relatedSystem.create({ data: { name: "I4 system" } })).id;
  }, 120000);
  async function newTicket(status: TicketStatus = "OPEN") {
    return isolated.ticket.create({ data: { ticketNumber: "WF-" + randomUUID(), requesterId: f.users[0].id, assignedStaffId: ownerId, categoryId, relatedSystemId: systemId, summary: "Synthetic I4 workflow", description: "Owned disposable-schema fixture", requestedPriority: "HIGH", currentStatus: status } });
  }
  beforeEach(async () => { ticket = await newTicket(); });
  afterEach(() => { vi.restoreAllMocks(); });
  afterAll(async () => { await database?.dispose(); }, 30000);
  const status = (input: object, actor = 2) => f.agents[actor].patch(`/api/staff/tickets/${ticket.id}/status`).send(input);
  async function version() { return (await isolated.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version; }
  async function action(state: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED", extra = {}) {
    return isolated.$transaction(async tx => {
      const now = new Date();
      const item = await tx.actionTaken.create({ data: { ticketId: ticket.id, createdById: f.users[2].id, assignedToId: ownerId, description: "Synthetic " + state, status: state,
        ...(state === "COMPLETED" ? { result: "Verified fixture Result", performedById: f.users[2].id, completedAt: now } : {}),
        ...(state === "CANCELLED" ? { cancellationReason: "Earlier synthetic cancellation", cancelledAt: now } : {}), ...extra } });
      await appendRevision(tx, item, f.users[2], "CREATE");
      return item;
    });
  }
  async function snapshot() {
    return {
      ticket: await isolated.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
      actions: await isolated.actionTaken.findMany({ where: { ticketId: ticket.id }, orderBy: { id: "asc" } }),
      revisions: await isolated.actionTakenRevision.findMany({ where: { action: { ticketId: ticket.id } }, orderBy: { id: "asc" } }),
      events: await isolated.ticketStatusEvent.findMany({ where: { ticketId: ticket.id }, orderBy: { id: "asc" } }),
      receipts: await isolated.actionCreateRequest.findMany({ where: { ticketId: ticket.id }, orderBy: { id: "asc" } }),
    };
  }
  const edges: Record<TicketStatus, readonly TicketStatus[]> = {
    NEW: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], CANCELLED: [],
  };
  it.each([2, 3].flatMap(actor => Object.values(TicketStatus).flatMap(from => Object.values(TicketStatus).map(to => [actor, from, to] as const))))("actor %i: %s -> %s exactly matches approved matrix", async (actor, from, to) => {
    await isolated.ticket.update({ where: { id: ticket.id }, data: { currentStatus: from } }); await action("COMPLETED");
    const before = await snapshot();
    const response = await status({ expectedTicketVersion: 0, currentStatus: to, ...(["CANCELLED", "REOPENED"].includes(to) ? { reason: "Reviewed synthetic transition" } : {}) }, actor);
    const allowed = from !== to && edges[from].includes(to);
    expect(response.status).toBe(allowed ? 200 : from === to ? 400 : 409);
    if (!allowed) { expect(response.body.error.code).toBe(from === to ? "NO_CHANGES" : "INVALID_TRANSITION"); expect(await snapshot()).toEqual(before); }
    else {
      expect(response.body.data).toMatchObject({ id: ticket.id, currentStatus: to, version: 1, assignedStaffId: ownerId, summary: before.ticket.summary });
      const events = (await snapshot()).events; expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ fromStatus: from, toStatus: to, actorId: f.users[actor].id, actorRole: actor === 2 ? "IT_STAFF" : "ADMINISTRATOR", reason: ["CANCELLED", "REOPENED"].includes(to) ? "Reviewed synthetic transition" : null });
      expect(events[0].createdAt).toEqual(response.body.data.updatedAt ? new Date(response.body.data.updatedAt) : null);
    }
  });
  it.each([
    ["no actions", "COMPLETED_RESULT_REQUIRED"], ["blank result", "COMPLETED_RESULT_REQUIRED"], ["only cancelled", "COMPLETED_RESULT_REQUIRED"],
    ["planned", "ACTIVE_ACTIONS"], ["in progress", "ACTIVE_ACTIONS"], ["follow-up", "FOLLOW_UP_REQUIRED"],
    ["missing owner", "OWNER_REQUIRED"], ["inactive owner", "OWNER_INACTIVE_OR_NOT_STAFF"], ["Admin owner", "OWNER_INACTIVE_OR_NOT_STAFF"],
  ])("resolution gate rejects %s without partial writes", async (scenario, blocker) => {
    if (scenario === "blank result") await action("COMPLETED", { result: " " });
    else if (scenario === "only cancelled") await action("CANCELLED");
    else if (scenario !== "no actions") await action("COMPLETED", scenario === "follow-up" ? { followUpRequired: true, followUpNote: "Pending test follow-up" } : {});
    if (scenario === "planned") await action("PLANNED");
    if (scenario === "in progress") await action("IN_PROGRESS");
    if (scenario === "missing owner") await isolated.ticket.update({ where: { id: ticket.id }, data: { assignedStaffId: null } });
    if (scenario === "inactive owner" || scenario === "Admin owner") {
      const bad = await isolated.user.create({ data: { name: "Synthetic ineligible owner", email: randomUUID() + "@example.test", role: scenario === "Admin owner" ? "ADMINISTRATOR" : "IT_STAFF", isActive: scenario !== "inactive owner", passwordHash: f.users[2].passwordHash, mustChangePassword: false } });
      await isolated.ticket.update({ where: { id: ticket.id }, data: { assignedStaffId: bad.id } });
    }
    const before = await snapshot();
    const response = await status({ currentStatus: "RESOLVED", expectedTicketVersion: 0 });
    expect(response.status).toBe(409); expect(response.body.error.code).toBe("RESOLUTION_GATE_FAILED");
    const detail = await f.agents[2].get(`/api/staff/tickets/${ticket.id}`);
    expect(detail.body.data.resolutionGate.blockers).toContain(blocker); expect(await snapshot()).toEqual(before);
  });
  it("allows valid resolution and closure, preserving all action evidence", async () => {
    await action("COMPLETED"); await action("CANCELLED", { followUpRequired: true, followUpNote: "Cancelled follow-up is excluded" });
    const before = await snapshot();
    expect((await status({ currentStatus: "RESOLVED", expectedTicketVersion: 0 })).status).toBe(200);
    expect((await status({ currentStatus: "CLOSED", expectedTicketVersion: 1 }, 3)).status).toBe(200);
    const saved = await snapshot(); expect(saved.actions).toEqual(before.actions); expect(saved.revisions).toEqual(before.revisions); expect(saved.events).toHaveLength(2);
  });
  it("rechecks the gate for legacy Resolved -> Closed", async () => {
    await isolated.ticket.update({ where: { id: ticket.id }, data: { currentStatus: "RESOLVED" } });
    expect((await status({ currentStatus: "CLOSED", expectedTicketVersion: 0 })).body.error.code).toBe("RESOLUTION_GATE_FAILED");
  });
  it.each(["empty", "mixed"])("cancels %s work atomically and freezes affected actions", async scenario => {
    const planned = scenario === "mixed" ? await action("PLANNED") : null, progress = scenario === "mixed" ? await action("IN_PROGRESS") : null;
    if (scenario === "mixed") { await action("COMPLETED"); await action("CANCELLED"); }
    const before = await snapshot();
    const response = await status({ currentStatus: "CANCELLED", expectedTicketVersion: 0, reason: "  Synthetic cancellation  " }, 3);
    expect(response.status).toBe(200);
    const after = await snapshot(); expect(after.events[0].reason).toBe("Synthetic cancellation");
    for (const prior of before.actions) {
      const saved = after.actions.find(item => item.id === prior.id)!;
      if (prior.id === planned?.id || prior.id === progress?.id) {
        expect(saved).toMatchObject({ status: "CANCELLED", version: prior.version + 1, cancellationReason: "Synthetic cancellation", createdById: prior.createdById, assignedToId: prior.assignedToId, performedById: null });
        expect(saved.cancelledAt).toEqual(after.events[0].createdAt);
        expect(after.revisions.filter(r => r.actionId === prior.id)).toHaveLength(2);
      } else expect(saved).toEqual(prior);
    }
    const beforeRejected = await snapshot();
    expect((await status({ currentStatus: "REOPENED", expectedTicketVersion: 1, reason: "Cannot restore" })).body.error.code).toBe("INVALID_TRANSITION");
    if (planned) expect((await f.agents[2].patch(`/api/tickets/${ticket.id}/actions-taken/${planned.id}`).send({ expectedVersion: 2, expectedTicketVersion: 1, description: "Forbidden" })).body.error.code).toBe("TICKET_NOT_ACTIVE");
    expect(await snapshot()).toEqual(beforeRejected);
  });
  it.each(["revision", "status event"])("rolls back parent/children/history when %s persistence fails", async failure => {
    await action("PLANNED"); await action("IN_PROGRESS"); await action("COMPLETED");
    const before = await snapshot(), original = isolated.$transaction.bind(isolated);
    vi.spyOn(isolated, "$transaction").mockImplementationOnce(((work: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => original(async tx => {
      if (failure === "revision") vi.spyOn(tx.actionTakenRevision, "create").mockRejectedValueOnce(new Error("private revision failure"));
      else vi.spyOn(tx.ticketStatusEvent, "create").mockRejectedValueOnce(new Error("private event failure"));
      return work(tx);
    }, options)) as typeof isolated.$transaction);
    const response = await status({ currentStatus: "CANCELLED", expectedTicketVersion: 0, reason: "Rollback verification" });
    expect(response.status).toBe(500); expect(response.text).not.toMatch(/private|Prisma|SQL|stack/); expect(await snapshot()).toEqual(before);
  });
  it.each([
    [{ expectedTicketVersion: -1, currentStatus: "OPEN" }, 400, "VALIDATION_ERROR"],
    [{ expectedTicketVersion: 0, currentStatus: "FAKE" }, 400, "VALIDATION_ERROR"],
    [{ expectedTicketVersion: 0, currentStatus: "REOPENED" }, 409, "INVALID_TRANSITION"],
    [{ expectedTicketVersion: 0, currentStatus: "CANCELLED" }, 400, "VALIDATION_ERROR"],
    [{ expectedTicketVersion: 0, currentStatus: "OPEN" }, 400, "NO_CHANGES"],
    [{ expectedTicketVersion: 1, currentStatus: "OPEN" }, 409, "STALE_UPDATE"],
    [{ expectedTicketVersion: 1, currentStatus: "REOPENED" }, 409, "STALE_UPDATE"],
    [{ expectedTicketVersion: 1, currentStatus: "RESOLVED" }, 409, "STALE_UPDATE"],
    [{ expectedTicketVersion: 0, currentStatus: "IN_PROGRESS", reason: "Not applicable" }, 400, "VALIDATION_ERROR"],
    [{ expectedTicketVersion: 0, currentStatus: "RESOLVED", resolution: "invented" }, 400, "INVALID_INPUT"],
  ])("enforces deterministic error precedence %#", async (body, expectedStatus, code) => {
    const before = await snapshot(), response = await status(body);
    expect(response.status).toBe(expectedStatus); expect(response.body.error.code).toBe(code); expect(await snapshot()).toEqual(before);
  });
  it.each(Object.values(TicketStatus))("advisory indication on %s is owned/idempotent and advances version once", async currentStatus => {
    await isolated.ticket.update({ where: { id: ticket.id }, data: { currentStatus } });
    const path = `/api/tickets/${ticket.id}/resolution-indication`;
    expect((await f.agents[1].patch(path).send({})).status).toBe(404);
    expect((await f.agents[2].patch(path).send({})).status).toBe(403);
    const first = await f.agents[0].patch(path).send({ currentStatus: "RESOLVED", requesterResolvedAt: "forged" }), second = await f.agents[0].patch(path).send({});
    expect(first.status).toBe(200); expect(first.body.data).toMatchObject({ currentStatus, version: 1 });
    expect(second.body).toEqual(first.body); expect((await snapshot()).events).toHaveLength(0);
  });
  it("reopening preserves completed evidence, follow-up and historical requester indication", async () => {
    await f.agents[0].patch(`/api/tickets/${ticket.id}/resolution-indication`).send({});
    await action("COMPLETED", { followUpRequired: true, followUpNote: "Retained review requirement" });
    await isolated.ticket.update({ where: { id: ticket.id }, data: { currentStatus: "RESOLVED" } });
    const before = await snapshot();
    expect((await status({ currentStatus: "REOPENED", expectedTicketVersion: 1, reason: "Issue returned" })).status).toBe(200);
    const after = await snapshot(); expect(after.actions).toEqual(before.actions); expect(after.revisions).toEqual(before.revisions);
    expect(after.ticket.requesterResolvedAt).toEqual(before.ticket.requesterResolvedAt); expect(after.events[0]).toMatchObject({ fromStatus: "RESOLVED", toStatus: "REOPENED", reason: "Issue returned" });
  });
  it.each([2, 3])("actor %i can assign/priority with a current version, including terminal Tickets", async actor => {
    for (const currentStatus of ["OPEN", "RESOLVED", "CLOSED", "CANCELLED"] as const) {
      await isolated.ticket.update({ where: { id: ticket.id }, data: { currentStatus } });
      const v = await version();
      const assigned = await f.agents[actor].patch(`/api/staff/tickets/${ticket.id}/assign`).send({ expectedTicketVersion: v, assignedStaffId: f.users[2].id });
      expect(assigned.status).toBe(200);
      const priority = await f.agents[actor].patch(`/api/staff/tickets/${ticket.id}/priority`).send({ expectedTicketVersion: v + 1, itPriority: "URGENT" });
      expect(priority.status).toBe(200);
      const before = await snapshot();
      expect((await f.agents[actor].patch(`/api/staff/tickets/${ticket.id}/priority`).send({ expectedTicketVersion: v + 1, itPriority: "HIGH" })).body.error.code).toBe("STALE_UPDATE");
      expect(await snapshot()).toEqual(before); expect(before.events).toHaveLength(0);
      await isolated.ticket.update({ where: { id: ticket.id }, data: { assignedStaffId: ownerId, itPriority: "MEDIUM" } });
    }
  });
  it("requires versions, prevents Admin implicit claims/ownership and preserves claim conflicts", async () => {
    for (const kind of ["assign", "priority", "status"]) expect((await f.agents[3].patch(`/api/staff/tickets/${ticket.id}/${kind}`).send({})).status).toBe(400);
    expect((await f.agents[3].patch(`/api/staff/tickets/${ticket.id}/assign`).send({ expectedTicketVersion: 0 })).status).toBe(400);
    expect((await f.agents[3].patch(`/api/staff/tickets/${ticket.id}/assign`).send({ expectedTicketVersion: 0, assignedStaffId: f.users[3].id })).status).toBe(400);
    expect((await f.agents[2].patch(`/api/staff/tickets/${ticket.id}/assign`).send({ expectedTicketVersion: 0 })).body.error.code).toBe("TICKET_ALREADY_ASSIGNED");
    await isolated.ticket.update({ where: { id: ticket.id }, data: { assignedStaffId: null } });
    expect((await f.agents[2].patch(`/api/staff/tickets/${ticket.id}/assign`).send({ expectedTicketVersion: 0 })).status).toBe(200);
    expect((await f.agents[2].patch(`/api/staff/tickets/${ticket.id}/assign`).send({ expectedTicketVersion: 1, assignedStaffId: f.users[2].id })).body.error.code).toBe("NO_CHANGES");
  });
  it.each([0, 1])("Requester %i cannot mutate Tickets or read private history", async actor => {
    const before = await snapshot();
    for (const kind of ["assign", "priority", "status"]) expect((await f.agents[actor].patch(`/api/staff/tickets/${ticket.id}/${kind}`).send({ expectedTicketVersion: 0, currentStatus: "CANCELLED", reason: "Forbidden" })).status).toBe(403);
    expect((await f.agents[actor].get(`/api/tickets/${ticket.id}/status-history`)).status).toBe(403);
    const detail = await f.agents[actor].get(`/api/tickets/${ticket.id}`); expect(detail.status).toBe(actor === 0 ? 200 : 404);
    expect(detail.body.data?.resolutionGate).toBeUndefined(); expect(detail.body.data?.allowedTicketTransitions).toBeUndefined();
    expect(await snapshot()).toEqual(before);
  });
  it("status history is ordered, immutable, attributed and credential-free", async () => {
    await status({ currentStatus: "IN_PROGRESS", expectedTicketVersion: 0 });
    await status({ currentStatus: "WAITING_FOR_REQUESTER", expectedTicketVersion: 1 }, 3);
    const events = (await snapshot()).events, tied = new Date("2026-10-01T00:00:00Z");
    await isolated.ticketStatusEvent.updateMany({ where: { ticketId: ticket.id }, data: { createdAt: tied } });
    const response = await f.agents[3].get(`/api/tickets/${ticket.id}/status-history?limit=1&page=2`);
    expect(response.status).toBe(200); expect(response.body.data.items[0].id).toBe(events[1].id); expect(response.body.data.pagination.total).toBe(2);
    expect(response.body.data.items[0].actor).toEqual({ id: f.users[3].id, name: f.users[3].name, role: "ADMINISTRATOR" });
    expect(response.text).not.toMatch(/passwordHash|sessionId|internalNotes|content/);
    await isolated.user.update({ where: { id: f.users[2].id }, data: { name: "Renamed former Staff actor", role: "REQUESTER" } });
    try {
      const first = await f.agents[3].get(`/api/tickets/${ticket.id}/status-history?limit=1&page=1`);
      expect(first.status).toBe(200);
      expect(first.body.data.items[0].actor).toEqual({ id: f.users[2].id, name: f.users[2].name, role: "IT_STAFF" });
    } finally {
      await isolated.user.update({ where: { id: f.users[2].id }, data: { name: f.users[2].name, role: "IT_STAFF" } });
    }

    const before = await snapshot();
    expect((await f.agents[2].patch(`/api/tickets/${ticket.id}/status-history`).send({ reason: "No edit endpoint" })).status).toBe(404);
    expect((await f.agents[2].delete(`/api/tickets/${ticket.id}/status-history`)).status).toBe(404);
    expect(await snapshot()).toEqual(before);
  });
  it("two status editors cannot silently overwrite", async () => {
    const responses = await Promise.all([status({ currentStatus: "IN_PROGRESS", expectedTicketVersion: 0 }), status({ currentStatus: "WAITING_FOR_REQUESTER", expectedTicketVersion: 0 }, 3)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect(responses.find(r => r.status === 409)!.body.error.code).toMatch(/STALE_UPDATE|CONCURRENT_UPDATE/);
    const after = await snapshot(); expect(after.ticket.version).toBe(1); expect(after.events).toHaveLength(1);
  });
  it("action creation racing resolution cannot pass the gate with outstanding work", async () => {
    await action("COMPLETED");
    const responses = await Promise.all([status({ currentStatus: "RESOLVED", expectedTicketVersion: 0 }), f.agents[2].post(`/api/tickets/${ticket.id}/actions-taken`).send({ expectedTicketVersion: 0, requestId: randomUUID(), assignedToId: ownerId, description: "Racing new work" })]);
    expect(responses.filter(r => r.status >= 200 && r.status < 300)).toHaveLength(1);
    const after = await snapshot(); expect(after.ticket.version).toBe(1);
    if (after.ticket.currentStatus === "RESOLVED") expect(after.actions.some(a => a.status === "PLANNED")).toBe(false);
    else expect((await status({ currentStatus: "RESOLVED", expectedTicketVersion: 1 })).body.error.code).toBe("RESOLUTION_GATE_FAILED");
  });
  it("action completion racing Ticket cancellation has one coherent commit", async () => {
    const planned = await action("PLANNED");
    const responses = await Promise.all([status({ currentStatus: "CANCELLED", expectedTicketVersion: 0, reason: "Concurrent cancellation" }), f.agents[2].patch(`/api/tickets/${ticket.id}/actions-taken/${planned.id}`).send({ expectedTicketVersion: 0, expectedVersion: 1, status: "COMPLETED", result: "Concurrent completion" })]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    const after = await snapshot(); expect(after.ticket.version).toBe(1); expect(after.revisions).toHaveLength(2);
    expect(after.actions[0].status).toBe(after.ticket.currentStatus === "CANCELLED" ? "CANCELLED" : "COMPLETED");
  });
  it.each(["deactivation", "role change"])("owner %s racing resolution has a coherent serial outcome", async change => {
    await action("COMPLETED");
    try {
      const [resolution, account] = await Promise.all([
        status({ currentStatus: "RESOLVED", expectedTicketVersion: 0 }),
        f.agents[3].patch(`/api/admin/users/${ownerId}`).send(change === "deactivation" ? { isActive: false } : { role: "REQUESTER" }),
      ]);
      expect(account.status).toBe(200);
      expect([200, 409]).toContain(resolution.status);
      const after = await snapshot();
      if (resolution.status === 200) {
        expect(after.ticket.currentStatus).toBe("RESOLVED"); expect(after.events).toHaveLength(1);
        expect((await status({ currentStatus: "CLOSED", expectedTicketVersion: 1 })).body.error.code).toBe("RESOLUTION_GATE_FAILED");
      } else { expect(after.ticket.currentStatus).toBe("OPEN"); expect(after.ticket.version).toBe(0); expect(after.events).toHaveLength(0); }
      const current = await f.agents[3].get(`/api/tickets/${ticket.id}`);
      expect(current.body.data.resolutionGate.blockers).toContain("OWNER_INACTIVE_OR_NOT_STAFF");
    } finally {
      await isolated.user.update({ where: { id: ownerId }, data: { isActive: true, role: "IT_STAFF" } });
    }
  });

  it("serialization exhaustion retries at most twice without refreshing client expectations", async () => {
    const before = await snapshot();
    const spy = vi.spyOn(isolated, "$transaction").mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Synthetic serialization failure", { code: "P2034", clientVersion: "5.22.0" }));
    const response = await status({ currentStatus: "IN_PROGRESS", expectedTicketVersion: 0 });
    expect(response.status).toBe(409); expect(response.body.error.code).toBe("CONCURRENT_UPDATE"); expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore(); expect(await snapshot()).toEqual(before);
  });
});
