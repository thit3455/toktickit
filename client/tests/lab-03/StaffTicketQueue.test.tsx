import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StaffTicketQueue } from "../../src/StaffTicketQueue";
import { getStaffTickets, StaffQueueError, StaffTicketQueueResponse } from "../../src/api";

vi.mock("../../src/api", async importOriginal => ({ ...await importOriginal<typeof import("../../src/api")>(), getStaffTickets: vi.fn() }));
const tickets: StaffTicketQueueResponse["data"] = [
  { id: 1, ticketNumber: "QUEUE-001", summary: "Printer unavailable", requestedPriority: "HIGH", itPriority: "URGENT", currentStatus: "IN_PROGRESS", createdAt: "2026-01-01T09:00:00Z", updatedAt: "2026-01-02T09:00:00Z", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Office" }, requester: { id: 3, name: "Owner", email: "owner@example.test" }, assignedStaff: { id: 2, name: "Zig", email: "staff@example.test" } },
  { id: 2, ticketNumber: "QUEUE-002", summary: "Network unavailable", requestedPriority: "LOW", itPriority: "MEDIUM", currentStatus: "REOPENED", createdAt: "2026-01-02T09:00:00Z", updatedAt: "2026-01-03T09:00:00Z", category: { id: 1, name: "Network" }, relatedSystem: { id: 1, name: "Office" }, requester: { id: 3, name: "Owner", email: "owner@example.test" }, assignedStaff: null },
];
const response = (page = 1, total = 2): StaffTicketQueueResponse => ({ data: tickets, pagination: { page, limit: 10, total, totalPages: Math.ceil(total / 10) } });
beforeEach(() => { vi.mocked(getStaffTickets).mockReset().mockResolvedValue(response()); });
afterEach(cleanup);
async function ready() { await screen.findByRole("button", { name: "Open QUEUE-001" }); }

describe("IT Staff Ticket Queue", () => {
  it("loads real API data with the default sort and displays all required fields", async () => {
    render(<StaffTicketQueue onOpen={vi.fn()} />);
    expect(screen.getByText("Loading tickets...")).toBeInTheDocument();
    await ready();
    expect(getStaffTickets).toHaveBeenCalledWith({ page: 1, limit: 10, sort: "createdAt", order: "desc" }, expect.any(AbortSignal));
    const row = screen.getByRole("button", { name: "Open QUEUE-001" }).closest("tr")!;
    for (const text of ["Printer unavailable", "Hardware", "HIGH", "URGENT", "IN PROGRESS", "Zig"]) expect(within(row).getByText(text)).toBeInTheDocument();
    expect(row.querySelector("time")?.dateTime).toBe(tickets[0].createdAt);
    expect(within(screen.getByRole("table")).getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText(/Sorted by Created Date — descending/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
  it("opens the correct ticket ID", async () => {
    const onOpen = vi.fn(); render(<StaffTicketQueue onOpen={onOpen} />); await ready();
    fireEvent.click(screen.getByRole("button", { name: "Open QUEUE-002" }));
    expect(onOpen).toHaveBeenCalledWith(2);
  });
  it("submits trimmed search and resets the page", async () => {
    vi.mocked(getStaffTickets).mockResolvedValue(response(2, 22));
    render(<StaffTicketQueue onOpen={vi.fn()} />); await ready();
    fireEvent.change(screen.getByLabelText("Search tickets"), { target: { value: "  Printer  " } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Printer", page: 1 }), expect.any(AbortSignal)));
  });
  it.each([
    ["Status", "CLOSED", { status: "CLOSED" }], ["Requested Priority", "HIGH", { priority: "HIGH" }],
    ["IT Priority", "URGENT", { itPriority: "URGENT" }], ["Owner", "true", { assigned: true }], ["Owner", "false", { assigned: false }],
    ["Sort by", "updatedAt", { sort: "updatedAt" }], ["Sort direction", "asc", { order: "asc" }],
  ])("sends %s changes to the API on page 1", async (name, value, patch) => {
    render(<StaffTicketQueue onOpen={vi.fn()} />); await ready();
    fireEvent.change(screen.getByLabelText(name), { target: { value } });
    await waitFor(() => expect(getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ ...patch, page: 1 }), expect.any(AbortSignal)));
  });
  it("moves next/previous while preserving filters and sort", async () => {
    vi.mocked(getStaffTickets).mockImplementation(async query => response(query?.page, 22));
    render(<StaffTicketQueue onOpen={vi.fn()} />); await ready();
    fireEvent.change(screen.getByLabelText("IT Priority"), { target: { value: "URGENT" } }); await ready();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Page 2 of 3");
    expect(getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, itPriority: "URGENT", sort: "createdAt", order: "desc" }), expect.any(AbortSignal));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await screen.findByText("Page 1 of 3");
  });
  it("distinguishes empty queue from no filter results and allows reset", async () => {
    vi.mocked(getStaffTickets).mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    render(<StaffTicketQueue onOpen={vi.fn()} />);
    await screen.findByText("The ticket queue is empty.");
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "CLOSED" } });
    await screen.findByText("No tickets match your search or filters.");
    fireEvent.click(screen.getByRole("button", { name: "Clear search and filters" }));
    await screen.findByText("The ticket queue is empty.");
    expect(screen.getByLabelText("Status")).toHaveValue("");
  });
  it.each([[403, "You do not have permission"], [401, "Your session has expired"], [500, "Unable to load the ticket queue"]])("shows safe API status %s", async (status, message) => {
    vi.mocked(getStaffTickets).mockRejectedValue(new StaffQueueError(status));
    render(<StaffTicketQueue onOpen={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("retries a network failure without exposing technical errors", async () => {
    vi.mocked(getStaffTickets).mockRejectedValueOnce(new Error("private server details"));
    render(<StaffTicketQueue onOpen={vi.fn()} />);
    await screen.findByRole("alert");
    expect(screen.queryByText(/private server/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" })); await ready();
  });
  it("ignores a late response after filters change", async () => {
    let resolve!: (value: StaffTicketQueueResponse) => void;
    vi.mocked(getStaffTickets).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    render(<StaffTicketQueue onOpen={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "CLOSED" } }); await ready();
    resolve({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Open QUEUE-001" })).toBeInTheDocument());
    expect(screen.queryByText("No tickets match your search or filters.")).not.toBeInTheDocument();
  });
});
