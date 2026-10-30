import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, PrismaClient, Ticket } from "@prisma/client";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { requesterFixture } from "../helpers/requester.js";
import { isolatedLab4Database } from "../helpers/lab4-database.js";

let isolated: PrismaClient;
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => isolated }));

describe("Actions Taken transport/authentication without a database", () => {
  it.each([
    ["get", "/api/tickets/1/actions-taken"], ["post", "/api/tickets/1/actions-taken"],
    ["patch", "/api/tickets/1/actions-taken/1"], ["get", "/api/tickets/1/actions-taken/1/history"],
  ] as const)("%s %s rejects missing session before accessing data", async (method, path) => {
    const response = await request(app)[method](path).send({});
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
  });
  for (const [method, path] of [
    ["post", "/api/tickets/1/actions-taken"], ["patch", "/api/tickets/1/actions-taken/1"],
    ["post", "/api/auth/login"], ["post", "/api/tickets"],
    ["post", "/API/auth/LOGIN"],
  ] as const) {
    it.each([
      { name: "malformed JSON", body: '{"description":', headers: {}, status: 400, message: "Supply valid JSON." },
      { name: "oversized JSON", body: JSON.stringify({ description: "x".repeat(102401) }), headers: {}, status: 413, message: "JSON request body is too large." },
      { name: "unsupported charset", body: '{}', headers: { "Content-Type": "application/json; charset=iso-8859-1" }, status: 415, message: "JSON request encoding is not supported." },
      { name: "unsupported content encoding", body: '{}', headers: { "Content-Encoding": "unsupported-example" }, status: 415, message: "JSON request encoding is not supported." },
      { name: "invalid compressed JSON", body: 'not-gzip-data', headers: { "Content-Encoding": "gzip" }, status: 400, message: "Unable to read JSON request body." },
    ])(`${method} ${path}: returns safe JSON for $name`, async ({ body, headers, status, message }) => {
      const response = await request(app)[method](path).set("Content-Type", "application/json").set(headers).send(body);
      expect(response.status).toBe(status);
      expect(response.headers["content-type"]).toMatch(/^application\/json/);
      expect(response.body).toEqual({ error: { code: "INVALID_INPUT", message } });
      expect(response.text).not.toMatch(/<!DOCTYPE|<html|SyntaxError|PayloadTooLargeError|node_modules|stack|not-gzip-data|unsupported-example/);
    });
  }
  it("preserves existing authentication and login-validation envelopes for valid JSON", async () => {
    const anonymous = await request(app).get("/api/auth/me");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body).toEqual({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
    expect((await request(app).get("/API/auth/ME")).status).toBe(401);
    const login = await request(app).post("/api/auth/login").send({});
    expect(login.status).toBe(400);
    expect(login.body).toEqual({ error: { code: "INVALID_INPUT", message: "Email and password are required." } });
    const tickets = await request(app).post("/api/tickets").send({});
    expect(tickets.status).toBe(401);
    expect(tickets.body.error.code).toBe("UNAUTHENTICATED");
  });
});

// Intentionally not enabled by DATABASE_URL: these tests write only in a newly
// allocated schema in an explicitly identified disposable local database.
describe.skipIf(!process.env.LAB4_TEST_DATABASE_URL)("Actions Taken real API/transactions (ACT-01-08, AUTH-01, CON-01, DUP-01, FAIL-01)", () => {
  let database: Awaited<ReturnType<typeof isolatedLab4Database>>;
  let f: Awaited<ReturnType<typeof requesterFixture>>;
  let ticket: Ticket, otherTicket: Ticket;
  let categoryId: number, relatedSystemId: number, assigneeId: number, ownerId: number, inactiveId: number;
  beforeAll(async () => {
    database = await isolatedLab4Database(); isolated = database.prisma; database.migrate();
    f = await requesterFixture();
    categoryId = (await isolated.category.create({ data: { name: "Action fixture category" } })).id;
    relatedSystemId = (await isolated.relatedSystem.create({ data: { name: "Action fixture system" } })).id;
    const staff = await isolated.user.create({ data: { name: "Assigned worker", email: "action-assignee@example.test", role: "IT_STAFF", passwordHash: f.users[2].passwordHash, mustChangePassword: false } });
    assigneeId = staff.id;
    ownerId = (await isolated.user.create({ data: { name: "Ticket coordinator", email: "action-owner@example.test", role: "IT_STAFF", passwordHash: staff.passwordHash, mustChangePassword: false } })).id;
    inactiveId = (await isolated.user.create({ data: { name: "Inactive worker", email: "action-inactive@example.test", role: "IT_STAFF", isActive: false, passwordHash: staff.passwordHash } })).id;
  }, 120000);
  beforeEach(async () => {
    const data = { requesterId: f.users[0].id, assignedStaffId: ownerId, categoryId, relatedSystemId, summary: "Action backend fixture", description: "Independent action identities", requestedPriority: "HIGH" as const };
    ticket = await isolated.ticket.create({ data: { ...data, ticketNumber: `ACT-${randomUUID()}` } });
    otherTicket = await isolated.ticket.create({ data: { ...data, requesterId: f.users[1].id, ticketNumber: `ACT-${randomUUID()}` } });
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => { await database?.dispose(); });
  const path = () => `/api/tickets/${ticket.id}/actions-taken`;
  const staff = () => f.agents[2];
  async function create(fields: object = {}, actor = staff()) {
    return actor.post(path()).send({ requestId: randomUUID(), expectedTicketVersion: (await isolated.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version, assignedToId: assigneeId, description: "Inspect logs", ...fields });
  }
  async function patch(id: number, fields: object, actor = staff()) {
    const action = await isolated.actionTaken.findUniqueOrThrow({ where: { id } });
    const parent = await isolated.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    return actor.patch(`${path()}/${id}`).send({ expectedVersion: action.version, expectedTicketVersion: parent.version, ...fields });
  }
  async function totals() {
    return { actions: await isolated.actionTaken.count({ where: { ticketId: ticket.id } }), revisions: await isolated.actionTakenRevision.count({ where: { action: { ticketId: ticket.id } } }), requests: await isolated.actionCreateRequest.count({ where: { ticketId: ticket.id } }), ticket: await isolated.ticket.findUniqueOrThrow({ where: { id: ticket.id } }) };
  }
  function error(response: request.Response, status: number, code: string) {
    expect(response.status).toBe(status); expect(response.body.error.code).toBe(code); expect(response.body.data).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|SELECT |postgresql:|stack|sessionId/);
  }
  it("creates multiple actions with independent creator, assignee and Ticket owner; Admin is permitted", async () => {
    for (const actor of [staff(), f.agents[3]]) {
      const response = await create({}, actor); expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({ replayed: false, action: { ticketId: ticket.id, status: "PLANNED", version: 1, assignedTo: { id: assigneeId, role: "IT_STAFF", isActive: true }, performedBy: null, completedAt: null, cancelledAt: null, cancellationReason: null } });
      expect(response.body.data.action.createdBy.id).toBe(actor === staff() ? f.users[2].id : f.users[3].id);
      expect(response.body.data.action.createdAt).toMatch(/\.\d{3}Z$/);
    }
    expect((await totals()).actions).toBe(2);
    expect((await totals()).ticket).toMatchObject({ assignedStaffId: ownerId, currentStatus: "NEW", version: 2 });
  });
  it("lists shared fields for owner, denies other Requesters, keeps histories private and checks nested pairing", async () => {
    const action = (await create({ result: "Shared result", attachmentNotes: "Existing file", followUpRequired: true, followUpNote: "Shared follow-up" })).body.data.action;
    await patch(action.id, { status: "CANCELLED", reason: "Duplicate" });
    const result = await f.agents[0].get(path());
    expect(result.status).toBe(200); expect(result.body.data.items[0]).toMatchObject({ status: "CANCELLED", result: "Shared result", followUpNote: "Shared follow-up", attachmentNotes: "Existing file" });
    expect(JSON.stringify(result.body)).not.toMatch(/password|session|internalNotes|actorRole|snapshot/);
    error(await f.agents[1].get(path()), 404, "TICKET_NOT_FOUND");
    error(await f.agents[0].get(`${path()}/${action.id}/history`), 403, "FORBIDDEN");
    error(await f.agents[0].post(path()).send({}), 403, "FORBIDDEN");
    error(await f.agents[0].patch(`${path()}/${action.id}`).send({}), 403, "FORBIDDEN");
    error(await staff().get(`/api/tickets/${otherTicket.id}/actions-taken/${action.id}/history`), 404, "ACTION_NOT_FOUND");
    error(await staff().patch(`/api/tickets/${otherTicket.id}/actions-taken/${action.id}`).send({ expectedVersion: 2, expectedTicketVersion: 0, description: "Wrong parent" }), 404, "ACTION_NOT_FOUND");
    error(await staff().get("/api/tickets/2147483647/actions-taken"), 404, "TICKET_NOT_FOUND");
  });
  it.each([
    { description: " " }, { description: "x".repeat(2001) }, { result: "x".repeat(2001) }, { description: "😀".repeat(1001) },
    { followUpRequired: "false" }, { followUpRequired: true }, { followUpRequired: true, followUpNote: " " }, { followUpNote: null },
    { attachmentNotes: {} }, { createdById: 1 }, { performedById: 1 }, { createdAt: "2000-01-01" }, { status: "COMPLETED" },
    { expectedTicketVersion: "0" }, { requestId: "bad" }, { assignedToId: [1] },
  ])("rejects invalid create without writes %#", async fields => {
    const before = await totals(); expect((await create(fields)).status).toBe(400); expect(await totals()).toEqual(before);
  });
  it("rejects malformed JSON and malformed list/ID/body shapes safely", async () => {
    error(await staff().post(path()).set("Content-Type", "application/json").send('{"description":'), 400, "INVALID_INPUT");
    error(await staff().post(path()).send([]), 400, "INVALID_INPUT");
    for (const query of ["page=0", "limit=101", "page=1&page=2", "actorId=1", "page=1000001"]) error(await staff().get(`${path()}?${query}`), 400, "INVALID_QUERY");
    error(await staff().get("/api/tickets/2147483648/actions-taken"), 400, "INVALID_ID");
    expect((await totals()).actions).toBe(0);
  });
  it("keeps stable tied-time ordering after edits and preserves valid empty page requests", async () => {
    const a = (await create()).body.data.action, b = (await create()).body.data.action;
    const sameTime = new Date("2026-10-27T04:00:00.000Z");
    await isolated.actionTaken.updateMany({ where: { ticketId: ticket.id }, data: { createdAt: sameTime } });
    await patch(a.id, { description: "Later correction" });
    const page = await staff().get(`${path()}?page=2&limit=1`);
    expect(page.body.data.items.map((item: { id: number }) => item.id)).toEqual([b.id]);
    expect(page.body.data.pagination).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
    const empty = await staff().get(`${path()}?page=9`);
    expect(empty.body.data.items).toEqual([]); expect(empty.body.data.pagination.page).toBe(9);
    const legacy = await staff().get(`/api/tickets/${otherTicket.id}/actions-taken`);
    expect(legacy.body.data).toMatchObject({ ticketVersion: 0, items: [], pagination: { total: 0, totalPages: 0 } });
  });
  it("reassigns, starts, completes as authenticated Admin, then corrects content preserving completion attribution", async () => {
    const initial = (await create()).body.data.action;
    expect((await patch(initial.id, { assignedToId: ownerId, description: "Reassigned investigation" })).status).toBe(200);
    expect((await patch(initial.id, { status: "IN_PROGRESS" })).status).toBe(200);
    error(await patch(initial.id, { status: "COMPLETED", result: " " }), 400, "VALIDATION_ERROR");
    const completed = await patch(initial.id, { status: "COMPLETED", result: "Fixed", followUpRequired: true, followUpNote: "Retest" }, f.agents[3]);
    expect(completed.status).toBe(200);
    expect(completed.body.data.action).toMatchObject({ createdBy: { id: f.users[2].id }, assignedTo: { id: ownerId }, performedBy: { id: f.users[3].id }, version: 4 });
    const corrected = await patch(initial.id, { result: "Corrected result", followUpRequired: false });
    expect(corrected.status).toBe(200); expect(corrected.body.data.action.completedAt).toBe(completed.body.data.action.completedAt);
    expect(corrected.body.data.action.performedBy).toEqual(completed.body.data.action.performedBy);
    error(await patch(initial.id, { assignedToId: assigneeId }), 409, "ACTION_IMMUTABLE");
    error(await patch(initial.id, { status: "CANCELLED", reason: "Cannot undo" }), 409, "ACTION_IMMUTABLE");
    error(await patch(initial.id, { result: " " }), 400, "VALIDATION_ERROR");
    const history = (await staff().get(`${path()}/${initial.id}/history`)).body.data;
    expect(history.items.map((r: { operation: string }) => r.operation)).toEqual(["CREATE", "ASSIGN", "STATUS", "STATUS", "EDIT"]);
    expect(history.items.map((r: { version: number }) => r.version)).toEqual([1, 2, 3, 4, 5]);
    expect(history.items[0].snapshot.description).toBe("Inspect logs");
    expect(history.items[3].actor).toEqual({ id: f.users[3].id, name: f.users[3].name, role: "ADMINISTRATOR" });
    expect(history.items[0].snapshot.id).toBeUndefined();
  });
  it("captures actor name/role in history even after account changes", async () => {
    const action = (await create()).body.data.action;
    const creator = await isolated.user.findUniqueOrThrow({ where: { id: f.users[2].id } });
    try {
      await isolated.user.update({ where: { id: creator.id }, data: { name: "Renamed creator", role: "REQUESTER" } });
      const history = await f.agents[3].get(`${path()}/${action.id}/history`);
      expect(history.body.data.items[0].actor).toEqual({ id: creator.id, name: creator.name, role: "IT_STAFF" });
    } finally { await isolated.user.update({ where: { id: creator.id }, data: { name: creator.name, role: creator.role } }); }
  });
  it("supports direct Planned completion and cancellation with a reason and no Result", async () => {
    const direct = (await create()).body.data.action;
    expect((await patch(direct.id, { status: "COMPLETED", result: "Verified directly" })).body.data.action.performedBy.id).toBe(f.users[2].id);
    const a = (await create()).body.data.action;
    error(await patch(a.id, { status: "CANCELLED" }), 400, "VALIDATION_ERROR");
    error(await patch(a.id, { status: "CANCELLED", reason: " " }), 400, "VALIDATION_ERROR");
    const cancelled = await patch(a.id, { status: "CANCELLED", reason: " Duplicate " });
    expect(cancelled.body.data.action).toMatchObject({ result: "", cancellationReason: "Duplicate", performedBy: null, completedAt: null });
    expect(cancelled.body.data.action.cancelledAt).toMatch(/Z$/);
    error(await patch(a.id, { description: "Cannot edit" }), 409, "ACTION_IMMUTABLE");
  });
  it("rejects inactive, non-staff, missing and Admin assignees on creation/reassignment", async () => {
    for (const id of [inactiveId, f.users[0].id, f.users[3].id, 2147483647]) error(await create({ assignedToId: id }), 400, "INVALID_ASSIGNEE");
    const a = (await create()).body.data.action;
    for (const id of [inactiveId, f.users[0].id, f.users[3].id, 2147483647]) error(await patch(a.id, { assignedToId: id }), 400, "INVALID_ASSIGNEE");
    expect((await totals()).ticket.version).toBe(1);
  });
  it("requires reassignment after deactivation/role change before start/completion, but permits cancellation", async () => {
    for (const change of [{ isActive: false }, { role: "REQUESTER" as const }]) {
      const a = (await create()).body.data.action;
      try {
        await isolated.user.update({ where: { id: assigneeId }, data: change });
        error(await patch(a.id, { status: "IN_PROGRESS" }), 400, "INVALID_ASSIGNEE");
        error(await patch(a.id, { status: "COMPLETED", result: "Fixed" }), 400, "INVALID_ASSIGNEE");
        expect((await patch(a.id, { status: "CANCELLED", reason: "Replanned" })).status).toBe(200);
      } finally { await isolated.user.update({ where: { id: assigneeId }, data: { isActive: true, role: "IT_STAFF" } }); }
    }
  });
  it.each(["RESOLVED", "CLOSED", "CANCELLED"] as const)("blocks action mutations on %s Tickets", async status => {
    const a = (await create()).body.data.action;
    await isolated.ticket.update({ where: { id: ticket.id }, data: { currentStatus: status } });
    error(await create(), 409, "TICKET_NOT_ACTIVE");
    error(await patch(a.id, { result: "Changed" }), 409, "TICKET_NOT_ACTIVE");
    expect((await f.agents[0].get(path())).status).toBe(200);
  });
  it("uses stale expectations before no-change/lifecycle checks; duplicates append nothing", async () => {
    const a = (await create()).body.data.action;
    const changed = await patch(a.id, { description: "Changed" }); expect(changed.status).toBe(200);
    const before = await totals();
    error(await patch(a.id, { expectedVersion: 1, expectedTicketVersion: 1, description: "Changed" }), 409, "STALE_UPDATE");
    error(await patch(a.id, { description: " Changed ", status: "PLANNED" }), 400, "NO_CHANGES");
    error(await patch(a.id, { expectedVersion: 1, result: "Other" }), 409, "STALE_UPDATE");
    expect(await totals()).toEqual(before);
  });
  it("replays normalized creation after later edit/terminal state and rejects changed payload/version", async () => {
    const body = { requestId: randomUUID(), expectedTicketVersion: 0, assignedToId: assigneeId, description: " Inspect logs " };
    const first = await staff().post(path()).send(body);
    await patch(first.body.data.action.id, { description: "Later correction" });
    await isolated.ticket.update({ where: { id: ticket.id }, data: { currentStatus: "CLOSED" } });
    const before = await totals();
    const replay = await staff().post(path()).send({ ...body, description: "Inspect logs", result: "", followUpRequired: false });
    expect(replay.status).toBe(201); expect(replay.body.data).toEqual({ ...first.body.data, replayed: true });
    error(await staff().post(path()).send({ ...body, description: "Different" }), 409, "IDEMPOTENCY_CONFLICT");
    error(await staff().post(path()).send({ ...body, expectedTicketVersion: 1 }), 409, "IDEMPOTENCY_CONFLICT");
    expect(await totals()).toEqual(before);
  });
  it("scopes replay keys to actor and Ticket", async () => {
    const requestId = randomUUID();
    expect((await create({ requestId })).status).toBe(201);
    expect((await create({ requestId }, f.agents[3])).body.data.replayed).toBe(false);
    const other = await staff().post(`/api/tickets/${otherTicket.id}/actions-taken`).send({ requestId, expectedTicketVersion: 0, assignedToId: assigneeId, description: "Inspect logs" });
    expect(other.status).toBe(201); expect(other.body.data.replayed).toBe(false);
  });
  it("converges concurrent duplicate creates and rejects one of two competing editors", async () => {
    const body = { requestId: randomUUID(), expectedTicketVersion: 0, assignedToId: assigneeId, description: "Inspect logs" };
    const duplicates = await Promise.all([staff().post(path()).send(body), staff().post(path()).send(body)]);
    expect(duplicates.map(r => r.status)).toEqual([201, 201]);
    expect(duplicates.map(r => r.body.data.replayed).sort()).toEqual([false, true]);
    expect((await totals()).actions).toBe(1); expect((await totals()).revisions).toBe(1);
    const id = duplicates[0].body.data.action.id;
    const edits = await Promise.all(["First editor", "Second editor"].map(description => staff().patch(`${path()}/${id}`).send({ expectedVersion: 1, expectedTicketVersion: 1, description })));
    expect(edits.map(r => r.status).sort()).toEqual([200, 409]);
    expect(edits.find(r => r.status === 409)!.body.error.code).toBe("STALE_UPDATE");
    expect((await totals()).revisions).toBe(2); expect((await totals()).ticket.version).toBe(2);
  });
  it("serializes eligible assignment against a real Admin deactivation race", async () => {
    const raceUser = await isolated.user.create({ data: { name: "Race worker", email: `${randomUUID()}@example.test`, role: "IT_STAFF", passwordHash: f.users[2].passwordHash, mustChangePassword: false } });
    const [action, deactivate] = await Promise.all([create({ assignedToId: raceUser.id }), f.agents[3].patch(`/api/admin/users/${raceUser.id}`).send({ isActive: false })]);
    expect(deactivate.status).toBe(200);
    expect([201, 400, 409]).toContain(action.status);
    if (action.status === 201) {
      // Creation serialized before deactivation: retained assignment is historical;
      // subsequent completion must revalidate instead of trusting that snapshot.
      error(await patch(action.body.data.action.id, { status: "COMPLETED", result: "Fixed" }), 400, "INVALID_ASSIGNEE");
    } else expect((await totals()).actions).toBe(0);
  });
  it("serializes creation against a concurrent assignee role change and rejects later completion", async () => {
    const worker = await isolated.user.create({ data: { name: "Role race worker", email: `${randomUUID()}@example.test`, role: "IT_STAFF", passwordHash: f.users[2].passwordHash, mustChangePassword: false } });
    const [created, demoted] = await Promise.all([
      create({ assignedToId: worker.id }),
      f.agents[3].patch(`/api/admin/users/${worker.id}`).send({ role: "REQUESTER" }),
    ]);
    expect(demoted.status).toBe(200);
    expect(await isolated.user.findUniqueOrThrow({ where: { id: worker.id }, select: { role: true, isActive: true } })).toEqual({ role: "REQUESTER", isActive: true });
    if (created.status === 201) {
      // Creation may serialize before demotion. Its original safe response and
      // revision remain historical; future completion rechecks the new role.
      expect(created.body.data.action.assignedTo).toMatchObject({ id: worker.id, role: "IT_STAFF", isActive: true });
      const beforeCompletion = await totals();
      expect(beforeCompletion).toMatchObject({ actions: 1, revisions: 1, requests: 1, ticket: { version: 1 } });
      const revision = await isolated.actionTakenRevision.findFirstOrThrow({ where: { actionId: created.body.data.action.id } });
      expect(revision.snapshot).toMatchObject({ assignedToId: worker.id, status: "PLANNED", version: 1 });
      error(await patch(created.body.data.action.id, { status: "COMPLETED", result: "Must not complete after demotion" }), 400, "INVALID_ASSIGNEE");
      expect(await totals()).toEqual(beforeCompletion);
    } else {
      if (created.status === 400) error(created, 400, "INVALID_ASSIGNEE");
      else error(created, 409, "CONCURRENT_UPDATE");
      expect(await totals()).toMatchObject({ actions: 0, revisions: 0, requests: 0, ticket: { version: 0 } });
    }
  });
  it("rolls back a completion PATCH, parent version, identities and history if its revision fails", async () => {
    const initial = (await create()).body.data.action;
    const snapshot = async () => ({
      totals: await totals(), action: await isolated.actionTaken.findUniqueOrThrow({ where: { id: initial.id } }),
      revisions: await isolated.actionTakenRevision.findMany({ where: { actionId: initial.id }, orderBy: { version: "asc" } }),
      receipts: await isolated.actionCreateRequest.findMany({ where: { ticketId: ticket.id }, orderBy: { id: "asc" } }),
    });
    const before = await snapshot();
    const transaction = isolated.$transaction.bind(isolated);
    vi.spyOn(isolated, "$transaction").mockImplementationOnce(((work: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => transaction(async tx => {
      vi.spyOn(tx.actionTakenRevision, "create").mockRejectedValueOnce(new Error("private revision persistence failure"));
      return work(tx);
    }, options)) as typeof isolated.$transaction);
    error(await patch(initial.id, { status: "COMPLETED", assignedToId: ownerId, result: "Completion must roll back", followUpRequired: true, followUpNote: "Retest" }, f.agents[3]), 500, "SERVER_ERROR");
    expect(await snapshot()).toEqual(before);
    expect(before.action).toMatchObject({ status: "PLANNED", version: 1, performedById: null, completedAt: null, cancelledAt: null });
  });
  it("rolls back parent/action/replay when revision storage fails and returns a safe error", async () => {
    const transaction = isolated.$transaction.bind(isolated);
    vi.spyOn(isolated, "$transaction").mockImplementationOnce(((work: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => transaction(async tx => {
      vi.spyOn(tx.actionTakenRevision, "create").mockRejectedValueOnce(new Error("SELECT secret_password FROM private_table"));
      return work(tx);
    }, options)) as typeof isolated.$transaction);
    const before = await totals();
    error(await create(), 500, "SERVER_ERROR"); expect(await totals()).toEqual(before);
  });
  it("bounds serialization retries and revalidates actor inside the transaction", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("private SQL conflict", { code: "P2034", clientVersion: "test" });
    const spy = vi.spyOn(isolated, "$transaction").mockRejectedValueOnce(conflict).mockRejectedValueOnce(conflict).mockRejectedValueOnce(conflict);
    // Avoid helpers that read totals until the three injected failures are consumed.
    error(await staff().post(path()).send({ requestId: randomUUID(), expectedTicketVersion: 0, assignedToId: assigneeId, description: "Retry" }), 409, "CONCURRENT_UPDATE");
    expect(spy).toHaveBeenCalledTimes(3); spy.mockRestore();
    const transaction = isolated.$transaction.bind(isolated);
    vi.spyOn(isolated, "$transaction").mockImplementationOnce(((work: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => transaction(async tx => {
      vi.spyOn(tx.user, "findUnique").mockResolvedValueOnce({ id: f.users[2].id, name: "Changed actor", role: "REQUESTER", isActive: true, mustChangePassword: false } as never);
      return work(tx);
    }, options)) as typeof isolated.$transaction);
    error(await create(), 403, "FORBIDDEN"); expect((await totals()).actions).toBe(0);
  });
  it("enforces anonymous, expired/replayed, inactive and must-change-password session boundaries", async () => {
    for (const route of [path(), `${path()}/1/history`]) error(await request(app).get(route), 401, "UNAUTHENTICATED");
    error(await request(app).post(path()).send({}), 401, "UNAUTHENTICATED");
    error(await request(app).patch(`${path()}/1`).send({}), 401, "UNAUTHENTICATED");
    const sessionId = randomUUID();
    await isolated.session.create({ data: { userId: f.users[2].id, sessionId, expiresAt: new Date(0) } });
    error(await request(app).get(path()).set("Cookie", `toktickit_session=${sessionId}`), 401, "SESSION_EXPIRED");
    error(await request(app).get(path()).set("Cookie", `toktickit_session=${sessionId}`), 401, "INVALID_SESSION");
    try {
      await isolated.user.update({ where: { id: f.users[2].id }, data: { isActive: false } });
      error(await staff().get(path()), 403, "ACCOUNT_INACTIVE");
      await isolated.user.update({ where: { id: f.users[2].id }, data: { isActive: true, mustChangePassword: true } });
      error(await create(), 403, "PASSWORD_CHANGE_REQUIRED");
    } finally { await isolated.user.update({ where: { id: f.users[2].id }, data: { isActive: true, mustChangePassword: false } }); }
  });
  it("permits Admin active staff lookup with safe projection and excludes ineligible accounts", async () => {
    const response = await f.agents[3].get("/api/staff/users"); expect(response.status).toBe(200);
    expect(response.body.data.map((user: { id: number }) => user.id)).toContain(assigneeId);
    expect(response.body.data.map((user: { id: number }) => user.id)).not.toContain(inactiveId);
    for (const user of response.body.data) expect(Object.keys(user).sort()).toEqual(["email", "id", "name"]);
  });
});
