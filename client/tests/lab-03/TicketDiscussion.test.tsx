import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketDiscussion } from "../../src/TicketDiscussion";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Ticket discussion", () => {
  it("staff can read and post public comments and internal notes with session cookies", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => ({ data: options?.method === "POST" ? {} : [] }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TicketDiscussion ticketId={12} staff />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    for (const [label, button, kind] of [["New public comment", "Add Public Comment", "comments"], ["New internal note", "Add Internal Note", "internal-notes"]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: " Test message " } });
      fireEvent.click(screen.getByRole("button", { name: button }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`/12/${kind}`), expect.objectContaining({ method: "POST", credentials: "include", body: JSON.stringify({ message: "Test message" }) })));
    }
  });
  it("requesters only see public comments", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<TicketDiscussion ticketId={12} staff={false} />);
    await screen.findByText("No messages yet.");
    expect(screen.queryByText("Internal Notes")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("shows a failed save and keeps the draft for retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (_url, options) => ({ ok: options?.method !== "POST", json: async () => ({ data: [] }) })));
    render(<TicketDiscussion ticketId={12} staff={false} />);
    await screen.findByText("No messages yet.");
    fireEvent.change(screen.getByLabelText("New public comment"), { target: { value: "Keep this draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Public Comment" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Unable to save");
    expect((screen.getByLabelText("New public comment") as HTMLTextAreaElement).value).toBe("Keep this draft");
  });
});
