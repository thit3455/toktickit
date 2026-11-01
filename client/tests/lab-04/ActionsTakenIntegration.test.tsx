import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";
import * as api from "../../src/api";
import { action, list } from "./fixtures";

vi.mock("../../src/api");
const ticket: api.TicketDetail = { id: 101, ticketNumber: "UI-101", requesterId: 1, categoryId: 1, relatedSystemId: 1, summary: "Printer unavailable", description: "Office printer cannot connect", requestedPriority: "HIGH", currentStatus: "OPEN", createdAt: action.createdAt, updatedAt: action.updatedAt, category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Office" }, requester: { id: 1, name: "Requester" } };
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));
  vi.mocked(api.getCurrentUser).mockResolvedValue({ id: 99, name: "Administrator", email: "admin@example.test", role: "ADMINISTRATOR", mustChangePassword: false });
  vi.mocked(api.getAdminUsers).mockResolvedValue([]);
  vi.mocked(api.getCategories).mockResolvedValue([ticket.category]); vi.mocked(api.getRelatedSystems).mockResolvedValue([ticket.relatedSystem]);
  vi.mocked(api.getStaffTickets).mockResolvedValue({ data: [{ ...ticket, requester: { ...ticket.requester, email: "requester@example.test" }, itPriority: "MEDIUM", assignedStaff: null }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } });
  vi.mocked(api.getTicketDetail).mockResolvedValue(ticket); vi.mocked(api.getTicketAttachments).mockResolvedValue([]);
  vi.mocked(api.getActionTicketSummary).mockResolvedValue({ id: ticket.id, currentStatus: ticket.currentStatus, updatedAt: ticket.updatedAt });
  vi.mocked(api.getActionsTaken).mockResolvedValue(list());
  vi.mocked(api.getActionAssignees).mockResolvedValue([{ id: 20, name: "Assignee", email: "staff@example.test" }]);
  vi.mocked(api.patchActionTaken).mockResolvedValue({ action: { ...action, result: "Fixed", status: "COMPLETED", performedBy: { id: 99, name: "Administrator" }, completedAt: action.updatedAt }, ticketVersion: 4 });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function openAdminTicket() {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "IT Staff Queue" }));
  fireEvent.click(await screen.findByRole("button", { name: "Open UI-101" }));
  await screen.findByRole("heading", { name: "Actions Taken" });
}
describe("Actions Taken in the existing application", () => {
  it("lets Admin navigate queue/detail/actions without exposing Ticket write controls", async () => {
    await openAdminTicket();
    expect(screen.getByRole("button", { name: "IT Staff Queue" })).toHaveClass("btn-success");
    expect(api.getTicketDetail).toHaveBeenCalledWith(101, 0); expect(api.getStaffTicketDetail).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Claim Ticket|Reassign Ticket|Update IT Priority|Update Status|Problem Appears Resolved/ })).toBeNull();
    expect(await screen.findByRole("button", { name: "Complete action #41" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Back to IT Staff Queue" }));
    await screen.findByRole("heading", { name: "IT Staff Ticket Queue" });
  });
  it("refreshes after an action save without unmounting Public Comment/Internal Note drafts", async () => {
    await openAdminTicket();
    fireEvent.change(screen.getByLabelText("New public comment"), { target: { value: "Unsent public draft" } });
    fireEvent.change(screen.getByLabelText("New internal note"), { target: { value: "Unsent private draft" } });
    fireEvent.click(await screen.findByRole("button", { name: "Complete action #41" }));
    fireEvent.change(screen.getByLabelText("Result *"), { target: { value: "Fixed" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save action" })));
    await waitFor(() => expect(api.getActionTicketSummary).toHaveBeenCalledWith(101));
    expect(screen.getByLabelText("New public comment")).toHaveValue("Unsent public draft"); expect(screen.getByLabelText("New internal note")).toHaveValue("Unsent private draft");
    expect(api.claimStaffTicket).not.toHaveBeenCalled(); expect(api.updateStaffTicketStatus).not.toHaveBeenCalled();
  });
});
