import { afterEach, describe, expect, it, vi } from "vitest";
import { changeTicket, getTicketHistory, getWorkflowTicket, WorkflowError } from "../../src/ticket-workflow.api";
import { workflowTicket, ticketHistory } from "./workflow-fixtures";
afterEach(() => vi.unstubAllGlobals());
function response(data: unknown, status = 200) { const mock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => data }); vi.stubGlobal("fetch", mock); return mock; }
describe("versioned Ticket workflow adapter", () => {
  it("reads current operational metadata using cookie credentials", async () => {
    const fetch = response({ data: workflowTicket() }); expect(await getWorkflowTicket(101)).toEqual(workflowTicket());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/tickets/101"), expect.objectContaining({ credentials: "include" }));
  });
  it.each([
    { kind: "assign", expectedTicketVersion: 7, assignedStaffId: 20 },
    { kind: "assign", expectedTicketVersion: 7 },
    { kind: "priority", expectedTicketVersion: 7, itPriority: "HIGH" },
    { kind: "status", expectedTicketVersion: 7, currentStatus: "CANCELLED", reason: "Required cancellation evidence" },
  ] as const)("sends only the contracted %j payload", async change => {
    const fetch = response({ data: workflowTicket() }); await changeTicket(101, change);
    const [url, options] = fetch.mock.calls[0]; const { kind, ...body } = change;
    expect(url).toContain("/api/staff/tickets/101/" + kind);
    expect(options).toMatchObject({ method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(options.body)).toEqual(body);
  });
  it("validates chronological private history pagination and actor snapshots", async () => {
    const fetch = response({ data: ticketHistory }); expect(await getTicketHistory(101, 2)).toEqual(ticketHistory);
    expect(fetch.mock.calls[0][0]).toContain("/status-history?page=2&limit=50");
  });
  it.each([401, 403, 404, 409, 500])("keeps safe status/code for HTTP %s without native details", async status => {
    response({ error: { code: "STALE_UPDATE", message: "private database failure" } }, status);
    try { await getWorkflowTicket(101); throw Error("Expected rejection"); } catch (e) {
      expect(e).toBeInstanceOf(WorkflowError); expect(e).toMatchObject({ status, code: "STALE_UPDATE" }); expect(String(e)).not.toContain("private database");
    }
  });
  it.each([
    { id: 102 }, { version: -1 }, { version: "3" }, { currentStatus: "FAKE" }, { updatedAt: "not a date" },
    { itPriority: "FAKE" }, { allowedTicketTransitions: ["FAKE"] }, { resolutionGate: { eligible: true, blockers: ["ACTIVE_ACTIONS"] } },
    { resolutionGate: { eligible: false, blockers: ["UNKNOWN"] } },
  ])("rejects malformed Ticket metadata %j", async patch => {
    response({ data: { ...workflowTicket(), ...patch } }); await expect(getWorkflowTicket(101)).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });
  it("rejects malformed history rather than rendering an unknown actor", async () => {
    response({ data: { ...ticketHistory, items: [{ ...ticketHistory.items[0], actor: { id: 1, name: "Actor", role: "FAKE" } }] } });
    await expect(getTicketHistory(101)).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });
  it("reports malformed JSON safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => { throw Error("private"); } }));
    await expect(getWorkflowTicket(101)).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });
  it("distinguishes network failures from deliberate abort", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("native details"))); await expect(getWorkflowTicket(101)).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
    const abort = new DOMException("Aborted", "AbortError"); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort)); await expect(getWorkflowTicket(101)).rejects.toBe(abort);
  });
});
