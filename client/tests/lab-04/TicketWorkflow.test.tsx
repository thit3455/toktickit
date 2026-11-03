import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TicketWorkflow } from "../../src/TicketWorkflow";
import * as workflow from "../../src/ticket-workflow.api";
import * as api from "../../src/api";
import { ticketHistory, workflowTicket } from "./workflow-fixtures";

vi.mock("../../src/ticket-workflow.api", async original => ({ ...await original<typeof workflow>(), getWorkflowTicket: vi.fn(), changeTicket: vi.fn(), getTicketHistory: vi.fn() }));
vi.mock("../../src/api", async original => ({ ...await original<typeof api>(), getActionAssignees: vi.fn() }));
const onTicketUpdated = vi.fn(), onMutated = vi.fn(), onAccessFailure = vi.fn();
const props = { ticketId: 101, role: "IT_STAFF" as const, onTicketUpdated, onMutated, onAccessFailure };
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(workflow.getWorkflowTicket).mockReset().mockResolvedValue(workflowTicket());
  vi.mocked(workflow.changeTicket).mockReset().mockResolvedValue(workflowTicket({ version: 4, currentStatus: "IN_PROGRESS" }));
  vi.mocked(workflow.getTicketHistory).mockReset().mockResolvedValue(ticketHistory);
  vi.mocked(api.getActionAssignees).mockReset().mockResolvedValue([{ id: 20, name: "Original owner", email: "owner-staff@example.test" }, { id: 30, name: "Other worker", email: "worker@example.test" }]);
});
afterEach(cleanup);
async function openStatus() { fireEvent.click(await screen.findByRole("button", { name: "Update Status" })); }
async function save() { await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save Ticket change" })); }); }
describe("Ticket Workflow component (UI-03, I4 AC-01–06)", () => {
  it("shows real loading and safely retries an unavailable workflow", async () => {
    vi.mocked(workflow.getWorkflowTicket).mockRejectedValueOnce(new workflow.WorkflowError(500, "SERVER_ERROR"));
    render(<TicketWorkflow {...props} />);
    expect(screen.getByText("Loading Ticket workflow...")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Retry workflow" }));
    await screen.findByRole("button", { name: "Update Status" });
    expect(onMutated).not.toHaveBeenCalled();
  });
  it.each(["IT_STAFF", "ADMINISTRATOR"] as const)("shows only server-permitted transitions for %s", async role => {
    render(<TicketWorkflow {...props} role={role} />); await openStatus();
    const select = screen.getByLabelText("Status *");
    expect(within(select).getAllByRole("option").map(o => (o as HTMLOptionElement).value)).toEqual(["", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
    expect(screen.queryByRole("option", { name: "NEW" })).toBeNull();
    expect(screen.queryByRole("option", { name: "CLOSED" })).toBeNull();
  });
  it("explains all resolution blockers and disables gated choices without adding fields", async () => {
    vi.mocked(workflow.getWorkflowTicket).mockResolvedValue(workflowTicket({ resolutionGate: { eligible: false, blockers: ["OWNER_REQUIRED", "COMPLETED_RESULT_REQUIRED", "ACTIVE_ACTIONS", "FOLLOW_UP_REQUIRED"] } }));
    render(<TicketWorkflow {...props} />); await openStatus();
    expect(screen.getByRole("option", { name: /RESOLVED/ })).toBeDisabled();
    expect(screen.getByText("Assign a Ticket Owner.")).toBeInTheDocument();
    expect(screen.getByText("Complete or cancel all Planned and In Progress actions.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Resolution")).toBeNull();
    await save(); expect(workflow.changeTicket).not.toHaveBeenCalled();
  });
  it("submits the captured version and updates Ticket/actions only after success", async () => {
    render(<TicketWorkflow {...props} />); await openStatus(); change("Status *", "IN_PROGRESS"); await save();
    await screen.findByText("Ticket status updated successfully.");
    expect(workflow.changeTicket).toHaveBeenCalledWith(101, { kind: "status", expectedTicketVersion: 3, currentStatus: "IN_PROGRESS" });
    expect(onMutated).toHaveBeenCalledOnce(); expect(onTicketUpdated).toHaveBeenLastCalledWith(expect.objectContaining({ version: 4, currentStatus: "IN_PROGRESS" }));
  });
  it("requires a reason and confirms Ticket cancellation without deleting evidence", async () => {
    vi.mocked(workflow.changeTicket).mockResolvedValue(workflowTicket({ version: 4, currentStatus: "CANCELLED" }));
    render(<TicketWorkflow {...props} />); await openStatus(); change("Status *", "CANCELLED");
    fireEvent.click(screen.getByRole("button", { name: "Confirm Ticket cancellation" }));
    expect(workflow.changeTicket).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText("Cancellation reason *")).toHaveFocus());
    expect(screen.getByText(/Cancellation retains completed actions/)).toBeInTheDocument();
    change("Cancellation reason *", "  Duplicate synthetic work  ");
    fireEvent.click(screen.getByRole("button", { name: "Confirm Ticket cancellation" }));
    await screen.findByText("Ticket status updated successfully.");
    expect(workflow.changeTicket).toHaveBeenCalledWith(101, { kind: "status", expectedTicketVersion: 3, currentStatus: "CANCELLED", reason: "Duplicate synthetic work" });
    expect(screen.getByRole("button", { name: "Update Status" })).toBeDisabled();
  });
  it("requires reopening reason and labels old requester indication as historical", async () => {
    vi.mocked(workflow.getWorkflowTicket).mockResolvedValue(workflowTicket({ currentStatus: "CLOSED", requesterResolvedAt: "2026-10-31T01:00:00Z" }));
    vi.mocked(workflow.changeTicket).mockResolvedValue(workflowTicket({ currentStatus: "REOPENED", version: 4, requesterResolvedAt: "2026-10-31T01:00:00Z" }));
    render(<TicketWorkflow {...props} />); await openStatus(); change("Status *", "REOPENED");
    await save(); expect(workflow.changeTicket).not.toHaveBeenCalled();
    change("Reopening reason *", "Returned connection failure"); await save();
    await screen.findByText(/Historical indication; this is not fresh confirmation/);
    expect(workflow.changeTicket).toHaveBeenCalledWith(101, { kind: "status", expectedTicketVersion: 3, currentStatus: "REOPENED", reason: "Returned connection failure" });
  });
  it("permits Admin explicit assignment but never offers implicit self-claim", async () => {
    vi.mocked(workflow.getWorkflowTicket).mockResolvedValue(workflowTicket({ assignedStaffId: null, assignedStaff: null }));
    render(<TicketWorkflow {...props} role="ADMINISTRATOR" />);
    fireEvent.click(await screen.findByRole("button", { name: "Assign Ticket" }));
    expect(screen.queryByRole("button", { name: "Claim Ticket" })).toBeNull();
    await screen.findByRole("option", { name: "Other worker (worker@example.test)" });
    change("Reassign to *", "30"); await save();
    expect(workflow.changeTicket).toHaveBeenCalledWith(101, { kind: "assign", expectedTicketVersion: 3, assignedStaffId: 30 });
  });
  it("claims as Staff with a mandatory Ticket version", async () => {
    vi.mocked(workflow.getWorkflowTicket).mockResolvedValue(workflowTicket({ assignedStaffId: null, assignedStaff: null }));
    render(<TicketWorkflow {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Claim Ticket" }));
    await screen.findByText("Ticket claimed successfully.");
    expect(workflow.changeTicket).toHaveBeenCalledWith(101, { kind: "assign", expectedTicketVersion: 3 });
  });
  it("updates priority with a version and prevents no-effective-change requests", async () => {
    render(<TicketWorkflow {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Update IT Priority" }));
    change("IT Priority *", "MEDIUM"); expect(screen.getByRole("button", { name: "Save Ticket change" })).toBeDisabled();
    change("IT Priority *", "URGENT"); await save();
    expect(workflow.changeTicket).toHaveBeenCalledWith(101, { kind: "priority", expectedTicketVersion: 3, itPriority: "URGENT" });
  });
  it.each(["RESOLVED", "CLOSED", "CANCELLED"] as const)("preserves permitted ownership/priority maintenance on %s", async currentStatus => {
    vi.mocked(workflow.getWorkflowTicket).mockResolvedValue(workflowTicket({ currentStatus }));
    render(<TicketWorkflow {...props} />);
    expect(await screen.findByText(/Actions Taken are read-only/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reassign Ticket" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Update IT Priority" })).toBeEnabled();
    if (currentStatus === "CANCELLED") expect(screen.getByRole("button", { name: "Update Status" })).toBeDisabled();
    else { await openStatus(); expect(screen.getByRole("option", { name: "REOPENED" })).toBeEnabled(); }
  });
  it("preserves stale draft and requires explicit refresh/review/reapply", async () => {
    vi.mocked(workflow.changeTicket).mockRejectedValueOnce(new workflow.WorkflowError(409, "STALE_UPDATE")).mockResolvedValueOnce(workflowTicket({ version: 5, currentStatus: "IN_PROGRESS" }));
    render(<TicketWorkflow {...props} />); await openStatus(); change("Status *", "IN_PROGRESS"); await save();
    await screen.findByRole("button", { name: "Refresh current Ticket" });
    expect(screen.getByLabelText("Status *")).toHaveValue("IN_PROGRESS"); expect(screen.getByRole("button", { name: "Save Ticket change" })).toBeDisabled();
    vi.mocked(workflow.getWorkflowTicket).mockResolvedValue(workflowTicket({ version: 4, currentStatus: "WAITING_FOR_REQUESTER" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh current Ticket" }));
    await screen.findByRole("heading", { name: "Current saved Ticket" }); expect(workflow.changeTicket).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Keep draft and use refreshed Ticket version" })); await save();
    expect(workflow.changeTicket).toHaveBeenLastCalledWith(101, { kind: "status", expectedTicketVersion: 4, currentStatus: "IN_PROGRESS" });
  });
  it("never re-enables an obsolete status after reviewing a terminal Ticket", async () => {
    vi.mocked(workflow.changeTicket).mockRejectedValueOnce(new workflow.WorkflowError(409, "STALE_UPDATE"));
    render(<TicketWorkflow {...props} />); await openStatus(); change("Status *", "IN_PROGRESS"); await save();
    vi.mocked(workflow.getWorkflowTicket).mockResolvedValue(workflowTicket({ version: 4, currentStatus: "CANCELLED" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh current Ticket" }));
    fireEvent.click(await screen.findByRole("button", { name: "Keep draft and use refreshed Ticket version" }));
    expect(screen.getByRole("button", { name: "Save Ticket change" })).toBeDisabled(); expect(screen.getByText(/no longer permits this operation/)).toBeInTheDocument();
  });
  it("background reads preserve the original expected version and draft", async () => {
    const view = render(<TicketWorkflow {...props} />); await openStatus(); change("Status *", "WAITING_FOR_REQUESTER");
    vi.mocked(workflow.getWorkflowTicket).mockResolvedValue(workflowTicket({ version: 9 }));
    view.rerender(<TicketWorkflow {...props} refreshKey={1} />);
    await waitFor(() => expect(onTicketUpdated).toHaveBeenLastCalledWith(expect.objectContaining({ version: 9 })));
    expect(screen.getByLabelText("Status *")).toHaveValue("WAITING_FOR_REQUESTER"); await save();
    expect(workflow.changeTicket).toHaveBeenCalledWith(101, { kind: "status", expectedTicketVersion: 3, currentStatus: "WAITING_FOR_REQUESTER" });
  });
  it.each([0, 400, 404, 500])("retains cancellation draft after HTTP %s", async status => {
    vi.mocked(workflow.changeTicket).mockRejectedValueOnce(new workflow.WorkflowError(status, "REQUEST_FAILED"));
    render(<TicketWorkflow {...props} />); await openStatus(); change("Status *", "CANCELLED"); change("Cancellation reason *", "Keep this entered reason");
    fireEvent.click(screen.getByRole("button", { name: "Confirm Ticket cancellation" }));
    await screen.findByRole("alert"); expect(screen.getByLabelText("Cancellation reason *")).toHaveValue("Keep this entered reason"); expect(onMutated).not.toHaveBeenCalled();
  });
  it.each([401, 403])("clears protected state on HTTP %s", async status => {
    vi.mocked(workflow.changeTicket).mockRejectedValueOnce(new workflow.WorkflowError(status, "PASSWORD_CHANGE_REQUIRED"));
    render(<TicketWorkflow {...props} />); await openStatus(); change("Status *", "IN_PROGRESS"); await save();
    await waitFor(() => expect(onAccessFailure).toHaveBeenCalledWith("PASSWORD_CHANGE_REQUIRED"));
    expect(screen.queryByRole("form", { name: "Ticket workflow editor" })).toBeNull(); expect(screen.queryByText(/Ticket Owner:/)).toBeNull();
  });
  it("clears protected state on staff lookup auth loss", async () => {
    vi.mocked(api.getActionAssignees).mockRejectedValueOnce(new api.ActionsApiError(403, "PASSWORD_CHANGE_REQUIRED"));
    render(<TicketWorkflow {...props} />);
    await waitFor(() => expect(onAccessFailure).toHaveBeenCalledWith("PASSWORD_CHANGE_REQUIRED"));
  });
  it("loads empty immutable history and retries safe history errors", async () => {
    vi.mocked(workflow.getTicketHistory).mockRejectedValueOnce(new workflow.WorkflowError(500, "SERVER_ERROR")).mockResolvedValueOnce(ticketHistory);
    render(<TicketWorkflow {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Ticket status history" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry Ticket history" }));
    const region = screen.getByRole("region", { name: "Private Ticket status history" });
    expect(await within(region).findByText(/Recorded operator/)).toBeInTheDocument();
    expect(within(region).queryByRole("button", { name: /Edit|Delete/ })).toBeNull();
  });
  it("explains missing legacy history without fabricating entries", async () => {
    vi.mocked(workflow.getTicketHistory).mockResolvedValue({ ...ticketHistory, items: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    render(<TicketWorkflow {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Ticket status history" }));
    await screen.findByText("No status events recorded. Legacy history is not fabricated.");
  });
  it("returns keyboard focus when cancelling the editor", async () => {
    render(<TicketWorkflow {...props} />); const opener = await screen.findByRole("button", { name: "Update Status" });
    fireEvent.click(opener); await waitFor(() => expect(screen.getByLabelText("Status *")).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Cancel Ticket editing" })); expect(opener).toHaveFocus(); expect(workflow.changeTicket).not.toHaveBeenCalled();
  });
  it("guards duplicate submits before the busy render", async () => {
    vi.mocked(workflow.changeTicket).mockImplementationOnce(() => new Promise(() => {}));
    render(<TicketWorkflow {...props} />); await openStatus(); change("Status *", "IN_PROGRESS");
    const form = screen.getByRole("form", { name: "Ticket workflow editor" });
    await act(async () => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(workflow.changeTicket).toHaveBeenCalledOnce(); expect(screen.getByRole("button", { name: "Saving Ticket..." })).toBeDisabled();
  });
});
