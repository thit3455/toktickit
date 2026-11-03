import type { RequesterDashboardData, StaffDashboardData } from "../../src/dashboard.api";
export const asOf = "2026-10-27T05:00:00.000Z";
const active = "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED";
export const ticket = { id: 101, ticketNumber: "DASH-101", summary: "Synthetic network issue", currentStatus: "OPEN" as const, requestedPriority: "HIGH", itPriority: "URGENT", assignedStaffId: 2, updatedAt: asOf };
const base = { asOf, timeZone: "Asia/Bangkok" as const, window: { start: "2026-10-20T17:00:00.000Z", end: asOf }, recentTickets: [ticket] };
const requesterLink = (query: Record<string, string | number>) => ({ screen: "myTickets" as const, query: { asOf, ...query, page: 1 } });
const staffLink = (query: Record<string, string | number>) => ({ screen: "staffQueue" as const, query: { asOf, ...query, page: 1 } });
export const requesterData: RequesterDashboardData = { ...base, metrics: { myOpenTickets: 12, needsMyAttention: 2, recentlyResolved: 3 }, attentionTickets: [{ ...ticket, currentStatus: "WAITING_FOR_REQUESTER" }],
  drillDown: { myOpenTickets: requesterLink({ statuses: active }), needsMyAttention: requesterLink({ currentStatus: "WAITING_FOR_REQUESTER" }), recentlyResolved: requesterLink({ statuses: "RESOLVED,CLOSED", resolvedSince: base.window.start, resolvedUntil: asOf }), recentTickets: requesterLink({ sortBy: "updatedAt", sortOrder: "desc" }) } };
export const staffData: StaffDashboardData = { ...base, metrics: { unassignedActiveTickets: 8, myActiveTickets: 6, myActiveActions: 27, activeTicketsByItPriority: { LOW: 0, MEDIUM: 2, HIGH: 3, URGENT: 4 } },
  myActiveActions: [{ id: 41, ticketId: 101, ticketNumber: "DASH-101", description: "Assigned synthetic repair", status: "IN_PROGRESS", updatedAt: asOf }],
  drillDown: { unassignedActiveTickets: staffLink({ statuses: active, assigned: "false" }), myActiveTickets: staffLink({ statuses: active, owner: "me" }),
    activeTicketsByItPriority: { LOW: staffLink({ statuses: active, itPriority: "LOW" }), MEDIUM: staffLink({ statuses: active, itPriority: "MEDIUM" }), HIGH: staffLink({ statuses: active, itPriority: "HIGH" }), URGENT: staffLink({ statuses: active, itPriority: "URGENT" }) },
    recentTickets: staffLink({ sort: "updatedAt", order: "desc" }) } };
