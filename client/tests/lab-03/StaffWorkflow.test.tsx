import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";
import * as api from "../../src/api";

vi.mock("../../src/api");
const ticket = {
  id: 101, ticketNumber: "STAFF-101", requesterId: 30, categoryId: 1, relatedSystemId: 1,
  summary: "Network issue", description: "Cannot connect", requestedPriority: "LOW" as const,
  itPriority: "MEDIUM" as const, currentStatus: "NEW" as const,
  createdAt: "2026-09-01T08:00:00Z", updatedAt: "2026-09-01T08:00:00Z",
  category: { id: 1, name: "Network" }, relatedSystem: { id: 1, name: "Office" },
  requester: { id: 30, name: "Ticket owner", email: "owner@example.test" }, assignedStaff: null,
};
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));
  vi.mocked(api.getCurrentUser).mockResolvedValue(null);
  vi.mocked(api.getCategories).mockResolvedValue([]);
  vi.mocked(api.getRelatedSystems).mockResolvedValue([]);
  vi.mocked(api.getStaffTickets).mockResolvedValue({ data: [ticket], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } });
  vi.mocked(api.getStaffTicketDetail).mockResolvedValue(ticket);
  vi.mocked(api.getTicketAttachments).mockResolvedValue([]);
  vi.mocked(api.getActiveStaffUsers).mockResolvedValue([
    { id: 10, name: "Zig", email: "zig@example.test" },
    { id: 20, name: "Michael Brown", email: "michael@example.test" },
  ]);
  vi.mocked(api.claimStaffTicket).mockResolvedValue({ data: { assignedStaff: { id: 10, name: "Staff owner", email: "staff10@example.test" } } });
  vi.mocked(api.updateStaffTicketPriority).mockResolvedValue({ data: { itPriority: "URGENT" } });
  vi.mocked(api.updateStaffTicketStatus).mockResolvedValue({ data: { currentStatus: "IN_PROGRESS" } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openAsStaff(id: number) {
  vi.mocked(api.login).mockResolvedValue({ data: { sessionId: "test", user: { id, name: `Staff ${id}`, email: `staff${id}@example.test`, role: "IT_STAFF", mustChangePassword: false } } });
  const view = render(<App />);
  fireEvent.change(await screen.findByRole("textbox"), { target: { value: `staff${id}@example.test` } });
  fireEvent.change(view.container.querySelector('input[type="password"]')!, { target: { value: "TestPassword123!" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  await screen.findByRole("heading", { name: "IT Staff Ticket Queue" });
  fireEvent.click(await screen.findByRole("button", { name: "Open STAFF-101" }));
  await screen.findByText(/Assigned Staff:/);
  return view;
}

describe("IT Staff app workflow", () => {
  it("shows the saved requester indication and timestamp without automatically changing status", async () => {
    const timestamp = "2026-10-01T08:30:00Z";
    vi.mocked(api.getStaffTicketDetail).mockResolvedValue({ ...ticket, requesterResolvedAt: timestamp });
    await openAsStaff(10);
    const notice = screen.getByRole("region", { name: "Requester resolution indication" });
    expect(notice).toHaveTextContent("Requester: Problem Appears Resolved");
    expect(notice.querySelector("time")).toHaveAttribute("datetime", timestamp);
    expect(notice).toHaveTextContent(new Date(timestamp).toLocaleString());
    expect(screen.getByText("Current Ticket Status:")).toHaveTextContent("NEW");
    expect(api.updateStaffTicketStatus).not.toHaveBeenCalled();
    expect(api.indicateResolution).not.toHaveBeenCalled();
    for (const currentStatus of ["RESOLVED", "CLOSED"]) {
      vi.mocked(api.updateStaffTicketStatus).mockResolvedValueOnce({ data: { currentStatus } });
      fireEvent.change(screen.getByRole("option", { name: currentStatus }).closest("select")!, { target: { value: currentStatus } });
      fireEvent.click(screen.getByRole("button", { name: "Update Status" }));
      await waitFor(() => expect(screen.getByText("Current Ticket Status:")).toHaveTextContent(currentStatus));
      expect(api.updateStaffTicketStatus).toHaveBeenLastCalledWith(101, currentStatus);
    }
  });
  it.each([null, undefined])("hides the indication when its timestamp is %s", async requesterResolvedAt => {
    vi.mocked(api.getStaffTicketDetail).mockResolvedValue({ ...ticket, requesterResolvedAt });
    await openAsStaff(10);
    expect(screen.queryByRole("region", { name: "Requester resolution indication" })).toBeNull();
  });
  it("does not carry the indication into another ticket", async () => {
    const otherTicket = { ...ticket, id: 102, ticketNumber: "STAFF-102", requesterResolvedAt: null };
    vi.mocked(api.getStaffTickets).mockResolvedValue({ data: [ticket, otherTicket], pagination: { page: 1, limit: 10, total: 2, totalPages: 1 } });
    vi.mocked(api.getStaffTicketDetail).mockImplementation(async id => id === 101 ? { ...ticket, requesterResolvedAt: "2026-10-01T08:30:00Z" } : otherTicket);
    await openAsStaff(10);
    expect(screen.getByRole("region", { name: "Requester resolution indication" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to IT Staff Queue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open STAFF-102" }));
    await screen.findByDisplayValue("STAFF-102");
    expect(api.getStaffTicketDetail).toHaveBeenLastCalledWith(102);
    expect(screen.queryByRole("region", { name: "Requester resolution indication" })).toBeNull();
  });
  it("renders reassignment for an owned ticket, saves the selected owner and reloads it in detail and queue", async () => {
    const michael = { id: 20, name: "Michael Brown", email: "michael@example.test" };
    const zig = { id: 10, name: "Zig", email: "zig@example.test" };
    vi.mocked(api.getStaffTicketDetail).mockResolvedValue({ ...ticket, assignedStaffId: 20, assignedStaff: michael });
    vi.mocked(api.reassignStaffTicket).mockImplementation(async () => {
      const saved = { ...ticket, assignedStaffId: 10, assignedStaff: zig };
      vi.mocked(api.getStaffTicketDetail).mockResolvedValue(saved);
      vi.mocked(api.getStaffTickets).mockResolvedValue({ data: [saved], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } });
      return { data: saved };
    });
    const view = await openAsStaff(10);
    expect(screen.queryByRole("button", { name: "Claim Ticket" })).toBeNull();
    expect(screen.getByText(/Assigned Staff:/)).toHaveTextContent("Michael Brown");
    fireEvent.change(await screen.findByLabelText("Reassign to"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Reassign Ticket" }));
    await screen.findByText("Ticket reassigned to Zig successfully.");
    expect(api.reassignStaffTicket).toHaveBeenCalledWith(101, 10);
    expect(screen.getByText(/Assigned Staff:/)).toHaveTextContent("Zig");
    expect(screen.queryByRole("button", { name: "Claim Ticket" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to IT Staff Queue" }));
    await screen.findByRole("cell", { name: "Zig" });
    view.unmount();
    await openAsStaff(10);
    expect(screen.getByText(/Assigned Staff:/)).toHaveTextContent("Zig");
    expect(screen.queryByRole("button", { name: "Claim Ticket" })).toBeNull();
  });
  it("refreshes stale claim ownership after a conflict", async () => {
    await openAsStaff(10);
    vi.mocked(api.claimStaffTicket).mockRejectedValue(new Error("This ticket already has an owner."));
    vi.mocked(api.getStaffTicketDetail).mockResolvedValue({ ...ticket, assignedStaffId: 20, assignedStaff: { id: 20, name: "Michael Brown", email: "michael@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Claim Ticket" }));
    await screen.findByRole("button", { name: "Reassign Ticket" });
    expect(screen.queryByRole("button", { name: "Claim Ticket" })).toBeNull();
    expect(screen.getByText(/Assigned Staff:/)).toHaveTextContent("Michael Brown");
  });
  it("keeps the owner and shows an error if reassignment fails", async () => {
    vi.mocked(api.getStaffTicketDetail).mockResolvedValue({ ...ticket, assignedStaffId: 20, assignedStaff: { id: 20, name: "Michael Brown", email: "michael@example.test" } });
    vi.mocked(api.reassignStaffTicket).mockRejectedValue(new Error("Select a valid active IT Staff member."));
    await openAsStaff(10);
    fireEvent.change(await screen.findByLabelText("Reassign to"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Reassign Ticket" }));
    await screen.findByText("Select a valid active IT Staff member.");
    expect(screen.getByText(/Assigned Staff:/)).toHaveTextContent("Michael Brown");
  });
  it("allows retry when the active staff list fails", async () => {
    vi.mocked(api.getStaffTicketDetail).mockResolvedValue({ ...ticket, assignedStaffId: 20, assignedStaff: { id: 20, name: "Michael Brown", email: "michael@example.test" } });
    vi.mocked(api.getActiveStaffUsers).mockRejectedValueOnce(new Error("Unable to load staff."));
    await openAsStaff(10);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load staff.");
    expect(screen.getByRole("button", { name: "Reassign Ticket" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry staff list" }));
    await screen.findByRole("option", { name: "Zig (zig@example.test)" });
  });
  it.each([10, 20])("staff account %s opens the queue, claims and updates the ticket", async id => {
    await openAsStaff(id);
    expect(api.login).toHaveBeenCalledWith(`staff${id}@example.test`, "TestPassword123!");
    expect(api.getStaffTicketDetail).toHaveBeenCalledWith(101);
    fireEvent.click(screen.getByRole("button", { name: "Claim Ticket" }));
    await screen.findByText("Ticket claimed successfully.");
    expect(api.claimStaffTicket).toHaveBeenCalledWith(101);
    expect(screen.getByText(/Assigned Staff:/).textContent).toContain("Staff owner");
    const priority = screen.getByRole("option", { name: "URGENT" }).closest("select")!;
    fireEvent.change(priority, { target: { value: "URGENT" } });
    fireEvent.click(screen.getByRole("button", { name: "Update IT Priority" }));
    await screen.findByText("IT priority updated successfully.");
    expect(api.updateStaffTicketPriority).toHaveBeenCalledWith(101, "URGENT");
    expect(screen.getByText("Current IT Priority:").textContent).toContain("URGENT");
    const status = screen.getByRole("option", { name: "IN_PROGRESS" }).closest("select")!;
    fireEvent.change(status, { target: { value: "IN_PROGRESS" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Status" }));
    await screen.findByText("Ticket status updated successfully.");
    expect(api.updateStaffTicketStatus).toHaveBeenCalledWith(101, "IN_PROGRESS");
    expect(screen.getByText("Current Ticket Status:").textContent).toContain("IN_PROGRESS");
    await screen.findByText("Internal Notes");
    expect(api.getTicketDetail).not.toHaveBeenCalled();
  });
  it("shows claim failures in the staff UI", async () => {
    vi.mocked(api.claimStaffTicket).mockRejectedValue(new Error("Server unavailable"));
    await openAsStaff(10);
    fireEvent.click(screen.getByRole("button", { name: "Claim Ticket" }));
    await screen.findByText("Server unavailable");
  });
  it("staff can select and upload an attachment without a Requester selection", async () => {
    await openAsStaff(10);
    const file = new File(["evidence"], "evidence.pdf", { type: "application/pdf" });
    fireEvent.change(document.getElementById("detail-attachment")!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /Upload/i }));
    await waitFor(() => expect(api.uploadTicketAttachment).toHaveBeenCalledWith(101, 0, file));
    await screen.findByText("Attachment uploaded successfully.");
  });
});
