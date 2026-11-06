export class ActionError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}
export const actionStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type Status = typeof actionStatuses[number];
export interface ActionContent {
  description: string; result: string; followUpRequired: boolean; followUpNote: string; attachmentNotes: string;
}
export interface ActionState extends ActionContent { assignedToId: number; status: Status }
export interface CreateAction extends ActionContent { requestId: string; expectedTicketVersion: number; assignedToId: number }
export interface PatchAction extends Partial<ActionState> { expectedVersion: number; expectedTicketVersion: number; reason?: string }
const contentKeys = ["description", "result", "followUpRequired", "followUpNote", "attachmentNotes"] as const;
function invalid(field: string, message: string): never {
  throw new ActionError(400, "VALIDATION_ERROR", "Check the highlighted fields.", { [field]: message });
}
function bodyOf(input: unknown, allowed: readonly string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key)))
    throw new ActionError(400, "INVALID_INPUT", "Supply only the supported action fields.");
  return input as Record<string, unknown>;
}
function version(value: unknown, field: string, minimum: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) invalid(field, `Enter an integer version of at least ${minimum}.`);
  return value;
}
function assignee(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 2147483647) invalid("assignedToId", "Select a valid active IT Staff member.");
  return value;
}
function text(value: unknown, field: string, required = false, maximum = 2000) {
  if (typeof value !== "string" || value.trim().length > maximum || (required && !value.trim())) invalid(field, `Enter ${required ? "1" : "0"} to ${maximum} characters.`);
  return value.trim();
}
function content(body: Record<string, unknown>): Partial<ActionContent> {
  const data: Partial<ActionContent> = {};
  for (const key of contentKeys) {
    if (!(key in body)) continue;
    if (key === "followUpRequired") {
      if (typeof body[key] !== "boolean") invalid(key, "Choose true or false.");
      data[key] = body[key];
    } else data[key] = text(body[key], key, key === "description");
  }
  return data;
}
function validateResulting(state: ActionContent, completed: boolean) {
  if (completed && !state.result.trim()) invalid("result", "Enter a Result before completing an action.");
  if (state.followUpRequired && !state.followUpNote.trim()) invalid("followUpNote", "Enter a note when follow-up is required.");
}
export function parseCreate(input: unknown): CreateAction {
  const body = bodyOf(input, [...contentKeys, "requestId", "expectedTicketVersion", "assignedToId"]);
  if (typeof body.requestId !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(body.requestId)) invalid("requestId", "Supply a UUID requestId.");
  // Fixed key order and defaults make JSON replay comparisons deterministic.
  const data: CreateAction = {
    requestId: body.requestId.toLowerCase(), expectedTicketVersion: version(body.expectedTicketVersion, "expectedTicketVersion", 0),
    assignedToId: assignee(body.assignedToId), description: text(body.description, "description", true),
    result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "", ...content(body),
  };
  validateResulting(data, false);
  return data;
}
export function parsePatch(input: unknown): PatchAction {
  const body = bodyOf(input, [...contentKeys, "expectedVersion", "expectedTicketVersion", "assignedToId", "status", "reason"]);
  const data: PatchAction = {
    expectedVersion: version(body.expectedVersion, "expectedVersion", 1),
    expectedTicketVersion: version(body.expectedTicketVersion, "expectedTicketVersion", 0), ...content(body),
  };
  if ("assignedToId" in body) data.assignedToId = assignee(body.assignedToId);
  if ("status" in body) {
    if (!actionStatuses.includes(body.status as Status)) invalid("status", "Select a valid action status.");
    data.status = body.status as Status;
  }
  if ("reason" in body) data.reason = text(body.reason, "reason", false, 500);
  return data;
}
export function planChange(current: ActionState, patch: PatchAction) {
  if (current.status === "CANCELLED") throw new ActionError(409, "ACTION_IMMUTABLE", "Cancelled actions cannot be changed.");
  const state: ActionState = {
    description: patch.description ?? current.description, result: patch.result ?? current.result,
    followUpRequired: patch.followUpRequired ?? current.followUpRequired, followUpNote: patch.followUpNote ?? current.followUpNote,
    attachmentNotes: patch.attachmentNotes ?? current.attachmentNotes, assignedToId: patch.assignedToId ?? current.assignedToId,
    status: patch.status ?? current.status,
  };
  const transition = state.status !== current.status;
  const assignment = state.assignedToId !== current.assignedToId;
  if (current.status === "COMPLETED" && (transition || assignment)) throw new ActionError(409, "ACTION_IMMUTABLE", "Completed action assignment and lifecycle are immutable.");
  if (transition && !(current.status === "PLANNED" && ["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(state.status)) && !(current.status === "IN_PROGRESS" && ["COMPLETED", "CANCELLED"].includes(state.status)))
    throw new ActionError(409, "INVALID_TRANSITION", "This action transition is not permitted.");
  if (state.status === "CANCELLED") {
    if (!patch.reason?.trim()) invalid("reason", "Enter a cancellation reason.");
  } else if (patch.reason !== undefined) invalid("reason", "A reason is accepted only for cancellation.");
  validateResulting(state, state.status === "COMPLETED");
  if (!transition && !assignment && contentKeys.every(key => state[key] === current[key])) throw new ActionError(400, "NO_CHANGES", "Supply an effective action change.");
  return { state, transition, assignment, operation: transition ? "STATUS" as const : assignment ? "ASSIGN" as const : "EDIT" as const };
}
export function parseId(value: string) {
  if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) throw new ActionError(400, "INVALID_ID", "Enter a valid resource ID.");
  return Number(value);
}
export function parsePage(query: Record<string, unknown>, defaultLimit: number) {
  if (Object.keys(query).some(key => !["page", "limit"].includes(key))) throw new ActionError(400, "INVALID_QUERY", "Unsupported list query.");
  const integer = (key: string, fallback: number, maximum: number) => {
    const value = query[key];
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > maximum) throw new ActionError(400, "INVALID_QUERY", "Invalid list pagination.");
    return Number(value);
  };
  return { page: integer("page", 1, 1000000), limit: integer("limit", defaultLimit, 100) };
}
