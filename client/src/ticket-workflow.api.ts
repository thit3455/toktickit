import { API_URL, type AccountRole, type TicketDetail, type TicketStatus } from "./api";
export const workflowStatuses: readonly TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
export const blockerLabels = {
  OWNER_REQUIRED: "Assign a Ticket Owner.",
  OWNER_INACTIVE_OR_NOT_STAFF: "Reassign the Ticket to active IT Staff.",
  COMPLETED_RESULT_REQUIRED: "Record at least one completed action with a nonblank Result.",
  ACTIVE_ACTIONS: "Complete or cancel all Planned and In Progress actions.",
  FOLLOW_UP_REQUIRED: "Clear pending follow-up on non-cancelled actions after reviewing the work.",
} as const;
export type GateBlocker = keyof typeof blockerLabels;
export interface WorkflowTicket extends TicketDetail {
  version: number; itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; assignedStaffId: number | null;
  assignedStaff: { id: number; name: string; email: string } | null;
  allowedTicketTransitions: TicketStatus[]; resolutionGate: { eligible: boolean; blockers: GateBlocker[] };
}
export interface TicketEvent { id: number; fromStatus: TicketStatus; toStatus: TicketStatus; reason: string | null; createdAt: string; actor: { id: number; name: string; role: AccountRole } }
export interface TicketHistory { ticketId: number; items: TicketEvent[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
export class WorkflowError extends Error {
  constructor(public status: number, public code: string) {
    super(status === 401 ? "Your session has expired. Please sign in again."
      : code === "PASSWORD_CHANGE_REQUIRED" ? "Change your initial password before continuing."
      : status === 403 ? "You no longer have permission to manage this Ticket."
      : status === 404 ? "This Ticket is unavailable."
      : code === "RESOLUTION_GATE_FAILED" ? "The resolution requirements changed. Refresh and review the blockers before retrying."
      : status === 409 ? "The Ticket changed. Your draft is retained; refresh and review before applying it."
      : code === "NO_CHANGES" ? "There are no changes to save."
      : status === 400 ? "Check the required fields and current owner eligibility."
      : code === "MALFORMED_RESPONSE" ? "The server returned an unreadable response. Retry safely."
      : status === 0 ? "Unable to reach the server. Your draft has been kept."
      : "Unable to complete the Ticket workflow request. Please try again.");
    this.name = "WorkflowError";
  }
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const status = (v: unknown): v is TicketStatus => workflowStatuses.includes(v as TicketStatus);
const date = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
function validTicket(v: unknown, id: number): v is WorkflowTicket {
  return object(v) && v.id === id && integer(v.version) && status(v.currentStatus) && date(v.updatedAt)
    && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(v.itPriority as string) && (v.assignedStaffId === null || integer(v.assignedStaffId))
    && (v.assignedStaff === null || (object(v.assignedStaff) && integer(v.assignedStaff.id) && typeof v.assignedStaff.name === "string" && typeof v.assignedStaff.email === "string"))
    && Array.isArray(v.allowedTicketTransitions) && v.allowedTicketTransitions.every(status) && object(v.resolutionGate)
    && typeof v.resolutionGate.eligible === "boolean" && Array.isArray(v.resolutionGate.blockers) && v.resolutionGate.blockers.every(key => typeof key === "string" && Object.hasOwn(blockerLabels, key))
    && v.resolutionGate.eligible === (v.resolutionGate.blockers.length === 0);
}
async function call<T>(path: string, validate: (v: unknown) => boolean, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(API_URL + path, { ...options, credentials: "include" }); }
  catch (error) { if (object(error) && error.name === "AbortError") throw error; throw new WorkflowError(0, "NETWORK_ERROR"); }
  let body: unknown;
  try { body = await response.json(); } catch { throw new WorkflowError(response.status, "MALFORMED_RESPONSE"); }
  if (!response.ok) throw new WorkflowError(response.status, object(body) && object(body.error) && typeof body.error.code === "string" ? body.error.code : "REQUEST_FAILED");
  if (!object(body) || !validate(body.data)) throw new WorkflowError(response.status, "MALFORMED_RESPONSE");
  return body.data as T;
}
export function getWorkflowTicket(id: number, signal?: AbortSignal): Promise<WorkflowTicket> {
  return call(`/api/tickets/${id}`, v => validTicket(v, id), { signal });
}
export type TicketChange =
  | { kind: "status"; expectedTicketVersion: number; currentStatus: TicketStatus; reason?: string }
  | { kind: "assign"; expectedTicketVersion: number; assignedStaffId?: number }
  | { kind: "priority"; expectedTicketVersion: number; itPriority: WorkflowTicket["itPriority"] };
export function changeTicket(id: number, change: TicketChange): Promise<WorkflowTicket> {
  const { kind, ...body } = change;
  return call(`/api/staff/tickets/${id}/${kind}`, v => validTicket(v, id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export function getTicketHistory(id: number, page = 1, signal?: AbortSignal): Promise<TicketHistory> {
  return call(`/api/tickets/${id}/status-history?page=${page}&limit=50`, v => object(v) && v.ticketId === id
    && object(v.pagination) && ["page", "limit", "total", "totalPages"].every(key => integer((v.pagination as Record<string, unknown>)[key]))
    && Array.isArray(v.items) && v.items.every(e => object(e) && integer(e.id) && status(e.fromStatus) && status(e.toStatus)
      && date(e.createdAt) && (e.reason === null || typeof e.reason === "string") && object(e.actor) && integer(e.actor.id)
      && typeof e.actor.name === "string" && ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"].includes(e.actor.role as string)), { signal });
}
