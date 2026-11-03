import { afterEach, describe, expect, it, vi } from "vitest";
import { getRequesterDashboard, DashboardError } from "../../src/dashboard.api";
const snapshot = { asOf: "2026-10-27T05:00:00.000Z", timeZone: "Asia/Bangkok", window: { start: "2026-10-20T17:00:00.000Z", end: "2026-10-27T05:00:00.000Z" },
  metrics: { myOpenTickets: 0, needsMyAttention: 0, recentlyResolved: 0 }, recentTickets: [], attentionTickets: [],
  drillDown: {
    myOpenTickets: { screen: "myTickets", query: { asOf: "2026-10-27T05:00:00.000Z", statuses: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", page: 1 } },
    needsMyAttention: { screen: "myTickets", query: { asOf: "2026-10-27T05:00:00.000Z", currentStatus: "WAITING_FOR_REQUESTER", page: 1 } },
    recentlyResolved: { screen: "myTickets", query: { asOf: "2026-10-27T05:00:00.000Z", statuses: "RESOLVED,CLOSED", resolvedSince: "2026-10-20T17:00:00.000Z", resolvedUntil: "2026-10-27T05:00:00.000Z", page: 1 } },
    recentTickets: { screen: "myTickets", query: { asOf: "2026-10-27T05:00:00.000Z", sortBy: "updatedAt", sortOrder: "desc", page: 1 } },
  } };
afterEach(() => vi.unstubAllGlobals());
describe("I5 dashboard transport (no database)", () => {
  it("uses the real requester endpoint, credentials and abort signal without client query parameters", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: snapshot }) }); vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    expect(await getRequesterDashboard(controller.signal)).toEqual(snapshot);
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/requester\/dashboard$/), { credentials: "include", signal: controller.signal });
  });
  it.each([401, 403, 500])("returns safe typed HTTP %i failure", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ error: { code: status === 403 ? "PASSWORD_CHANGE_REQUIRED" : "SERVER_ERROR", message: "private database detail" } }) }));
    await expect(getRequesterDashboard()).rejects.toBeInstanceOf(DashboardError);
    await expect(getRequesterDashboard()).rejects.not.toThrow("private database detail");
  });
  it.each([{}, { ...snapshot, metrics: { ...snapshot.metrics, myOpenTickets: -1 } }, { ...snapshot, window: { ...snapshot.window, end: "2026-10-27T05:00:00.001Z" } }, { ...snapshot, drillDown: { ...snapshot.drillDown, myOpenTickets: { screen: "adminUsers", query: {} } } }])("rejects malformed successful payload %#", async data => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data }) }));
    await expect(getRequesterDashboard()).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });
});
