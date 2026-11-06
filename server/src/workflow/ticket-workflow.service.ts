import { Prisma, TicketStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { ActionError } from "../actions/actions.rules.js";
import { actionTransaction, appendRevision } from "../actions/actions.service.js";
import { checkTicketVersion, checkTransition, resolutionGate, ticketTransitions, type StatusInput } from "./ticket-workflow.rules.js";

type Tx = Prisma.TransactionClient;
const safePerson = { id: true, name: true, email: true } as const;
const detailInclude = {
  requester: { select: safePerson }, assignedStaff: { select: safePerson }, category: true, relatedSystem: true,
  attachments: { select: { id: true, ticketId: true, fileName: true, mimeType: true, fileSize: true, isRemoved: true, uploadedAt: true, removedAt: true, removalReason: true } },
} as const;
async function authorized(tx: Tx, id: number, userId: number, operational = true) {
  const actor = await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, isActive: true, mustChangePassword: true } });
  if (!actor?.isActive) throw new ActionError(403, "ACCOUNT_INACTIVE", "Account is inactive.");
  if (actor.mustChangePassword) throw new ActionError(403, "PASSWORD_CHANGE_REQUIRED", "Change your initial password before continuing.");
  if (operational && !["IT_STAFF", "ADMINISTRATOR"].includes(actor.role)) throw new ActionError(403, "FORBIDDEN", "Operational Ticket access is required.");
  const ticket = await tx.ticket.findUnique({ where: { id } });
  if (!ticket || (actor.role === "REQUESTER" && ticket.requesterId !== actor.id)) throw new ActionError(404, "TICKET_NOT_FOUND", "Ticket was not found.");
  return { actor, ticket };
}
async function gate(tx: Tx, ticket: { id: number; assignedStaffId: number | null }) {
  const owner = ticket.assignedStaffId === null ? null : await tx.user.findUnique({ where: { id: ticket.assignedStaffId }, select: { role: true, isActive: true } });
  const actions = await tx.actionTaken.findMany({ where: { ticketId: ticket.id }, select: { status: true, result: true, followUpRequired: true } });
  return resolutionGate(ticket.assignedStaffId, owner, actions);
}
async function detail(tx: Tx, id: number, operational: boolean) {
  const ticket = await tx.ticket.findUniqueOrThrow({ where: { id }, include: detailInclude });
  return { ...ticket, ...(operational ? { allowedTicketTransitions: [...ticketTransitions[ticket.currentStatus]], resolutionGate: await gate(tx, ticket) } : {}) };
}
export function getWorkflowTicket(id: number, userId: number) {
  return getPrisma().$transaction(async tx => {
    const { actor } = await authorized(tx, id, userId, false);
    return detail(tx, id, actor.role !== "REQUESTER");
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
async function advance(tx: Tx, id: number, version: number, now: Date, change: Prisma.TicketUncheckedUpdateManyInput) {
  const saved = await tx.ticket.updateMany({ where: { id, version }, data: { ...change, version: { increment: 1 }, updatedAt: now } });
  if (saved.count !== 1) throw new ActionError(409, "STALE_UPDATE", "The Ticket changed. Refresh and review before trying again.");
}
export function transitionTicket(id: number, userId: number, input: StatusInput) {
  return actionTransaction(async tx => {
    const { actor, ticket } = await authorized(tx, id, userId);
    checkTransition(ticket.currentStatus, ticket.version, input);
    if (input.currentStatus === "RESOLVED" || input.currentStatus === "CLOSED") {
      const currentGate = await gate(tx, ticket);
      if (!currentGate.eligible) throw new ActionError(409, "RESOLUTION_GATE_FAILED", "Complete the resolution requirements before resolving or closing this Ticket.", { resolutionGate: currentGate.blockers.join(", ") });
    }
    const now = new Date();
    await advance(tx, id, input.expectedTicketVersion, now, { currentStatus: input.currentStatus });
    if (input.currentStatus === "CANCELLED") {
      const outstanding = await tx.actionTaken.findMany({ where: { ticketId: id, status: { in: ["PLANNED", "IN_PROGRESS"] } }, orderBy: { id: "asc" } });
      for (const action of outstanding) {
        const saved = await tx.actionTaken.updateMany({ where: { id: action.id, ticketId: id, version: action.version }, data: {
          status: "CANCELLED", version: { increment: 1 }, cancellationReason: input.reason!, cancelledAt: now, updatedAt: now,
        } });
        if (saved.count !== 1) throw new ActionError(409, "STALE_UPDATE", "An action changed. Refresh and review before trying again.");
        await appendRevision(tx, await tx.actionTaken.findUniqueOrThrow({ where: { id: action.id } }), actor, "STATUS");
      }
    }
    await tx.ticketStatusEvent.create({ data: {
      ticketId: id, fromStatus: ticket.currentStatus, toStatus: input.currentStatus, actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      reason: input.reason ?? null, createdAt: now,
    } });
    return detail(tx, id, true);
  });
}
export function assignTicket(id: number, userId: number, input: { expectedTicketVersion: number; assignedStaffId?: number }) {
  return actionTransaction(async tx => {
    const { actor, ticket } = await authorized(tx, id, userId);
    checkTicketVersion(ticket.version, input.expectedTicketVersion);
    const claim = input.assignedStaffId === undefined;
    if (claim && actor.role !== "IT_STAFF") throw new ActionError(400, "VALIDATION_ERROR", "Administrators must select an eligible IT Staff owner.", { assignedStaffId: "Select an active IT Staff member." });
    const staffId = input.assignedStaffId ?? actor.id;
    if (!await tx.user.findFirst({ where: { id: staffId, role: "IT_STAFF", isActive: true }, select: { id: true } }))
      throw new ActionError(400, "INVALID_STAFF_ID", "Select an active IT Staff member.", { assignedStaffId: "Select an active IT Staff member." });
    if (claim && ticket.assignedStaffId !== null && ticket.assignedStaffId !== actor.id)
      throw new ActionError(409, "TICKET_ALREADY_ASSIGNED", "This Ticket already has an owner. Refresh and review before reassigning.");
    if (ticket.assignedStaffId === staffId) throw new ActionError(400, "NO_CHANGES", "The Ticket already has the selected owner.");
    await advance(tx, id, input.expectedTicketVersion, new Date(), { assignedStaffId: staffId });
    return detail(tx, id, true);
  });
}
export function prioritizeTicket(id: number, userId: number, input: { expectedTicketVersion: number; itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" }) {
  return actionTransaction(async tx => {
    const { ticket } = await authorized(tx, id, userId);
    checkTicketVersion(ticket.version, input.expectedTicketVersion);
    if (ticket.itPriority === input.itPriority) throw new ActionError(400, "NO_CHANGES", "The Ticket already has the selected IT Priority.");
    await advance(tx, id, input.expectedTicketVersion, new Date(), { itPriority: input.itPriority });
    return detail(tx, id, true);
  });
}
export function getTicketHistory(id: number, userId: number, page: number, limit: number) {
  return getPrisma().$transaction(async tx => {
    await authorized(tx, id, userId);
    const total = await tx.ticketStatusEvent.count({ where: { ticketId: id } });
    const records = await tx.ticketStatusEvent.findMany({ where: { ticketId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit,
      select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true, actorId: true, actorName: true, actorRole: true } });
    return { ticketId: id, items: records.map(({ actorId, actorName, actorRole, ...event }) => ({ ...event, actor: { id: actorId, name: actorName, role: actorRole } })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export function indicateTicketResolution(id: number, userId: number) {
  return actionTransaction(async tx => {
    const { actor, ticket } = await authorized(tx, id, userId, false);
    if (actor.role !== "REQUESTER") throw new ActionError(403, "FORBIDDEN", "Requester access is required.");
    if (ticket.requesterResolvedAt === null) {
      const now = new Date();
      await advance(tx, id, ticket.version, now, { requesterResolvedAt: now });
    }
    return tx.ticket.findUniqueOrThrow({ where: { id }, select: { id: true, requesterResolvedAt: true, currentStatus: true, updatedAt: true, version: true } });
  });
}
