import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionsApiError, createActionTaken, getActionAssignees, getActionHistory, getActionsTaken, getActionTicketSummary, patchActionTaken } from "../../src/api";
import { action, history, list } from "./fixtures";

const fetchMock = vi.fn();
const respond = (data: unknown, status = 200) => fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => data });
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());
const content = { description: action.description, result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "" };
describe("Actions Taken adapters", () => {
  it("reads server pagination, versions and ordering with session cookies", async () => {
    respond({ data: list() }); const controller = new AbortController();
    expect(await getActionsTaken(101, 2, controller.signal)).toEqual(list());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/tickets/101/actions-taken?page=2&limit=20"), { credentials: "include", signal: controller.signal });
  });
  it("sends only the supplied create fields and returns replay metadata", async () => {
    respond({ data: { action, ticketVersion: 4, replayed: true } }, 201);
    const input = { ...content, assignedToId: 20, expectedTicketVersion: 3, requestId: "aa2192eb-456d-4fe1-b905-9e0af67f31c3" };
    expect(await createActionTaken(101, input)).toEqual({ action, ticketVersion: 4, replayed: true });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/tickets/101/actions-taken"), expect.objectContaining({ method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  });
  it("preserves the original optimistic versions in PATCH", async () => {
    respond({ data: { action, ticketVersion: 4 } });
    const input = { expectedVersion: 1, expectedTicketVersion: 3, description: "Updated" };
    await patchActionTaken(101, 41, input);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/101/actions-taken/41"), expect.objectContaining({ method: "PATCH", body: JSON.stringify(input) }));
  });
  it("reads private revision snapshots and active assignee lookup", async () => {
    respond({ data: history }); expect(await getActionHistory(101, 41, 2)).toEqual(history);
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/41/history?page=2&limit=50"), expect.objectContaining({ credentials: "include" }));
    respond({ data: [{ id: 20, name: "Assignee", email: "staff@example.test" }] });
    expect(await getActionAssignees()).toHaveLength(1);
  });
  it.each([400, 401, 403, 404, 409, 413, 415, 500])("keeps HTTP %i and suppresses raw server details", async status => {
    respond({ error: { code: "STALE_UPDATE", message: "password=private; SELECT * FROM secrets; stack" } }, status);
    const failure = await getActionsTaken(101).catch(error => error);
    expect(failure).toBeInstanceOf(ActionsApiError); expect(failure.status).toBe(status); expect(failure.code).toBe("STALE_UPDATE");
    expect(failure.message).not.toMatch(/private|SELECT|stack/);
  });
  it.each([
    {}, { data: {} }, { data: { ...list(), ticketId: 999 } }, { data: { ...list(), ticketVersion: -1 } },
    { data: list([{ ...action, ticketId: 999 }]) }, { data: list([{ ...action, assignedTo: null } as never]) },
    { data: list([{ ...action, createdAt: "invalid" }]) }, { data: { ...list(), pagination: null } },
  ])("rejects malformed list responses %#", async body => {
    respond(body); await expect(getActionsTaken(101)).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });
  it("rejects mismatched PATCH action and malformed history", async () => {
    respond({ data: { action: { ...action, id: 99 }, ticketVersion: 4 } });
    await expect(patchActionTaken(101, 41, { expectedVersion: 1, expectedTicketVersion: 3 })).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
    respond({ data: { ...history, items: [{ ...history.items[0], snapshot: {} }] } });
    await expect(getActionHistory(101, 41)).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });
  it("distinguishes invalid JSON, network failures and aborted reads", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new Error("raw response"); } });
    await expect(getActionsTaken(101)).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
    fetchMock.mockRejectedValueOnce(new Error("private URL"));
    await expect(getActionsTaken(101)).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
    fetchMock.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    await expect(getActionsTaken(101)).rejects.toMatchObject({ name: "AbortError" });
  });
  it("refreshes only Ticket summary fields and preserves password-gate failures", async () => {
    respond({ data: { id: 101, currentStatus: "OPEN", updatedAt: action.updatedAt, description: "Existing detail" } });
    expect(await getActionTicketSummary(101)).toEqual({ id: 101, currentStatus: "OPEN", updatedAt: action.updatedAt });
    respond({ error: { code: "PASSWORD_CHANGE_REQUIRED", message: "Do not echo this" } }, 403);
    await expect(getActionTicketSummary(101)).rejects.toMatchObject({ status: 403, code: "PASSWORD_CHANGE_REQUIRED" });
  });
});
