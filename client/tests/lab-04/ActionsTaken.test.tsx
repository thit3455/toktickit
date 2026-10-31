import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ActionsTaken } from "../../src/ActionsTaken";
import * as api from "../../src/api";
import { action, history, list } from "./fixtures";

vi.mock("../../src/api", async importOriginal => {
  const original = await importOriginal<typeof api>();
  return { ...original, getActionsTaken: vi.fn(), getActionAssignees: vi.fn(), getActionHistory: vi.fn(), createActionTaken: vi.fn(), patchActionTaken: vi.fn() };
});
const onRefreshTicket = vi.fn(); const onAccessFailure = vi.fn();
const props = { ticketId: 101, ticketStatus: "OPEN", role: "IT_STAFF" as api.AccountRole, userName: "Completing operator", onRefreshTicket, onAccessFailure };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getActionsTaken).mockReset().mockResolvedValue(list());
  vi.mocked(api.getActionAssignees).mockReset().mockResolvedValue([{ id: 20, name: "Assignee", email: "assignee@example.test" }, { id: 30, name: "Other staff", email: "other@example.test" }]);
  vi.mocked(api.getActionHistory).mockReset().mockResolvedValue(history);
  vi.mocked(api.createActionTaken).mockReset().mockResolvedValue({ action, ticketVersion: 4, replayed: false });
  vi.mocked(api.patchActionTaken).mockReset().mockResolvedValue({ action, ticketVersion: 4 });
  onRefreshTicket.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
