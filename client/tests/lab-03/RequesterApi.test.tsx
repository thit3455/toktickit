import { afterEach, describe, expect, it, vi } from "vitest";
import { createTicket, getMyTickets, getTicketDetail, getTicketAttachments, uploadTicketAttachment, removeAttachment, indicateResolution, getCurrentUser, logout } from "../../src/api";
afterEach(() => vi.unstubAllGlobals());
describe("Requester API uses session cookies", () => {
  it("never sends requester identity for creation, list, detail or attachments", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    await createTicket({ categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW", summary: "Network issue", description: "Cannot connect to WiFi" });
    await getMyTickets({ search: "wifi", currentStatus: "IN_PROGRESS", page: 2 });
    await getTicketDetail(4, 999);
    await getTicketAttachments(4, 999);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { id: 1, ticketId: 4, fileName: "test.pdf", fileSize: 2, uploadedAt: "2026-10-01" } }) });
    await uploadTicketAttachment(4, 999, new File(["hi"], "test.pdf", { type: "application/pdf" }));
    await removeAttachment(1, 999, "Wrong file");
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).not.toContain("requesterId");
      expect(options.credentials).toBe("include");
      if (typeof options.body === "string") expect(options.body).not.toContain("requesterId");
    }
    expect(fetchMock.mock.calls[1][0]).toContain("currentStatus=IN_PROGRESS");
  });
  it.each([401, 403, 404, 500])("reports safe resolution failure for HTTP %s", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ error: { message: "secret backend detail" } }) }));
    await expect(indicateResolution(1)).rejects.not.toThrow("secret");
  });
  it("restores the server identity and logs out with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: 1, role: "REQUESTER" } }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await getCurrentUser()).toMatchObject({ id: 1, role: "REQUESTER" });
    await logout();
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/auth/logout"), { method: "POST", credentials: "include" });
    fetchMock.mockResolvedValueOnce({ status: 401 });
    expect(await getCurrentUser()).toBeNull();
  });
});
