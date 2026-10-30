import { ActionTaken, Prisma, UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { ActionError, CreateAction, PatchAction, planChange } from "./actions.rules.js";

const safeName = { id: true, name: true } as const;
export const actionSelect = {
  id: true, ticketId: true, description: true, result: true, followUpRequired: true, followUpNote: true, attachmentNotes: true,
  status: true, version: true, createdAt: true, updatedAt: true, completedAt: true, cancelledAt: true, cancellationReason: true,
  createdBy: { select: safeName }, assignedTo: { select: { ...safeName, role: true, isActive: true } }, performedBy: { select: safeName },
} as const satisfies Prisma.ActionTakenSelect;
type Tx = Prisma.TransactionClient;
type Actor = { id: number; name: string; role: UserRole };
const activeTickets = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
export function jsonSnapshot(value: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value));
}
export function actionSnapshot(action: ActionTaken) {
  const { id: _id, ...state } = action;
  return jsonSnapshot(state);
}
export async function appendRevision(tx: Tx, action: ActionTaken, actor: Actor, operation: "CREATE" | "EDIT" | "ASSIGN" | "STATUS") {
  await tx.actionTakenRevision.create({ data: {
    actionId: action.id, version: action.version, operation, actorId: actor.id, actorName: actor.name, actorRole: actor.role,
    createdAt: action.updatedAt, snapshot: actionSnapshot(action),
  } });
}
async function authorizedTicket(tx: Tx, ticketId: number, userId: number, write: boolean) {
  const actor = await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, isActive: true, mustChangePassword: true } });
  if (!actor?.isActive) throw new ActionError(403, "ACCOUNT_INACTIVE", "Account is inactive.");
  if (actor.mustChangePassword) throw new ActionError(403, "PASSWORD_CHANGE_REQUIRED", "Change your initial password before continuing.");
  if (write && !["IT_STAFF", "ADMINISTRATOR"].includes(actor.role)) throw new ActionError(403, "FORBIDDEN", "Staff access is required.");
  const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || (actor.role === "REQUESTER" && ticket.requesterId !== actor.id)) throw new ActionError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  return { actor, ticket };
}
function checkVersion(current: number, expected: number) {
  if (current !== expected) throw new ActionError(409, "STALE_UPDATE", "This record changed. Refresh and review before retrying.");
}
function checkActive(status: string) {
  if (!activeTickets.includes(status)) throw new ActionError(409, "TICKET_NOT_ACTIVE", "Reopen a Resolved or Closed Ticket before changing actions. Cancelled Tickets are terminal.");
}
async function eligibleAssignee(tx: Tx, id: number) {
  if (!await tx.user.findFirst({ where: { id, role: "IT_STAFF", isActive: true }, select: { id: true } }))
    throw new ActionError(400, "INVALID_ASSIGNEE", "Select an active IT Staff assignee.", { assignedToId: "Select an active IT Staff member." });
}
async function advanceTicket(tx: Tx, id: number, expected: number, now: Date) {
  const saved = await tx.ticket.updateMany({ where: { id, version: expected }, data: { version: { increment: 1 }, updatedAt: now } });
  if (saved.count !== 1) throw new ActionError(409, "STALE_UPDATE", "The Ticket changed. Refresh and review before retrying.");
}
// Retain the client's original expectations on every retry, including deduplication races.
export async function actionTransaction<T>(work: (tx: Tx) => Promise<T>, creation = false): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await getPrisma().$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || (creation && error.code === "P2002"));
      if (retryable && attempt < 2) continue;
      if (retryable) throw new ActionError(409, "CONCURRENT_UPDATE", "Another update occurred. Refresh and review before retrying.");
      throw error;
    }
  }
}
export async function createAction(ticketId: number, userId: number, input: CreateAction) {
  return actionTransaction(async tx => {
    const { actor, ticket } = await authorizedTicket(tx, ticketId, userId, true);
    const key = { actorId: actor.id, ticketId, requestId: input.requestId };
    const previous = await tx.actionCreateRequest.findUnique({ where: { actorId_ticketId_requestId: key } });
    // JSONB changes object key order: compare normalized values, never serialized stored key order.
    if (previous) {
      const saved = previous.payload as Record<string, unknown>;
      if (Object.keys(input).some(key => saved[key] !== input[key as keyof CreateAction]) || Object.keys(saved).length !== Object.keys(input).length)
        throw new ActionError(409, "IDEMPOTENCY_CONFLICT", "This requestId was used with different input.");
      return { ...(previous.response as Prisma.JsonObject), replayed: true };
    }
    checkVersion(ticket.version, input.expectedTicketVersion);
    checkActive(ticket.currentStatus);
    await eligibleAssignee(tx, input.assignedToId);
    const now = new Date();
    await advanceTicket(tx, ticketId, input.expectedTicketVersion, now);
    const { expectedTicketVersion: _expected, requestId: _requestId, ...content } = input;
    const action = await tx.actionTaken.create({ data: { ...content, ticketId, createdById: actor.id, status: "PLANNED", createdAt: now, updatedAt: now } });
    await appendRevision(tx, action, actor, "CREATE");
    const dto = await tx.actionTaken.findUniqueOrThrow({ where: { id: action.id }, select: actionSelect });
    const response = jsonSnapshot({ action: dto, ticketVersion: ticket.version + 1 });
    await tx.actionCreateRequest.create({ data: { ...key, actionId: action.id, payload: jsonSnapshot(input), response, createdAt: now } });
    return { ...response, replayed: false };
  }, true);
}
export async function patchAction(ticketId: number, actionId: number, userId: number, input: PatchAction) {
  return actionTransaction(async tx => {
    const { actor, ticket } = await authorizedTicket(tx, ticketId, userId, true);
    const current = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId } });
    if (!current) throw new ActionError(404, "ACTION_NOT_FOUND", "Action not found.");
    checkVersion(ticket.version, input.expectedTicketVersion);
    checkVersion(current.version, input.expectedVersion);
    checkActive(ticket.currentStatus);
    const change = planChange(current, input);
    if (change.assignment || (change.transition && ["IN_PROGRESS", "COMPLETED"].includes(change.state.status))) await eligibleAssignee(tx, change.state.assignedToId);
    const now = new Date();
    await advanceTicket(tx, ticketId, input.expectedTicketVersion, now);
    const saved = await tx.actionTaken.updateMany({ where: { id: actionId, ticketId, version: input.expectedVersion }, data: {
      ...change.state, version: { increment: 1 }, updatedAt: now,
      ...(change.transition && change.state.status === "COMPLETED" ? { performedById: actor.id, completedAt: now } : {}),
      ...(change.transition && change.state.status === "CANCELLED" ? { cancellationReason: input.reason!, cancelledAt: now } : {}),
    } });
    if (saved.count !== 1) throw new ActionError(409, "STALE_UPDATE", "The action changed. Refresh and review before retrying.");
    const action = await tx.actionTaken.findUniqueOrThrow({ where: { id: actionId } });
    await appendRevision(tx, action, actor, change.operation);
    return { action: await tx.actionTaken.findUniqueOrThrow({ where: { id: actionId }, select: actionSelect }), ticketVersion: ticket.version + 1 };
  });
}
export async function listActions(ticketId: number, userId: number, page: number, limit: number, actionId?: number) {
  return getPrisma().$transaction(async tx => {
    const { ticket } = await authorizedTicket(tx, ticketId, userId, actionId !== undefined);
    const pagination = (total: number) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });
    if (actionId !== undefined) {
      if (!await tx.actionTaken.findFirst({ where: { id: actionId, ticketId }, select: { id: true } })) throw new ActionError(404, "ACTION_NOT_FOUND", "Action not found.");
      const total = await tx.actionTakenRevision.count({ where: { actionId } });
      const revisions = await tx.actionTakenRevision.findMany({ where: { actionId }, orderBy: { version: "asc" }, skip: (page - 1) * limit, take: limit,
        select: { id: true, version: true, operation: true, actorId: true, actorName: true, actorRole: true, createdAt: true, snapshot: true } });
      const items = revisions.map(({ actorId, actorName, actorRole, ...revision }) => ({ ...revision, actor: { id: actorId, name: actorName, role: actorRole } }));
      return { ticketId, actionId, items, pagination: pagination(total) };
    }
    const total = await tx.actionTaken.count({ where: { ticketId } });
    const items = await tx.actionTaken.findMany({ where: { ticketId }, select: actionSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit });
    return { ticketId, ticketVersion: ticket.version, items, pagination: pagination(total) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
