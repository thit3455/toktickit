import type { ActionContent, ActionTaken, ActionStatus } from "./api";

export interface ActionDraft extends ActionContent { assignedToId: string; reason: string }
export const emptyActionDraft = (): ActionDraft => ({ description: "", result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "", assignedToId: "", reason: "" });
export function actionDraft(action: ActionTaken): ActionDraft {
  return { description: action.description, result: action.result, followUpRequired: action.followUpRequired, followUpNote: action.followUpNote,
    attachmentNotes: action.attachmentNotes, assignedToId: String(action.assignedTo.id), reason: "" };
}
export const activeActionTicket = (status: string) => ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"].includes(status);
export const eligibleActionAssignee = (action: ActionTaken) => action.assignedTo.isActive && action.assignedTo.role === "IT_STAFF";
export function nextActionStatuses(status: ActionStatus): ActionStatus[] {
  return status === "PLANNED" ? ["IN_PROGRESS", "COMPLETED", "CANCELLED"] : status === "IN_PROGRESS" ? ["COMPLETED", "CANCELLED"] : [];
}
export function validateActionDraft(draft: ActionDraft, status: ActionStatus): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.description.trim() || draft.description.trim().length > 2000) errors.description = "Enter a description of 1–2000 characters.";
  for (const field of ["result", "followUpNote", "attachmentNotes"] as const) {
    if (draft[field].trim().length > 2000) errors[field] = "Use at most 2000 characters.";
  }
  if (status === "COMPLETED" && !draft.result.trim()) errors.result = "Enter a Result before completing the action.";
  if (draft.followUpRequired && !draft.followUpNote.trim()) errors.followUpNote = "Enter a follow-up note when follow-up is required.";
  if (!/^[1-9]\d*$/.test(draft.assignedToId) || !Number.isSafeInteger(Number(draft.assignedToId))) errors.assignedToId = "Select an active IT Staff assignee.";
  if (status === "CANCELLED" && (!draft.reason.trim() || draft.reason.trim().length > 500)) errors.reason = "Enter a cancellation reason of 1–500 characters.";
  return errors;
}
export function actionContentInput(draft: ActionDraft): ActionContent {
  return { description: draft.description.trim(), result: draft.result.trim(), followUpRequired: draft.followUpRequired,
    followUpNote: draft.followUpNote.trim(), attachmentNotes: draft.attachmentNotes.trim() };
}
export function bangkokActionTime(value: string | null): string {
  if (!value) return "Not recorded";
  return `${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value))} (Asia/Bangkok, UTC+07:00)`;
}
