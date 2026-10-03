import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketDiscussion } from "../../src/TicketDiscussion";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Ticket discussion", () => {
  it("renders public comment HTML as text and offers no edit/delete actions", async () => {
    const message = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 1, message, createdAt: "2026-10-01T00:00:00Z", user: { name: "Requester" } }] }) }));
    const view = render(<TicketDiscussion ticketId={12} staff={false} />);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(view.container.querySelector("img, script")).toBeNull();
    expect(screen.queryByRole("button", { name: /edit|delete/i })).toBeNull();
    fireEvent.change(screen.getByLabelText("New public comment"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Add Public Comment" })).toBeDisabled();
    expect(screen.getByLabelText("New public comment")).toHaveAttribute("maxlength", "10000");
  });
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
