import { TicketStatus } from "@prisma/client";
import { ActionError } from "../actions/actions.rules.js";

export const ticketTransitions: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};
export type ResolutionBlocker = "OWNER_REQUIRED" | "OWNER_INACTIVE_OR_NOT_STAFF" | "COMPLETED_RESULT_REQUIRED" | "ACTIVE_ACTIONS" | "FOLLOW_UP_REQUIRED";
export interface GateOwner { role: string; isActive: boolean }
export interface GateAction { status: string; result: string; followUpRequired: boolean }
export function resolutionGate(ownerId: number | null, owner: GateOwner | null, actions: readonly GateAction[]) {
  const blockers: ResolutionBlocker[] = [];
  if (ownerId === null) blockers.push("OWNER_REQUIRED");
  else if (!owner?.isActive || owner.role !== "IT_STAFF") blockers.push("OWNER_INACTIVE_OR_NOT_STAFF");
  if (!actions.some(action => action.status === "COMPLETED" && action.result.trim().length > 0)) blockers.push("COMPLETED_RESULT_REQUIRED");
  if (actions.some(action => action.status === "PLANNED" || action.status === "IN_PROGRESS")) blockers.push("ACTIVE_ACTIONS");
  if (actions.some(action => action.status !== "CANCELLED" && action.followUpRequired)) blockers.push("FOLLOW_UP_REQUIRED");
  return { eligible: blockers.length === 0, blockers };
}
function invalid(field: string, message: string): never {
  throw new ActionError(400, "VALIDATION_ERROR", "Check the highlighted fields.", { [field]: message });
}
function bodyOf(input: unknown, keys: readonly string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key)))
    throw new ActionError(400, "INVALID_INPUT", "Supply only the supported Ticket fields.");
  return input as Record<string, unknown>;
}
export function expectedTicketVersion(input: unknown) {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 0) invalid("expectedTicketVersion", "Enter a nonnegative integer Ticket version.");
  return input;
}
export interface StatusInput { expectedTicketVersion: number; currentStatus: TicketStatus; reason?: string }
export function parseStatus(input: unknown): StatusInput {
  const body = bodyOf(input, ["expectedTicketVersion", "currentStatus", "reason"]);
  const version = expectedTicketVersion(body.expectedTicketVersion);
  if (!Object.values(TicketStatus).includes(body.currentStatus as TicketStatus)) invalid("currentStatus", "Select a valid Ticket status.");
  if ("reason" in body && (typeof body.reason !== "string" || body.reason.trim().length > 500)) invalid("reason", "Use a reason of at most 500 characters.");
  return { expectedTicketVersion: version, currentStatus: body.currentStatus as TicketStatus, ...("reason" in body ? { reason: (body.reason as string).trim() } : {}) };
}
export function parseAssignment(input: unknown) {
  const body = bodyOf(input, ["expectedTicketVersion", "assignedStaffId"]);
  const version = expectedTicketVersion(body.expectedTicketVersion);
  if ("assignedStaffId" in body && (typeof body.assignedStaffId !== "number" || !Number.isInteger(body.assignedStaffId) || body.assignedStaffId < 1 || body.assignedStaffId > 2147483647))
    invalid("assignedStaffId", "Select an active IT Staff member.");
  return { expectedTicketVersion: version, ...("assignedStaffId" in body ? { assignedStaffId: body.assignedStaffId as number } : {}) };
}
export function parsePriority(input: unknown) {
  const body = bodyOf(input, ["expectedTicketVersion", "itPriority"]);
  const version = expectedTicketVersion(body.expectedTicketVersion);
  if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(body.itPriority as string)) invalid("itPriority", "Select a valid IT Priority.");
  return { expectedTicketVersion: version, itPriority: body.itPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" };
}
export function checkTicketVersion(current: number, expected: number) {
  if (current !== expected) throw new ActionError(409, "STALE_UPDATE", "The Ticket changed. Refresh and review before trying again.");
}
// This ordering is contractual: stale -> equality -> matrix -> conditional reason.
// Structural input validation happens earlier, before the authorized lookup.
export function checkTransition(current: TicketStatus, version: number, input: StatusInput) {
  checkTicketVersion(version, input.expectedTicketVersion);
  if (current === input.currentStatus) throw new ActionError(400, "NO_CHANGES", "The Ticket already has the requested status.");
  if (!ticketTransitions[current].includes(input.currentStatus)) throw new ActionError(409, "INVALID_TRANSITION", "This Ticket status transition is not permitted.");
  if (input.currentStatus === "CANCELLED" || input.currentStatus === "REOPENED") {
    if (!input.reason) invalid("reason", "Enter a cancellation or reopening reason of 1–500 characters.");
  } else if (input.reason !== undefined) invalid("reason", "A reason is accepted only for cancellation or reopening.");
}
