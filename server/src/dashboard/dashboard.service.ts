import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { ActionError } from "../actions/actions.rules.js";
import { activeTicketStatuses, dashboardWindow, resolutionWindowFilter, ticketCutoff } from "./dashboard.rules.js";
const summary = { id: true, ticketNumber: true, summary: true, currentStatus: true, requestedPriority: true, itPriority: true, assignedStaffId: true, updatedAt: true } as const;
const order = [{ updatedAt: "desc" }, { id: "desc" }] as const;
async function actor(tx: Prisma.TransactionClient, userId: number, operational: boolean) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true, mustChangePassword: true } });
  if (!user?.isActive) throw new ActionError(403, "ACCOUNT_INACTIVE", "Account is inactive.");
  if (user.mustChangePassword) throw new ActionError(403, "PASSWORD_CHANGE_REQUIRED", "Change your initial password before continuing.");
  if (operational ? !["IT_STAFF", "ADMINISTRATOR"].includes(user.role) : user.role !== "REQUESTER") throw new ActionError(403, "FORBIDDEN", "Dashboard access is not permitted.");
}
export function requesterDashboard(userId: number) {
  return getPrisma().$transaction(async tx => {
    const asOf = new Date(), window = dashboardWindow(asOf), cutoff = asOf.toISOString();
    await actor(tx, userId, false);
    const owned = { ...ticketCutoff(asOf), requesterId: userId };
    const open = { ...owned, currentStatus: { in: activeTicketStatuses } };
    const waiting = { ...owned, currentStatus: "WAITING_FOR_REQUESTER" as const };
    const resolved = { ...owned, currentStatus: { in: ["RESOLVED", "CLOSED"] as ("RESOLVED" | "CLOSED")[] }, ...resolutionWindowFilter(new Date(window.start), asOf) };
    const [myOpenTickets, needsMyAttention, recentlyResolved, recentTickets, attentionTickets] = await Promise.all([
      tx.ticket.count({ where: open }), tx.ticket.count({ where: waiting }), tx.ticket.count({ where: resolved }),
      tx.ticket.findMany({ where: owned, select: summary, orderBy: [...order], take: 5 }),
      tx.ticket.findMany({ where: waiting, select: summary, orderBy: [...order], take: 5 }),
    ]);
    const link = (query: object) => ({ screen: "myTickets", query: { asOf: cutoff, ...query, page: 1 } });
    return { asOf: cutoff, timeZone: "Asia/Bangkok", window, metrics: { myOpenTickets, needsMyAttention, recentlyResolved }, recentTickets, attentionTickets,
      drillDown: {
        myOpenTickets: link({ statuses: activeTicketStatuses.join(",") }),
        needsMyAttention: link({ currentStatus: "WAITING_FOR_REQUESTER" }),
        recentlyResolved: link({ statuses: "RESOLVED,CLOSED", resolvedSince: window.start, resolvedUntil: cutoff }),
        recentTickets: link({ sortBy: "updatedAt", sortOrder: "desc" }),
      } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export function staffDashboard(userId: number) {
  return getPrisma().$transaction(async tx => {
    const asOf = new Date(), window = dashboardWindow(asOf), cutoff = asOf.toISOString();
    await actor(tx, userId, true);
    const eligible = ticketCutoff(asOf), active = { ...eligible, currentStatus: { in: activeTicketStatuses } };
    const actionWhere: Prisma.ActionTakenWhereInput = { assignedToId: userId, status: { in: ["PLANNED", "IN_PROGRESS"] }, createdAt: { lte: asOf }, updatedAt: { lte: asOf }, ticket: eligible };
    const [unassignedActiveTickets, myActiveTickets, myActiveActionsCount, buckets, recentTickets, actions] = await Promise.all([
      tx.ticket.count({ where: { ...active, assignedStaffId: null } }),
      tx.ticket.count({ where: { ...active, assignedStaffId: userId } }),
      tx.actionTaken.count({ where: actionWhere }),
      tx.ticket.groupBy({ by: ["itPriority"], where: active, _count: { _all: true } }),
      tx.ticket.findMany({ where: eligible, select: summary, orderBy: [...order], take: 5 }),
      tx.actionTaken.findMany({ where: actionWhere, select: { id: true, ticketId: true, description: true, status: true, updatedAt: true, ticket: { select: { ticketNumber: true } } }, orderBy: [...order], take: 5 }),
    ]);
    const activeTicketsByItPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    for (const bucket of buckets) activeTicketsByItPriority[bucket.itPriority] = bucket._count._all;
    const link = (query: object) => ({ screen: "staffQueue", query: { asOf: cutoff, ...query, page: 1 } });
    return { asOf: cutoff, timeZone: "Asia/Bangkok", window,
      metrics: { unassignedActiveTickets, myActiveTickets, myActiveActions: myActiveActionsCount, activeTicketsByItPriority },
      recentTickets, myActiveActions: actions.map(({ ticket, ...action }) => ({ ...action, ticketNumber: ticket.ticketNumber })),
      drillDown: {
        unassignedActiveTickets: link({ statuses: activeTicketStatuses.join(","), assigned: "false" }),
        myActiveTickets: link({ statuses: activeTicketStatuses.join(","), owner: "me" }),
        activeTicketsByItPriority: Object.fromEntries(Object.keys(activeTicketsByItPriority).map(itPriority => [itPriority, link({ statuses: activeTicketStatuses.join(","), itPriority })])),
        recentTickets: link({ sort: "updatedAt", order: "desc" }),
      } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
