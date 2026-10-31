import { describe, expect, it } from "vitest";
import { actionContentInput, actionDraft, activeActionTicket, bangkokActionTime, eligibleActionAssignee, emptyActionDraft, nextActionStatuses, validateActionDraft } from "../../src/actions-taken.rules";
import { action } from "./fixtures";

describe("Actions Taken UI rules", () => {
  it.each(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"])("permits action controls on %s", status => expect(activeActionTicket(status)).toBe(true));
  it.each(["RESOLVED", "CLOSED", "CANCELLED", "UNKNOWN"])("locks action controls on %s", status => expect(activeActionTicket(status)).toBe(false));
  it.each([
    ["PLANNED", ["IN_PROGRESS", "COMPLETED", "CANCELLED"]], ["IN_PROGRESS", ["COMPLETED", "CANCELLED"]], ["COMPLETED", []], ["CANCELLED", []],
  ] as const)("exposes only permitted transitions from %s", (status, expected) => expect(nextActionStatuses(status)).toEqual(expected));
  it("distinguishes ineligible historical assignees", () => {
    expect(eligibleActionAssignee(action)).toBe(true);
    expect(eligibleActionAssignee({ ...action, assignedTo: { ...action.assignedTo, isActive: false } })).toBe(false);
    expect(eligibleActionAssignee({ ...action, assignedTo: { ...action.assignedTo, role: "ADMINISTRATOR" } })).toBe(false);
  });
  it("requires description and a numeric assignee", () => {
    expect(validateActionDraft(emptyActionDraft(), "PLANNED")).toHaveProperty("description");
    for (const assignedToId of ["", "0", "-1", "1.5", "NaN", "9007199254740992"]) expect(validateActionDraft({ ...actionDraft(action), assignedToId }, "PLANNED")).toHaveProperty("assignedToId");
  });
  it.each(["description", "result", "followUpNote", "attachmentNotes"] as const)("uses UTF-16 limits for %s", field => {
    expect(validateActionDraft({ ...actionDraft(action), [field]: "😀".repeat(1000) }, "PLANNED")).not.toHaveProperty(field);
    expect(validateActionDraft({ ...actionDraft(action), [field]: "😀".repeat(1000) + "x" }, "PLANNED")).toHaveProperty(field);
  });
  it("checks whole-state completion and follow-up requirements", () => {
    expect(validateActionDraft({ ...actionDraft(action), result: "  " }, "COMPLETED")).toHaveProperty("result");
    expect(validateActionDraft({ ...actionDraft(action), followUpRequired: true, followUpNote: "  " }, "PLANNED")).toHaveProperty("followUpNote");
    expect(validateActionDraft({ ...actionDraft(action), result: "Fixed", followUpRequired: true, followUpNote: "Check tomorrow" }, "COMPLETED")).toEqual({});
  });
  it.each(["", "  ", "x".repeat(501)])("rejects invalid cancellation reason %#", reason => expect(validateActionDraft({ ...actionDraft(action), reason }, "CANCELLED")).toHaveProperty("reason"));
  it("normalizes only editable content and keeps conditional notes", () => {
    const draft = { ...actionDraft(action), description: " Check ", followUpRequired: false, followUpNote: " Earlier note " };
    expect(actionContentInput(draft)).toEqual({ description: "Check", result: "", followUpRequired: false, followUpNote: "Earlier note", attachmentNotes: action.attachmentNotes });
    expect(actionContentInput(draft)).not.toHaveProperty("assignedToId");
  });
  it("formats the Bangkok date across UTC midnight independently of browser timezone", () => {
    expect(bangkokActionTime(action.createdAt)).toBe("31 Oct 2026, 01:05:06 (Asia/Bangkok, UTC+07:00)");
    expect(bangkokActionTime(null)).toBe("Not recorded");
  });
});
