import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";
import * as api from "../../src/api";
vi.mock("../../src/api");
const ticket: api.TicketDetail = {
  id: 101, ticketNumber: "TKT-101", requesterId: 1, categoryId: 1, relatedSystemId: 1,
  summary: "Network connection failure", description: "Cannot connect to campus network.", requestedPriority: "HIGH", currentStatus: "IN_PROGRESS",
  createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", requesterResolvedAt: null,
  requester: { id: 1, name: "Alice" }, category: { id: 1, name: "Network" }, relatedSystem: { id: 1, name: "WiFi" }
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));
  vi.mocked(api.getCurrentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@test.test", role: "REQUESTER", mustChangePassword: false });
  vi.mocked(api.getCategories).mockResolvedValue([ticket.category]);
  vi.mocked(api.getRelatedSystems).mockResolvedValue([ticket.relatedSystem]);
  vi.mocked(api.getMyTickets).mockResolvedValue({ data: [ticket], pagination: { page: 1, pageSize: 10, totalPages: 1, totalItems: 1 } });
  vi.mocked(api.getTicketDetail).mockResolvedValue(ticket);
  vi.mocked(api.getTicketAttachments).mockResolvedValue([]);
});
afterEach(() => vi.unstubAllGlobals());
async function open() {
  render(<App />);
  await screen.findByRole("heading", { name: "Create Ticket" });
  fireEvent.click(await screen.findByRole("button", { name: "My Tickets" }));
  fireEvent.click(await screen.findByRole("button", { name: "TKT-101" }));
  await screen.findByRole("button", { name: "Problem Appears Resolved" });
}
describe("Requester resolution indication", () => {
  it("shows saving, saved feedback and persisted indication after reopening detail", async () => {
    let save!: (value: Pick<api.TicketDetail, "id" | "requesterResolvedAt" | "currentStatus" | "updatedAt">) => void;
    vi.mocked(api.indicateResolution).mockImplementation(() => new Promise(resolve => { save = resolve; }));
    await open();
    expect(screen.queryByRole("button", { name: /Claim Ticket|Update IT Priority|Update Status/ })).toBeNull();
    expect(screen.queryByText("Internal Notes")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    const saved = { ...ticket, requesterResolvedAt: "2026-10-01T01:00:00Z" };
    vi.mocked(api.getTicketDetail).mockResolvedValue(saved);
    save(saved);
    await screen.findByText("Resolution indication saved. Ticket status has not changed.");
    expect(api.indicateResolution).toHaveBeenCalledWith(101);
    expect(screen.getByDisplayValue("IN_PROGRESS")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to My Tickets" }));
    fireEvent.click(await screen.findByRole("button", { name: "TKT-101" }));
    await screen.findByText(/You indicated that the problem appears resolved/);
    expect(screen.queryByRole("button", { name: "Problem Appears Resolved" })).toBeNull();
  });
  it("keeps the action available on failure without changing status", async () => {
    vi.mocked(api.indicateResolution).mockRejectedValue(new Error("Unable to save resolution indication. Please try again."));
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save resolution indication");
    await waitFor(() => expect(screen.getByRole("button", { name: "Problem Appears Resolved" })).toBeEnabled());
    expect(screen.getByDisplayValue("IN_PROGRESS")).toBeInTheDocument();
  });
});
