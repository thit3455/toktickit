import { afterEach, expect, it, vi } from "vitest";
import { getStaffTickets, StaffQueueError } from "../../src/api";
afterEach(() => vi.unstubAllGlobals());
it("serializes all queue criteria and sends authenticated cookies", async () => {
  const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [], pagination: {} }) });
  vi.stubGlobal("fetch", mock);
  await getStaffTickets({ search: "Printer & WiFi", status: "OPEN", priority: "HIGH", itPriority: "URGENT", assigned: false, sort: "updatedAt", order: "asc", page: 2, limit: 10 });
  const [url, options] = mock.mock.calls[0];
  const query = new URL(url).searchParams;
  expect(Object.fromEntries(query)).toEqual({ search: "Printer & WiFi", status: "OPEN", priority: "HIGH", itPriority: "URGENT", assigned: "false", sort: "updatedAt", order: "asc", page: "2", limit: "10" });
  expect(options.credentials).toBe("include");
});
it.each([401, 403, 500])("preserves API status %s for safe queue feedback", async status => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
  await expect(getStaffTickets()).rejects.toEqual(new StaffQueueError(status));
});
