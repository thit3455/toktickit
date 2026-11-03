import "../lab-04/mock-dashboard-navigation";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";
import * as api from "../../src/api";
import * as workflow from "../../src/ticket-workflow.api";
import { workflowTicket, matrix, ticketHistory } from "../lab-04/workflow-fixtures";
vi.mock("../../src/api");
vi.mock("../../src/ticket-workflow.api", async original => ({ ...await original<typeof workflow>(), getWorkflowTicket: vi.fn(), changeTicket: vi.fn(), getTicketHistory: vi.fn() }));
const ticket = workflowTicket({ ticketNumber: "STAFF-101", currentStatus: "NEW", assignedStaffId: null, assignedStaff: null });
const people = [{ id: 10, name: "Zig", email: "zig@example.test" }, { id: 20, name: "Michael Brown", email: "michael@example.test" }];
let current = { ...ticket };
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); current = { ...ticket };
  vi.mocked(api.getActionsTaken).mockImplementation(async ticketId => ({ ticketId, ticketVersion: current.version, items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }));
  vi.mocked(api.getActionAssignees).mockResolvedValue(people);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));
  vi.mocked(api.getCurrentUser).mockResolvedValue(null);
  vi.mocked(api.getCategories).mockResolvedValue([]); vi.mocked(api.getRelatedSystems).mockResolvedValue([]);
  vi.mocked(api.getStaffTickets).mockImplementation(async () => ({ data: [current as api.StaffTicket], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }));
  vi.mocked(api.getStaffTicketDetail).mockImplementation(async () => current);
  vi.mocked(api.getTicketAttachments).mockResolvedValue([]);
  vi.mocked(workflow.getWorkflowTicket).mockImplementation(async () => current);
  vi.mocked(workflow.getTicketHistory).mockResolvedValue(ticketHistory);
  vi.mocked(workflow.changeTicket).mockImplementation(async (_, change) => {
    if (change.kind === "assign") { const owner = people.find(p => p.id === (change.assignedStaffId ?? 10))!; current = { ...current, assignedStaffId: owner.id, assignedStaff: owner }; }
    if (change.kind === "priority") current = { ...current, itPriority: change.itPriority };
    if (change.kind === "status") current = { ...current, currentStatus: change.currentStatus, allowedTicketTransitions: matrix[change.currentStatus] };
    current = { ...current, version: current.version + 1 }; return current;
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function openAsStaff(id: number) {
  vi.mocked(api.login).mockResolvedValue({ data: { sessionId: "test", user: { id, name: `Staff ${id}`, email: `staff${id}@example.test`, role: "IT_STAFF", mustChangePassword: false } } });
  const view = render(<App />);
  fireEvent.change(await screen.findByRole("textbox"), { target: { value: `staff${id}@example.test` } });
  fireEvent.change(view.container.querySelector('input[type="password"]')!, { target: { value: "TestPassword123!" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  fireEvent.click(await screen.findByRole("button", { name: "IT Staff Queue" }));
  fireEvent.click(await screen.findByRole("button", { name: "Open STAFF-101" }));
  await screen.findByRole("button", { name: "Update Status" }); return view;
}
async function status(value: api.TicketStatus) {
  fireEvent.click(screen.getByRole("button", { name: "Update Status" }));
  fireEvent.change(await screen.findByLabelText("Status *"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Save Ticket change" }));
  await waitFor(() => expect(screen.getByText(/Current Ticket status:/)).toHaveTextContent(value.replaceAll("_", " ")));
}
describe("IT Staff app workflow with the approved I4 contract", () => {
  it("retains the requester indication without automatic transitions, then explicitly resolves/closes", async () => {
    current = { ...workflowTicket({ ...ticket, currentStatus: "OPEN", allowedTicketTransitions: matrix.OPEN }), requesterResolvedAt: "2026-10-01T08:30:00Z" };
    await openAsStaff(10);
    const notice = screen.getByRole("region", { name: "Requester resolution indication" });
    expect(notice.querySelector("time")).toHaveAttribute("datetime", current.requesterResolvedAt);
    expect(workflow.changeTicket).not.toHaveBeenCalled(); expect(api.indicateResolution).not.toHaveBeenCalled();
    await status("RESOLVED"); expect(workflow.changeTicket).toHaveBeenLastCalledWith(101, { kind: "status", currentStatus: "RESOLVED", expectedTicketVersion: 3 });
    await status("CLOSED"); expect(workflow.changeTicket).toHaveBeenLastCalledWith(101, { kind: "status", currentStatus: "CLOSED", expectedTicketVersion: 4 });
  });
  it.each([null, undefined])("hides an absent requester indication (%s)", async requesterResolvedAt => {
    current = { ...current, requesterResolvedAt }; await openAsStaff(10);
    expect(screen.queryByRole("region", { name: "Requester resolution indication" })).toBeNull();
  });
  it("does not carry an indication into another Ticket", async () => {
    current = { ...current, requesterResolvedAt: "2026-10-01T08:30:00Z" };
    const other = { ...ticket, id: 102, ticketNumber: "STAFF-102", requesterResolvedAt: null };
    vi.mocked(api.getStaffTickets).mockResolvedValue({ data: [current as api.StaffTicket, other as api.StaffTicket], pagination: { page: 1, limit: 10, total: 2, totalPages: 1 } });
    vi.mocked(api.getStaffTicketDetail).mockImplementation(async id => id === 101 ? current : other);
    vi.mocked(workflow.getWorkflowTicket).mockImplementation(async id => id === 101 ? current : other);
    await openAsStaff(10); expect(screen.getByRole("region", { name: "Requester resolution indication" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to IT Staff Queue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open STAFF-102" }));
    await screen.findByDisplayValue("STAFF-102"); expect(screen.queryByRole("region", { name: "Requester resolution indication" })).toBeNull();
  });
  it("saves reassignment and retains it in detail, queue and reload", async () => {
    current = { ...current, assignedStaffId: 20, assignedStaff: people[1] }; const view = await openAsStaff(10);
    fireEvent.click(screen.getByRole("button", { name: "Reassign Ticket" }));
    fireEvent.change(await screen.findByLabelText("Reassign to *"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Ticket change" }));
    await screen.findByText("Ticket reassigned successfully.");
    expect(workflow.changeTicket).toHaveBeenCalledWith(101, { kind: "assign", assignedStaffId: 10, expectedTicketVersion: 3 });
    expect(screen.getByText(/Ticket Owner:/)).toHaveTextContent("Zig");
    fireEvent.click(screen.getByRole("button", { name: "Back to IT Staff Queue" })); await screen.findByRole("cell", { name: "Zig" });
    view.unmount(); await openAsStaff(10); expect(screen.getByText(/Ticket Owner:/)).toHaveTextContent("Zig");
  });
  it("requires explicit refresh/review for a stale claim", async () => {
    vi.mocked(workflow.changeTicket).mockRejectedValueOnce(new workflow.WorkflowError(409, "STALE_UPDATE"));
    await openAsStaff(10); fireEvent.click(screen.getByRole("button", { name: "Claim Ticket" }));
    await screen.findByRole("button", { name: "Refresh current Ticket" });
    current = { ...current, assignedStaffId: 20, assignedStaff: people[1], version: 4 };
    fireEvent.click(screen.getByRole("button", { name: "Refresh current Ticket" }));
    await screen.findByText(/Status: NEW. Owner: Michael Brown/);
    expect(workflow.changeTicket).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Keep draft and use refreshed Ticket version" }));
    expect(screen.getByText(/no longer permits this operation/)).toBeInTheDocument();
    expect(screen.getByText(/Ticket Owner:/)).toHaveTextContent("Michael Brown");
  });
  it("keeps owner and draft on failed reassignment", async () => {
    current = { ...current, assignedStaffId: 20, assignedStaff: people[1] };
    vi.mocked(workflow.changeTicket).mockRejectedValueOnce(new workflow.WorkflowError(400, "INVALID_STAFF_ID"));
    await openAsStaff(10); fireEvent.click(screen.getByRole("button", { name: "Reassign Ticket" }));
    fireEvent.change(await screen.findByLabelText("Reassign to *"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Ticket change" }));
    await screen.findByText("Check the required fields and current owner eligibility.");
    expect(screen.getByText(/Ticket Owner:/)).toHaveTextContent("Michael Brown"); expect(screen.getByLabelText("Reassign to *")).toHaveValue("10");
  });
  it("retries an unavailable active staff list", async () => {
    vi.mocked(api.getActionAssignees).mockRejectedValueOnce(new Error("Offline")); await openAsStaff(10);
    fireEvent.click(screen.getByRole("button", { name: "Assign Ticket" }));
    await screen.findByText("Unable to load active IT Staff. Retry the staff list.");
    fireEvent.click(screen.getByRole("button", { name: "Retry staff list" }));
    await screen.findByRole("option", { name: "Zig (zig@example.test)" });
  });
  it.each([10, 20])("staff %s claims and performs valid versioned priority/status operations", async id => {
    await openAsStaff(id);
    fireEvent.click(screen.getByRole("button", { name: "Claim Ticket" })); await screen.findByText("Ticket claimed successfully.");
    expect(workflow.changeTicket).toHaveBeenLastCalledWith(101, { kind: "assign", expectedTicketVersion: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Update IT Priority" }));
    fireEvent.change(screen.getByLabelText("IT Priority *"), { target: { value: "URGENT" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Ticket change" })); await screen.findByText("IT priority updated successfully.");
    expect(workflow.changeTicket).toHaveBeenLastCalledWith(101, { kind: "priority", itPriority: "URGENT", expectedTicketVersion: 4 });
    await status("OPEN"); await status("IN_PROGRESS"); expect(current.version).toBe(7);
    expect(screen.getByText(/Ticket Owner:/)).toHaveTextContent("URGENT"); await screen.findByText("Internal Notes");
    expect(api.getTicketDetail).not.toHaveBeenCalled();
  });
  it("shows claim failure without discarding the review", async () => {
    vi.mocked(workflow.changeTicket).mockRejectedValueOnce(new workflow.WorkflowError(500, "INTERNAL_ERROR"));
    await openAsStaff(10); fireEvent.click(screen.getByRole("button", { name: "Claim Ticket" }));
    await screen.findByText("Unable to complete the Ticket workflow request. Please try again."); expect(screen.getByRole("form", { name: "Ticket workflow editor" })).toBeInTheDocument();
  });
  it("preserves staff attachment upload without Requester selection", async () => {
    await openAsStaff(10); const file = new File(["evidence"], "evidence.pdf", { type: "application/pdf" });
    fireEvent.change(document.getElementById("detail-attachment")!, { target: { files: [file] } }); fireEvent.click(screen.getByRole("button", { name: /Upload/i }));
    await waitFor(() => expect(api.uploadTicketAttachment).toHaveBeenCalledWith(101, 0, file)); await screen.findByText("Attachment uploaded successfully.");
  });
});
