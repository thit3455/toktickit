import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";
import * as api from "../../src/api";
import * as dashboard from "../../src/dashboard.api";
import { requesterData, staffData } from "./dashboard-fixtures";
import { workflowTicket } from "./workflow-fixtures";
vi.mock("../../src/api");
vi.mock("../../src/dashboard.api", async original => ({ ...await original<typeof dashboard>(), getRequesterDashboard: vi.fn(), getStaffDashboard: vi.fn() }));
const actor = (role: api.AccountRole, mustChangePassword = false) => ({ id: 7, name: "I5 actor", email: "i5@example.test", role, mustChangePassword });
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));
  vi.mocked(api.getCurrentUser).mockResolvedValue(actor("REQUESTER"));
  vi.mocked(api.getCategories).mockResolvedValue([]); vi.mocked(api.getRelatedSystems).mockResolvedValue([]);
  vi.mocked(dashboard.getRequesterDashboard).mockResolvedValue(requesterData); vi.mocked(dashboard.getStaffDashboard).mockResolvedValue(staffData);
  vi.mocked(api.getMyTickets).mockResolvedValue({ data: [workflowTicket() as unknown as api.TicketListItem], pagination: { page: 1, pageSize: 10, totalItems: 20, totalPages: 2 } });
  vi.mocked(api.getStaffTickets).mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("I5 navigation preserves earlier gates and list context", () => {
  it("replaces the dashboard status group when the user chooses a single status", async () => {
    render(<App />); fireEvent.click(await screen.findByRole("button", { name: "View My Open Tickets" }));
    await waitFor(() => expect(api.getMyTickets).toHaveBeenCalledWith(expect.objectContaining({ statuses: requesterData.drillDown.myOpenTickets.query.statuses })));
    fireEvent.change(screen.getByLabelText("Status", { exact: true }), { target: { value: "CLOSED" } });
    await waitFor(() => expect(api.getMyTickets).toHaveBeenLastCalledWith(expect.objectContaining({ asOf: requesterData.asOf, statuses: undefined, currentStatus: "CLOSED" })));
  });
  it("does not reuse another login's dashboard cutoff or queue owner filter", async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue(actor("IT_STAFF")); vi.mocked(api.logout).mockResolvedValue(); render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "View My Active Tickets" })); await waitFor(() => expect(api.getStaffTickets).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Logout" })); await screen.findByRole("heading", { name: "TokTickIT Login" });
    vi.mocked(api.login).mockResolvedValue({ data: { sessionId: "new-fixture-session", user: { ...actor("IT_STAFF"), id: 8 } } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "next@example.test" } }); fireEvent.change(screen.getByLabelText("Password"), { target: { value: "SyntheticLogin123!" } }); fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByRole("heading", { name: "IT Staff Dashboard" }); fireEvent.click(screen.getByRole("button", { name: "IT Staff Queue" }));
    await waitFor(() => expect(api.getStaffTickets).toHaveBeenLastCalledWith(expect.not.objectContaining({ asOf: staffData.asOf }), expect.any(AbortSignal)));
    const last = vi.mocked(api.getStaffTickets).mock.calls.at(-1)![0]; expect(last).not.toHaveProperty("owner");
  });

  it.each(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const)("lands %s on its dashboard with the correct navigation name", async role => {
    vi.mocked(api.getCurrentUser).mockResolvedValue(actor(role)); render(<App />);
    expect(await screen.findByRole("heading", { name: role === "REQUESTER" ? "Requester Dashboard" : role === "IT_STAFF" ? "IT Staff Dashboard" : "Administrator Dashboard" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: role === "IT_STAFF" ? "IT Staff navigation" : role === "ADMINISTRATOR" ? "Administrator navigation" : "Requester navigation" })).toBeVisible();
  });
  it.each(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const)("keeps mandatory Change Password ahead of %s dashboard", async role => {
    vi.mocked(api.getCurrentUser).mockResolvedValue(actor(role, true)); vi.mocked(api.changePassword).mockResolvedValue(); render(<App />);
    await screen.findByRole("heading", { name: "Change Password" }); expect(screen.queryByRole("button", { name: "Dashboard" })).toBeNull();
    expect(dashboard.getRequesterDashboard).not.toHaveBeenCalled(); expect(dashboard.getStaffDashboard).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "TemporaryFixture123!" } }); fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "DifferentFixture123!" } }); fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "DifferentFixture123!" } }); fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    await screen.findByRole("button", { name: "Dashboard" }); expect(api.changePassword).toHaveBeenCalledWith("TemporaryFixture123!", "DifferentFixture123!");
  });
  it("retains the exact requester event window and cutoff through sort changes", async () => {
    render(<App />); fireEvent.click(await screen.findByRole("button", { name: "View Recently Resolved" }));
    await waitFor(() => expect(api.getMyTickets).toHaveBeenCalledWith(expect.objectContaining({ asOf: requesterData.asOf, statuses: "RESOLVED,CLOSED", resolvedSince: requesterData.window.start, resolvedUntil: requesterData.asOf, page: 1 })));
    fireEvent.change(screen.getByLabelText("Sort By"), { target: { value: "ticketNumber" } });
    await waitFor(() => expect(api.getMyTickets).toHaveBeenLastCalledWith(expect.objectContaining({ asOf: requesterData.asOf, resolvedSince: requesterData.window.start, sortBy: "ticketNumber" })));
    fireEvent.click(screen.getByRole("button", { name: "Clear dashboard filters" }));
    await waitFor(() => expect(api.getMyTickets).toHaveBeenLastCalledWith(expect.not.objectContaining({ asOf: requesterData.asOf })));
  });
  it("passes the original staff owner and cutoff into the existing queue", async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue(actor("IT_STAFF")); render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "View My Active Tickets" }));
    await waitFor(() => expect(api.getStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ asOf: staffData.asOf, owner: "me", statuses: staffData.drillDown.myActiveTickets.query.statuses }), expect.any(AbortSignal)));
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "updatedAt" } });
    await waitFor(() => expect(api.getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ asOf: staffData.asOf, owner: "me", sort: "updatedAt" }), expect.any(AbortSignal)));
  });
});
