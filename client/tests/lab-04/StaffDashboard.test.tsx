import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StaffDashboard } from "../../src/StaffDashboard";
import * as api from "../../src/dashboard.api";
import { staffData } from "./dashboard-fixtures";
vi.mock("../../src/dashboard.api", async original => ({ ...await original<typeof api>(), getStaffDashboard: vi.fn() }));
const props = () => ({ onNavigate: vi.fn(), onOpenTicket: vi.fn(), onAccessFailure: vi.fn() });
beforeEach(() => { vi.mocked(api.getStaffDashboard).mockReset(); vi.mocked(api.getStaffDashboard).mockResolvedValue(staffData); });
afterEach(cleanup);
describe("I5 operational dashboard", () => {
  it.each([false, true])("reuses literal metrics for Administrator=%s", async administrator => {
    render(<StaffDashboard {...props()} administrator={administrator} />);
    expect(await screen.findByText("27")).toBeVisible(); expect(screen.getByRole("heading", { name: administrator ? "Administrator Dashboard" : "IT Staff Dashboard" })).toBeVisible();
    expect(within(screen.getByRole("region", { name: "LOW" })).getByText("0")).toBeVisible();
  });
  it("opens the selected action's parent and action ID without an invented all-actions link", async () => {
    const p = props(); render(<StaffDashboard {...p} />); fireEvent.click(await screen.findByRole("button", { name: "Open action #41 on DASH-101" }));
    expect(p.onOpenTicket).toHaveBeenCalledWith(101, 41); expect(screen.queryByRole("button", { name: "View My Active Actions" })).toBeNull();
  });
  it.each(["LOW", "MEDIUM", "HIGH", "URGENT"] as const)("preserves server filters for priority %s", async priority => {
    const p = props(); render(<StaffDashboard {...p} />); fireEvent.click(await screen.findByRole("button", { name: "View " + priority + " active Tickets" }));
    expect(p.onNavigate).toHaveBeenCalledWith(staffData.drillDown.activeTicketsByItPriority[priority]);
  });
  it("preserves literal owner and unassigned filters", async () => {
    const p = props(); render(<StaffDashboard {...p} />);
    fireEvent.click(await screen.findByRole("button", { name: "View My Active Tickets" })); fireEvent.click(screen.getByRole("button", { name: "View Unassigned Active Tickets" }));
    expect(p.onNavigate.mock.calls).toEqual([[staffData.drillDown.myActiveTickets], [staffData.drillDown.unassignedActiveTickets]]);
  });
  it("shows loading and safe retry feedback", async () => {
    vi.mocked(api.getStaffDashboard).mockRejectedValueOnce(new Error("secret query")); render(<StaffDashboard {...props()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry dashboard" })); expect(await screen.findByText("27")).toBeVisible(); expect(screen.queryByText("secret query")).toBeNull();
  });
  it("explains an empty assignment list", async () => {
    vi.mocked(api.getStaffDashboard).mockResolvedValue({ ...staffData, myActiveActions: [], metrics: { ...staffData.metrics, myActiveActions: 0 } });
    render(<StaffDashboard {...props()} />); expect(await screen.findByText("No matching assigned active actions.")).toBeVisible();
  });
});
