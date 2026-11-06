import type { WorkflowTicket, TicketHistory } from "../../src/ticket-workflow.api";
import type { TicketStatus } from "../../src/api";
export const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], CANCELLED: [],
};
export function workflowTicket(overrides: Partial<WorkflowTicket> = {}): WorkflowTicket {
  const currentStatus = overrides.currentStatus ?? "OPEN";
  return { id: 101, ticketNumber: "WF-101", requesterId: 1, categoryId: 1, relatedSystemId: 1,
    summary: "Synthetic workflow fixture", description: "Connection fails", requestedPriority: "HIGH",
    itPriority: "MEDIUM", currentStatus, version: 3, createdAt: "2026-10-31T01:00:00.000Z", updatedAt: "2026-10-31T02:00:00.000Z",
    requester: { id: 1, name: "Requester", email: "owner@example.test" }, category: { id: 1, name: "Network" }, relatedSystem: { id: 1, name: "Office" },
    assignedStaffId: 20, assignedStaff: { id: 20, name: "Original owner", email: "owner-staff@example.test" },
    resolutionGate: { eligible: true, blockers: [] }, allowedTicketTransitions: matrix[currentStatus], ...overrides };
}
export const ticketHistory: TicketHistory = {
  ticketId: 101, pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
  items: [{ id: 1, fromStatus: "NEW", toStatus: "OPEN", reason: null, createdAt: "2026-10-31T02:00:00.000Z", actor: { id: 8, name: "Recorded operator", role: "IT_STAFF" } }],
};