async function openCreate() {
  fireEvent.click(await screen.findByRole("button", { name: "Record action" }));
  await waitFor(() => expect(screen.getByLabelText("Assigned to *")).toBeEnabled());
  change("Action Description *", "Inspect router"); change("Assigned to *", "30");
}
async function save() { await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save action" })); }); }

describe("Actions Taken component", () => {
  it("shows loading without a false empty state", async () => {
    let resolve!: (value: api.ActionList) => void;
    vi.mocked(api.getActionsTaken).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    render(<ActionsTaken {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Actions Taken"); expect(screen.queryByText("No Actions Taken recorded yet.")).toBeNull();
    await act(async () => resolve(list([])));
    expect(await screen.findByText("No Actions Taken recorded yet.")).toBeInTheDocument();
  });
  it("preserves server order and renders all shared fields and Bangkok times as plain text", async () => {
    const cancelled = { ...action, id: 42, description: "<img src=x onerror=alert(1)>", status: "CANCELLED" as const, cancelledAt: action.createdAt, cancellationReason: "Duplicate work" };
    vi.mocked(api.getActionsTaken).mockResolvedValue(list([action, cancelled]));
    const { container } = render(<ActionsTaken {...props} role="REQUESTER" />);
    await screen.findByText(action.description);
    expect(screen.getAllByRole("row").slice(1).map(row => row.textContent)).toEqual([expect.stringContaining("Action #41"), expect.stringContaining("Action #42")]);
    expect(screen.getAllByText(/31 Oct 2026, 01:05:06/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("View action #42 details"));
    expect(screen.getByText("Duplicate work")).toBeVisible(); expect(screen.getByText(cancelled.description)).toBeVisible(); expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("button", { name: /Record|Edit|Complete|Cancel|History/ })).toBeNull();
    expect(api.getActionAssignees).not.toHaveBeenCalled(); expect(api.getActionHistory).not.toHaveBeenCalled();
  });
  it.each(["IT_STAFF", "ADMINISTRATOR"] as const)("creates as %s without forged identities", async role => {
    render(<ActionsTaken {...props} role={role} />); await openCreate();
    fireEvent.click(screen.getByLabelText("Follow-Up Required?"));
    await save(); expect(api.createActionTaken).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Follow-up Note *")).toHaveAttribute("aria-invalid", "true");
    change("Follow-up Note *", "Confirm tomorrow"); await save();
    await waitFor(() => expect(api.createActionTaken).toHaveBeenCalledOnce());
    const input = vi.mocked(api.createActionTaken).mock.calls[0][1];
    expect(input).toMatchObject({ expectedTicketVersion: 3, assignedToId: 30, description: "Inspect router", followUpRequired: true, followUpNote: "Confirm tomorrow" });
    expect(input.requestId).toMatch(/^[a-f0-9-]{36}$/); expect(input).not.toHaveProperty("performedById"); expect(input).not.toHaveProperty("createdById");
    await screen.findByText("Action #41 saved."); expect(onRefreshTicket).toHaveBeenCalledOnce();
  });
  it("locks duplicate clicks and retries an ambiguous creation with exactly the original input", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(api.createActionTaken).mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValueOnce({ action, ticketVersion: 4, replayed: true });
    render(<ActionsTaken {...props} />); await openCreate(); await save();
    expect(screen.getByRole("button", { name: "Saving action..." })).toBeDisabled();
    await act(async () => reject(new api.ActionsApiError(0, "NETWORK_ERROR")));
    expect(screen.getByLabelText("Action Description *")).toBeDisabled();
    fireEvent.click(await screen.findByRole("button", { name: "Retry original creation" }));
    await screen.findByText("Action #41 confirmed from the original request.");
    expect(api.createActionTaken).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.createActionTaken).mock.calls[1]).toEqual(vi.mocked(api.createActionTaken).mock.calls[0]);
    expect(api.getActionsTaken).toHaveBeenCalledTimes(2);
  });
  it("edits content and assignment with both original versions", async () => {
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Edit action #41" }));
    change("Action Description *", "Inspected router"); change("Assigned to *", "30"); await save();
    await waitFor(() => expect(api.patchActionTaken).toHaveBeenCalledWith(101, 41, { expectedVersion: 1, expectedTicketVersion: 3, description: "Inspected router", assignedToId: 30 }));
  });
  it("does not submit an unchanged edit", async () => {
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Edit action #41" })); await save();
    expect(await screen.findByText("There are no changes to save.")).toBeInTheDocument(); expect(api.patchActionTaken).not.toHaveBeenCalled();
  });
  it("requires Result for completion and uses the signed-in performer", async () => {
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Complete action #41" }));
    expect(screen.getByText(/actual performer will be Completing operator/)).toBeInTheDocument(); await save();
    expect(api.patchActionTaken).not.toHaveBeenCalled(); change("Result *", "Connection restored"); await save();
    await waitFor(() => expect(api.patchActionTaken).toHaveBeenCalledWith(101, 41, { expectedVersion: 1, expectedTicketVersion: 3, result: "Connection restored", status: "COMPLETED" }));
  });
  it("starts Planned actions", async () => {
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Start action #41" })); await save();
    await waitFor(() => expect(api.patchActionTaken).toHaveBeenCalledWith(101, 41, { expectedVersion: 1, expectedTicketVersion: 3, status: "IN_PROGRESS" }));
  });
  it("keeps cancellation available with an ineligible assignee and requires a reason", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue(list([{ ...action, assignedTo: { ...action.assignedTo, isActive: false } }]));
    render(<ActionsTaken {...props} />);
    expect(await screen.findByRole("button", { name: "Complete action #41" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start action #41" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel action #41" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm cancellation" })); expect(api.patchActionTaken).not.toHaveBeenCalled();
    change("Cancellation reason *", "No longer required"); fireEvent.click(screen.getByRole("button", { name: "Confirm cancellation" }));
    await waitFor(() => expect(api.patchActionTaken).toHaveBeenCalledWith(101, 41, { expectedVersion: 1, expectedTicketVersion: 3, status: "CANCELLED", reason: "No longer required" }));
  });
  it("cancels editing without a request and returns focus", async () => {
    render(<ActionsTaken {...props} />); const button = await screen.findByRole("button", { name: "Edit action #41" }); button.focus(); fireEvent.click(button);
    change("Action Description *", "Draft only"); fireEvent.click(screen.getByRole("button", { name: "Cancel editing" }));
    expect(api.patchActionTaken).not.toHaveBeenCalled(); expect(button).toHaveFocus();
    fireEvent.click(button); expect(screen.getByLabelText("Action Description *")).toHaveValue(action.description);
  });
  it.each([
    ["Record action", "Cancel editing"],
    ["Edit action #41", "Cancel editing"],
    ["Cancel action #41", "Keep action"],
  ])("returns focus to the opening control %s when the click did not focus it", async (opening, closing) => {
    render(<ActionsTaken {...props} />);
    const historyButton = await screen.findByRole("button", { name: "History for action #41" });
    historyButton.focus();
    const opener = screen.getByRole("button", { name: opening });
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: closing }));
    expect(opener).toHaveFocus();
    expect(api.createActionTaken).not.toHaveBeenCalled(); expect(api.patchActionTaken).not.toHaveBeenCalled();
  });
  it("permits completed content correction while freezing assignment and lifecycle", async () => {
    const completed = { ...action, status: "COMPLETED" as const, result: "Fixed", completedAt: action.createdAt, performedBy: { id: 99, name: "Actual performer" } };
    vi.mocked(api.getActionsTaken).mockResolvedValue(list([completed])); render(<ActionsTaken {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Correct action #41" }));
    expect(screen.getByLabelText("Assigned to *")).toBeDisabled(); change("Result *", "Verified fixed"); await save();
    await waitFor(() => expect(api.patchActionTaken).toHaveBeenCalledWith(101, 41, { expectedVersion: 1, expectedTicketVersion: 3, result: "Verified fixed" }));
    expect(screen.queryByRole("button", { name: "Complete action #41" })).toBeNull();
  });
  it.each(["RESOLVED", "CLOSED", "CANCELLED"])("keeps shared content and history but locks changes on %s Tickets", async ticketStatus => {
    render(<ActionsTaken {...props} ticketStatus={ticketStatus} />); await screen.findByText(action.description);
    expect(screen.queryByRole("button", { name: /Record action|Edit action|Complete action|Cancel action/ })).toBeNull();
    expect(screen.getByRole("button", { name: "History for action #41" })).toBeInTheDocument();
  });
  it("does not expose mutation controls for Cancelled actions", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue(list([{ ...action, status: "CANCELLED", cancelledAt: action.createdAt, cancellationReason: "Duplicate" }]));
    render(<ActionsTaken {...props} />); await screen.findByText(action.description);
    expect(screen.queryByRole("button", { name: /Edit action|Correct action|Complete action|Cancel action/ })).toBeNull();
  });
  it("preserves a conflicting draft and requires explicit review before using fresh versions", async () => {
    vi.mocked(api.patchActionTaken).mockRejectedValueOnce(new api.ActionsApiError(409, "STALE_UPDATE")).mockResolvedValueOnce({ action, ticketVersion: 6 });
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Edit action #41" }));
    change("Action Description *", "My draft"); await save();
    await screen.findByRole("button", { name: "Refresh current record" }); expect(screen.getByLabelText("Action Description *")).toHaveValue("My draft");
    expect(screen.getByRole("button", { name: "Save action" })).toBeDisabled();
    vi.mocked(api.getActionsTaken).mockResolvedValue(list([{ ...action, description: "Other editor", version: 2 }], 5));
    fireEvent.click(screen.getByRole("button", { name: "Refresh current record" }));
    await screen.findByRole("heading", { name: "Current saved record" }); expect(api.patchActionTaken).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Keep draft and use refreshed versions" })); await save();
    await waitFor(() => expect(api.patchActionTaken).toHaveBeenLastCalledWith(101, 41, { expectedVersion: 2, expectedTicketVersion: 5, description: "My draft" }));
  });
  it.each([400, 404, 413, 415, 500])("preserves an edit after HTTP %i", async status => {
    vi.mocked(api.patchActionTaken).mockRejectedValueOnce(new api.ActionsApiError(status, "REQUEST_FAILED"));
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Edit action #41" })); change("Action Description *", "Keep this draft"); await save();
    await screen.findByRole("alert"); expect(screen.getByLabelText("Action Description *")).toHaveValue("Keep this draft"); expect(onAccessFailure).not.toHaveBeenCalled();
  });
  it.each([401, 403])("clears restricted data on HTTP %i", async status => {
    vi.mocked(api.patchActionTaken).mockRejectedValueOnce(new api.ActionsApiError(status, "PASSWORD_CHANGE_REQUIRED"));
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Edit action #41" })); change("Action Description *", "Secret draft"); await save();
    await waitFor(() => expect(onAccessFailure).toHaveBeenCalledWith("PASSWORD_CHANGE_REQUIRED"));
    expect(screen.queryByText(action.description)).toBeNull(); expect(screen.queryByDisplayValue("Secret draft")).toBeNull();
  });
  it("provides staff lookup failure/empty feedback and retry", async () => {
    vi.mocked(api.getActionAssignees).mockRejectedValueOnce(new api.ActionsApiError(500, "SERVER_ERROR")).mockResolvedValueOnce([]);
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Record action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to complete"); expect(screen.getByRole("button", { name: "Save action" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh active IT Staff" }));
    await screen.findByText("No active IT Staff are available for assignment."); expect(screen.getByRole("button", { name: "Save action" })).toBeDisabled();
  });
  it("loads private immutable history and retries independent failures", async () => {
    vi.mocked(api.getActionHistory).mockRejectedValueOnce(new api.ActionsApiError(500, "SERVER_ERROR")).mockResolvedValueOnce(history);
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "History for action #41" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry history" }));
    const region = await screen.findByRole("region", { name: "Private revision history for action #41" });
    expect(await within(region).findByText(/Creator at time of change/)).toBeInTheDocument();
    expect(within(region).queryByRole("button", { name: /Edit|Delete/ })).toBeNull();
  });
  it("paginates through server-provided actions", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValueOnce({ ...list(), pagination: { page: 1, limit: 20, total: 21, totalPages: 2 } }).mockResolvedValueOnce({ ...list([{ ...action, id: 61 }]), pagination: { page: 2, limit: 20, total: 21, totalPages: 2 } });
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Next actions" }));
    await screen.findByText("Action #61"); expect(api.getActionsTaken).toHaveBeenLastCalledWith(101, 2, expect.any(AbortSignal));
  });
  it("retries list failure without claiming a zero-action Ticket", async () => {
    vi.mocked(api.getActionsTaken).mockRejectedValueOnce(new api.ActionsApiError(200, "MALFORMED_RESPONSE")).mockResolvedValueOnce(list([]));
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Retry actions" })); await screen.findByText("No Actions Taken recorded yet.");
  });
  it("guards two submissions before React commits the busy state", async () => {
    vi.mocked(api.createActionTaken).mockImplementationOnce(() => new Promise(() => {}));
    render(<ActionsTaken {...props} />); await openCreate();
    const editor = screen.getByRole("form", { name: "Action editor" });
    await act(async () => { fireEvent.submit(editor); fireEvent.submit(editor); });
    expect(api.createActionTaken).toHaveBeenCalledOnce();
  });
  it("keeps rejected create values editable and uses a new UUID for a corrected request", async () => {
    vi.mocked(api.createActionTaken).mockRejectedValueOnce(new api.ActionsApiError(400, "INVALID_ASSIGNEE")).mockResolvedValueOnce({ action, ticketVersion: 4, replayed: false });
    render(<ActionsTaken {...props} />); await openCreate(); await save();
    expect(screen.getByLabelText("Action Description *")).toBeEnabled(); expect(screen.getByLabelText("Action Description *")).toHaveValue("Inspect router");
    change("Assigned to *", "20"); await save();
    expect(vi.mocked(api.createActionTaken).mock.calls[1][1].requestId).not.toBe(vi.mocked(api.createActionTaken).mock.calls[0][1].requestId);
  });
  it("does not re-enable an obsolete lifecycle operation after conflict review", async () => {
    vi.mocked(api.patchActionTaken).mockRejectedValueOnce(new api.ActionsApiError(409, "STALE_UPDATE"));
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Cancel action #41" }));
    change("Cancellation reason *", "Obsolete"); await act(async () => fireEvent.click(screen.getByRole("button", { name: "Confirm cancellation" })));
    vi.mocked(api.getActionsTaken).mockResolvedValue(list([{ ...action, status: "COMPLETED", result: "Fixed", version: 2 }], 5));
    fireEvent.click(screen.getByRole("button", { name: "Refresh current record" }));
    fireEvent.click(await screen.findByRole("button", { name: "Keep draft and use refreshed versions" }));
    expect(screen.getByRole("button", { name: "Confirm cancellation" })).toBeDisabled();
    expect(screen.getByLabelText("Cancellation reason *")).toHaveValue("Obsolete"); expect(api.patchActionTaken).toHaveBeenCalledOnce();
  });
  it("permits completed content correction despite an ineligible historical assignee and failed lookup", async () => {
    vi.mocked(api.getActionsTaken).mockResolvedValue(list([{ ...action, status: "COMPLETED", result: "Fixed", assignedTo: { ...action.assignedTo, isActive: false } }]));
    vi.mocked(api.getActionAssignees).mockRejectedValue(new api.ActionsApiError(500, "SERVER_ERROR"));
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Correct action #41" }));
    change("Result *", "Verified"); await save();
    expect(api.patchActionTaken).toHaveBeenCalledWith(101, 41, { expectedVersion: 1, expectedTicketVersion: 3, result: "Verified" });
  });
  it("ignores an abandoned read when switching Tickets", async () => {
    let finish!: (value: api.ActionList) => void;
    vi.mocked(api.getActionsTaken).mockImplementationOnce(() => new Promise(done => { finish = done; })).mockResolvedValueOnce({ ...list([]), ticketId: 102 });
    const view = render(<ActionsTaken {...props} />);
    view.rerender(<ActionsTaken {...props} ticketId={102} />); await screen.findByText("No Actions Taken recorded yet.");
    await act(async () => finish(list())); expect(screen.queryByText(action.description)).toBeNull();
  });
  it("clears protected data if the Ticket summary refresh detects an auth failure after a successful write", async () => {
    onRefreshTicket.mockRejectedValueOnce(new api.ActionsApiError(403, "PASSWORD_CHANGE_REQUIRED"));
    render(<ActionsTaken {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Edit action #41" }));
    change("Action Description *", "Saved before session changed"); await save();
    expect(api.patchActionTaken).toHaveBeenCalledOnce(); expect(onAccessFailure).toHaveBeenCalledWith("PASSWORD_CHANGE_REQUIRED");
    expect(screen.queryByText(action.description)).toBeNull(); expect(screen.queryByRole("form", { name: "Action editor" })).toBeNull();
  });
  it("keeps writes disabled while loading a newly created last page", async () => {
    let finish!: (value: api.ActionList) => void;
    vi.mocked(api.getActionsTaken)
      .mockResolvedValueOnce({ ...list(), pagination: { page: 1, limit: 20, total: 20, totalPages: 1 } })
      .mockResolvedValueOnce({ ...list(), pagination: { page: 1, limit: 20, total: 21, totalPages: 2 } })
      .mockImplementationOnce(() => new Promise(done => { finish = done; }));
    render(<ActionsTaken {...props} />); await openCreate(); await save();
    expect(screen.getByText("Loading Actions Taken...")).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Record action" })).toBeNull();
    expect(screen.getByRole("button", { name: "Edit action #41" })).toBeDisabled();
    await act(async () => finish({ ...list([{ ...action, id: 61 }]), pagination: { page: 2, limit: 20, total: 21, totalPages: 2 } }));
    expect(screen.getByText("Action #61")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Record action" })).toBeEnabled();
  });
});
