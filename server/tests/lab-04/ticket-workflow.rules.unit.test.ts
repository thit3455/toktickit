import { describe, expect, it } from "vitest";
import { TicketStatus } from "@prisma/client";
import { ActionError } from "../../src/actions/actions.rules.js";
import { checkTransition, parseAssignment, parsePriority, parseStatus, resolutionGate, ticketTransitions } from "../../src/workflow/ticket-workflow.rules.js";

const statuses = Object.values(TicketStatus);
const expected: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], CANCELLED: [],
};
function rejection(work: () => unknown, status: number, code: string) {
  try { work(); throw Error("Expected rejection"); }
  catch (error) { expect(error).toBeInstanceOf(ActionError); expect(error).toMatchObject({ status, code }); }
}
describe("I4 Ticket matrix and deterministic precedence (AC-01/05/06)", () => {
  it.each(statuses.flatMap(from => statuses.map(to => [from, to] as const)))("%s -> %s", (from, to) => {
    const input = parseStatus({ expectedTicketVersion: 4, currentStatus: to, ...(["CANCELLED", "REOPENED"].includes(to) ? { reason: "Reviewed synthetic work" } : {}) });
    if (from === to) rejection(() => checkTransition(from, 4, input), 400, "NO_CHANGES");
    else if (expected[from].includes(to)) expect(() => checkTransition(from, 4, input)).not.toThrow();
    else rejection(() => checkTransition(from, 4, input), 409, "INVALID_TRANSITION");
  });
  it.each(statuses)("keeps stale %s requests stale before equality/reason/gate", currentStatus => {
    rejection(() => checkTransition(currentStatus, 8, parseStatus({ expectedTicketVersion: 7, currentStatus })), 409, "STALE_UPDATE");
  });
  it.each(["REOPENED", "CANCELLED"] as const)("checks fresh permitted %s reason after the matrix", currentStatus => {
    const from = currentStatus === "REOPENED" ? "RESOLVED" : "OPEN";
    rejection(() => checkTransition(from, 8, parseStatus({ expectedTicketVersion: 8, currentStatus })), 400, "VALIDATION_ERROR");
    rejection(() => checkTransition("CLOSED", 8, parseStatus({ expectedTicketVersion: 8, currentStatus: "CANCELLED" })), 409, "INVALID_TRANSITION");
    rejection(() => checkTransition(from, 8, parseStatus({ expectedTicketVersion: 7, currentStatus, reason: " " })), 409, "STALE_UPDATE");
  });
  it("rejects reasons on non-reason transitions without mutating an input", () => {
    const input = parseStatus({ expectedTicketVersion: 1, currentStatus: "OPEN", reason: "Not applicable" });
    rejection(() => checkTransition("NEW", 1, input), 400, "VALIDATION_ERROR");
    expect(input.reason).toBe("Not applicable");
  });
  it.each([null, [], {}, { currentStatus: "OPEN" }, { expectedTicketVersion: -1, currentStatus: "OPEN" },
    { expectedTicketVersion: 0.5, currentStatus: "OPEN" }, { expectedTicketVersion: "1", currentStatus: "OPEN" },
    { expectedTicketVersion: 0, currentStatus: "UNKNOWN" }, { expectedTicketVersion: 0, currentStatus: "OPEN", reason: null },
    { expectedTicketVersion: 0, currentStatus: "CANCELLED", reason: "x".repeat(501) },
    { expectedTicketVersion: 0, currentStatus: "OPEN", actorId: 1 }, { expectedTicketVersion: 0, currentStatus: "OPEN", resolution: "invented" },
  ])("rejects structural malformed input %# before state checks", input => expect(() => parseStatus(input)).toThrow(ActionError));
  it("uses trimmed UTF-16 reason limits", () => {
    expect(parseStatus({ expectedTicketVersion: 0, currentStatus: "CANCELLED", reason: " " + "😀".repeat(250) + " " }).reason?.length).toBe(500);
    expect(() => parseStatus({ expectedTicketVersion: 0, currentStatus: "CANCELLED", reason: "😀".repeat(251) })).toThrow(ActionError);
  });
  it("retains existing claim/reassign/priority shapes plus mandatory version", () => {
    expect(parseAssignment({ expectedTicketVersion: 0 })).toEqual({ expectedTicketVersion: 0 });
    expect(parseAssignment({ expectedTicketVersion: 4, assignedStaffId: 8 })).toEqual({ expectedTicketVersion: 4, assignedStaffId: 8 });
    expect(parsePriority({ expectedTicketVersion: 3, itPriority: "URGENT" })).toEqual({ expectedTicketVersion: 3, itPriority: "URGENT" });
    for (const input of [{}, { expectedTicketVersion: 0, assignedStaffId: null }, { expectedTicketVersion: 0, assignedStaffId: "8" }, { expectedTicketVersion: 0, assignedStaffId: 0 }]) expect(() => parseAssignment(input)).toThrow(ActionError);
    for (const input of [{ itPriority: "HIGH" }, { expectedTicketVersion: 0, itPriority: "FAKE" }, { expectedTicketVersion: 0, itPriority: "HIGH", requesterId: 1 }]) expect(() => parsePriority(input)).toThrow(ActionError);
  });
  it("does not expose mutable arrays as new lifecycle statuses", () => expect(Object.keys(ticketTransitions).sort()).toEqual([...statuses].sort()));
});
const owner = { role: "IT_STAFF", isActive: true };
const completed = { status: "COMPLETED", result: "Verified existing action Result", followUpRequired: false };
describe("I4 four-condition resolution gate (AC-02)", () => {
  it("accepts completed nonblank work with an eligible owner", () => expect(resolutionGate(1, owner, [completed])).toEqual({ eligible: true, blockers: [] }));
  it.each([
    ["OWNER_REQUIRED", null, null, [completed]],
    ["OWNER_INACTIVE_OR_NOT_STAFF", 1, { ...owner, isActive: false }, [completed]],
    ["OWNER_INACTIVE_OR_NOT_STAFF", 1, { ...owner, role: "ADMINISTRATOR" }, [completed]],
    ["OWNER_INACTIVE_OR_NOT_STAFF", 1, null, [completed]],
    ["COMPLETED_RESULT_REQUIRED", 1, owner, []],
    ["COMPLETED_RESULT_REQUIRED", 1, owner, [{ ...completed, result: "  " }]],
    ["COMPLETED_RESULT_REQUIRED", 1, owner, [{ ...completed, status: "CANCELLED" }]],
    ["ACTIVE_ACTIONS", 1, owner, [completed, { ...completed, status: "PLANNED" }]],
    ["ACTIVE_ACTIONS", 1, owner, [completed, { ...completed, status: "IN_PROGRESS" }]],
    ["FOLLOW_UP_REQUIRED", 1, owner, [{ ...completed, followUpRequired: true }]],
  ] as const)("reports %s independently %#", (blocker, ownerId, account, actions) => expect(resolutionGate(ownerId, account, actions)).toMatchObject({ eligible: false, blockers: expect.arrayContaining([blocker]) }));
  it("cancelled work neither blocks follow-up nor satisfies completion", () => {
    expect(resolutionGate(1, owner, [completed, { status: "CANCELLED", result: "", followUpRequired: true }])).toEqual({ eligible: true, blockers: [] });
    expect(resolutionGate(1, owner, [{ status: "CANCELLED", result: "", followUpRequired: true }])).toEqual({ eligible: false, blockers: ["COMPLETED_RESULT_REQUIRED"] });
  });
  it("does not invent a fresh-action-per-reopen or requester-confirmation predicate", () => expect(resolutionGate(1, owner, [completed])).toMatchObject({ eligible: true }));
});
