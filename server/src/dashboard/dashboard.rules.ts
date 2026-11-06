import { Prisma, TicketStatus } from "@prisma/client";
import { ActionError } from "../actions/actions.rules.js";
export const activeTicketStatuses: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
export const activeActionStatuses = ["PLANNED", "IN_PROGRESS"] as const;
const invalid = (): never => { throw new ActionError(400, "INVALID_QUERY", "Invalid dashboard or drill-down filters."); };
export function dashboardWindow(asOf: Date) {
  const local = new Date(asOf.getTime() + 7 * 60 * 60 * 1000);
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - 6) - 7 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: asOf.toISOString() };
}
export function ticketCutoff(asOf: Date): Prisma.TicketWhereInput {
  return { createdAt: { lte: asOf }, updatedAt: { lte: asOf } };
}
export function resolutionWindowFilter(start: Date, end: Date): Prisma.TicketWhereInput {
  // Equivalent to testing the latest RESOLVED event across ALL events: one in
  // the interval and none later than end. Equal-time id ties share membership.
  // In particular, a future latest event cannot fall back to an older match.
  return { AND: [
    { statusEvents: { some: { toStatus: "RESOLVED", createdAt: { gte: start, lte: end } } } },
    { statusEvents: { none: { toStatus: "RESOLVED", createdAt: { gt: end } } } },
  ] };
}
function instant(value: unknown): Date {
  if (typeof value !== "string") return invalid();
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) return invalid();
  return parsed;
}
export function listDashboardFilters(query: Record<string, unknown>, kind: "requester" | "staff", userId: number, requestNow = new Date()): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {};
  let asOf: Date | undefined;
  if (query.asOf !== undefined) {
    asOf = instant(query.asOf);
    if (asOf > requestNow) return invalid();
    Object.assign(where, ticketCutoff(asOf));
  }
  if (query.statuses !== undefined) {
    if (typeof query.statuses !== "string" || query[kind === "staff" ? "status" : "currentStatus"] !== undefined) return invalid();
    const statuses = query.statuses.split(",");
    if (!statuses.length || new Set(statuses).size !== statuses.length || statuses.some(status => !Object.values(TicketStatus).includes(status as TicketStatus))) return invalid();
    where.currentStatus = { in: statuses as TicketStatus[] };
  }
  if (query.owner !== undefined) {
    if (kind !== "staff" || query.owner !== "me" || query.assigned === "false") return invalid();
    where.assignedStaffId = userId;
  }
  if (query.resolvedSince !== undefined || query.resolvedUntil !== undefined) {
    if (kind !== "requester" || !asOf || query.resolvedSince === undefined || query.resolvedUntil === undefined) return invalid();
    const start = instant(query.resolvedSince), end = instant(query.resolvedUntil);
    if (start > end || end > asOf) return invalid();
    Object.assign(where, resolutionWindowFilter(start, end));
  }
  return where;
}
