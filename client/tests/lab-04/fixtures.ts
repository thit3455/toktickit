import type { ActionList, ActionTaken, ActionHistory } from "../../src/api";

export const action: ActionTaken = {
  id: 41, ticketId: 101, description: "Inspect printer", result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "Refer to Ticket attachment",
  status: "PLANNED", version: 1, createdAt: "2026-10-30T18:05:06.000Z", updatedAt: "2026-10-30T18:05:06.000Z", completedAt: null, cancelledAt: null, cancellationReason: null,
  createdBy: { id: 10, name: "Creator" }, assignedTo: { id: 20, name: "Assignee", role: "IT_STAFF", isActive: true }, performedBy: null,
};
export const list = (items = [action], ticketVersion = 3): ActionList => ({ ticketId: 101, ticketVersion, items, pagination: { page: 1, limit: 20, total: items.length, totalPages: items.length ? 1 : 0 } });
export const history: ActionHistory = {
  ticketId: 101, actionId: 41, pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }, items: [{
    id: 1, version: 1, operation: "CREATE", createdAt: action.createdAt, actor: { id: 10, name: "Creator at time of change", role: "IT_STAFF" },
    snapshot: { description: action.description, result: "", status: "PLANNED", followUpRequired: false, followUpNote: "", attachmentNotes: "", createdById: 10, assignedToId: 20, performedById: null, completedAt: null, cancelledAt: null, cancellationReason: null },
  }],
};
