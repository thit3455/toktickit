import { describe, expect, it } from "vitest";
import { parseCreate, parsePatch, planChange, ActionError, parsePage, parseId } from "../../src/actions/actions.rules.js";
import { validateSeedParticipants } from "../../prisma/seed-lab4.js";

const create = { requestId: "aab37f31-89b6-4f8a-8102-a86f7d0c51cf", expectedTicketVersion: 0, assignedToId: 2, description: " Inspect logs " };
const current = { description: "Inspect logs", result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "", assignedToId: 2, status: "PLANNED" as const };
function code(work: () => unknown, expected: string) {
  try { work(); throw new Error("Expected rejection"); } catch (error) { expect(error).toBeInstanceOf(ActionError); expect((error as ActionError).code).toBe(expected); }
}
describe("Lab 4 action rules (UNIT-01, ACT-02/04/05, DUP-01)", () => {
  it("normalizes text, UUID and optional defaults for stable replay", () => {
    expect(parseCreate(create)).toEqual({ ...create, description: "Inspect logs", result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "" });
    expect(parseCreate({ ...create, requestId: create.requestId.toUpperCase() })).toEqual(parseCreate(create));
  });
  it.each([null, [], {}, { ...create, createdById: 3 }, { ...create, status: "COMPLETED" }, { ...create, assignedToId: "2" }, { ...create, followUpRequired: "false" }, { ...create, result: null }, { ...create, requestId: "invalid" }, { ...create, expectedTicketVersion: -1 }, { ...create, description: " " }, { ...create, description: "a".repeat(2001) }, { ...create, followUpRequired: true }])("rejects malformed create %#", body => {
    expect(() => parseCreate(body)).toThrow(ActionError);
  });
  it("counts UTF-16 units and trims conditional text", () => {
    expect(parseCreate({ ...create, description: "😀".repeat(1000), followUpRequired: true, followUpNote: " Review " }).followUpNote).toBe("Review");
    expect(() => parseCreate({ ...create, description: "😀".repeat(1001) })).toThrow(ActionError);
  });
  for (const source of ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const) {
    for (const target of ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const) {
      it(`${source} -> ${target} follows the action matrix`, () => {
        const body = parsePatch({ expectedVersion: 1, expectedTicketVersion: 0, status: target, result: "Verified", ...(target === "CANCELLED" ? { reason: "Duplicate" } : {}) });
        const work = () => planChange({ ...current, status: source, result: source === "COMPLETED" ? "Original" : "" }, body);
        if (source === "CANCELLED") code(work, "ACTION_IMMUTABLE");
        else if (source === "COMPLETED" && target !== source) code(work, "ACTION_IMMUTABLE");
        else if (source !== target && !(source === "PLANNED" && ["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(target)) && !(source === "IN_PROGRESS" && ["COMPLETED", "CANCELLED"].includes(target))) code(work, "INVALID_TRANSITION");
        else expect(work().state.status).toBe(target);
      });
    }
  }
  it("requires resulting Result/follow-up/reason, allowing combined corrections", () => {
    const patch = (fields: object) => parsePatch({ expectedVersion: 1, expectedTicketVersion: 0, ...fields });
    code(() => planChange(current, patch({ status: "COMPLETED", result: " " })), "VALIDATION_ERROR");
    code(() => planChange(current, patch({ status: "CANCELLED" })), "VALIDATION_ERROR");
    code(() => planChange(current, patch({ reason: "Not cancellation", description: "Updated" })), "VALIDATION_ERROR");
    code(() => planChange(current, patch({ followUpRequired: true })), "VALIDATION_ERROR");
    expect(planChange(current, patch({ followUpRequired: true, followUpNote: "Review", status: "COMPLETED", result: "Fixed" })).operation).toBe("STATUS");
    code(() => planChange({ ...current, status: "COMPLETED", result: "Fixed" }, patch({ assignedToId: 3 })), "ACTION_IMMUTABLE");
  });
  it("rejects no-ops and gives one operation for a combined mutation", () => {
    const patch = (fields: object) => parsePatch({ expectedVersion: 1, expectedTicketVersion: 0, ...fields });
    code(() => planChange(current, patch({ description: " Inspect logs ", status: "PLANNED" })), "NO_CHANGES");
    expect(planChange(current, patch({ assignedToId: 3, description: "Updated" })).operation).toBe("ASSIGN");
    expect(planChange(current, patch({ description: "Updated" })).operation).toBe("EDIT");
  });
  it.each([{}, { expectedVersion: 0, expectedTicketVersion: 0 }, { expectedVersion: 1, expectedTicketVersion: 0, performedById: 2 }, { expectedVersion: 1, expectedTicketVersion: 0, status: "INVALID" }, { expectedVersion: 1, expectedTicketVersion: 0, reason: "x".repeat(501) }])("rejects invalid patch %#", body => expect(() => parsePatch(body)).toThrow(ActionError));
  it("validates IDs and pagination without coercing arrays or unknown filters", () => {
    expect(parseId("2147483647")).toBe(2147483647);
    for (const id of ["0", "-1", "1.0", "1e2", "2147483648"]) expect(() => parseId(id)).toThrow(ActionError);
    expect(parsePage({}, 50)).toEqual({ page: 1, limit: 50 });
    expect(parsePage({ page: "1000000", limit: "100" }, 20)).toEqual({ page: 1000000, limit: 100 });
    for (const query of [{ page: ["1"] }, { limit: "101" }, { page: "1000001" }, { actorId: "1" }]) expect(() => parsePage(query, 20)).toThrow(ActionError);
  });
});

describe("Lab 4 seed participant eligibility without a database (BR-03/23)", () => {
  const ids = { creatorId: 1, assigneeId: 2, performerId: 3 };
  const accounts = [1, 2, 3].map(id => ({ id, name: `Current worker ${id}`, role: "IT_STAFF" as const, isActive: true }));
  it("accepts distinct active workers and uses their current attribution", () => {
    const result = validateSeedParticipants(accounts, ids);
    expect(result).toEqual({ creator: accounts[0], assignee: accounts[1], performer: accounts[2] });
  });
  it("allows an active Administrator creator without changing account settings", () => {
    const current = [{ ...accounts[0], role: "ADMINISTRATOR" as const }, accounts[1], accounts[2]];
    const before = structuredClone(current);
    expect(validateSeedParticipants(current, ids).creator.role).toBe("ADMINISTRATOR");
    expect(current).toEqual(before);
  });
  it.each([1, 2, 3])("rejects inactive account %i without changing it", id => {
    const current = accounts.map(account => ({ ...account, isActive: account.id !== id }));
    const before = structuredClone(current);
    expect(() => validateSeedParticipants(current, ids)).toThrow("requires an active");
    expect(current).toEqual(before);
  });
  it.each([1, 2, 3])("rejects missing account %i", id => {
    expect(() => validateSeedParticipants(accounts.filter(account => account.id !== id), ids)).toThrow("requires an active");
  });
  it.each([1, 2, 3])("rejects a Requester in seed worker slot %i", id => {
    const current = accounts.map(account => ({ ...account, role: account.id === id ? "REQUESTER" as const : account.role }));
    expect(() => validateSeedParticipants(current, ids)).toThrow("requires an active");
  });
  it.each([2, 3])("rejects an Administrator in assignee/owner slot %i", id => {
    const current = accounts.map(account => ({ ...account, role: account.id === id ? "ADMINISTRATOR" as const : account.role }));
    expect(() => validateSeedParticipants(current, ids)).toThrow("requires an active IT Staff");
  });
});
