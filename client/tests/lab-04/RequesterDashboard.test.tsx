import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RequesterDashboard } from "../../src/RequesterDashboard";
import * as api from "../../src/dashboard.api";
import { requesterData } from "./dashboard-fixtures";
vi.mock("../../src/dashboard.api", async original => ({ ...await original<typeof api>(), getRequesterDashboard: vi.fn() }));
const props = () => ({ onNavigate: vi.fn(), onOpenTicket: vi.fn(), onAccessFailure: vi.fn() });
beforeEach(() => { vi.mocked(api.getRequesterDashboard).mockReset(); });
afterEach(cleanup);
describe("I5 Requester Dashboard", () => {
  it("shows loading without fabricated counts", () => {
    vi.mocked(api.getRequesterDashboard).mockReturnValue(new Promise(() => {})); render(<RequesterDashboard {...props()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard"); expect(screen.queryByText("12")).toBeNull();
  });
  it("displays server totals and exact resolution drill-down boundaries", async () => {
    vi.mocked(api.getRequesterDashboard).mockResolvedValue(requesterData); const p = props(); render(<RequesterDashboard {...p} />);
    expect(await screen.findByText("12")).toBeVisible(); fireEvent.click(screen.getByRole("button", { name: "View Recently Resolved" }));
    expect(p.onNavigate).toHaveBeenCalledWith(requesterData.drillDown.recentlyResolved);
    expect(screen.getByText(/Seven Bangkok calendar days/)).toBeVisible();
    fireEvent.click(within(screen.getByRole("region", { name: "Recently Updated" })).getByRole("button", { name: "Open DASH-101" }));
    expect(p.onOpenTicket).toHaveBeenCalledWith(101);
    expect(screen.queryByText("Internal Notes")).toBeNull();
  });
  it("keeps the current-count link free of a lower date bound", async () => {
    vi.mocked(api.getRequesterDashboard).mockResolvedValue(requesterData); const p = props(); render(<RequesterDashboard {...p} />);
    fireEvent.click(await screen.findByRole("button", { name: "View My Open Tickets" })); expect(p.onNavigate).toHaveBeenCalledWith(requesterData.drillDown.myOpenTickets);
    expect(requesterData.drillDown.myOpenTickets.query).not.toHaveProperty("resolvedSince");
  });
  it("explains genuine zero and empty owned data", async () => {
    vi.mocked(api.getRequesterDashboard).mockResolvedValue({ ...requesterData, metrics: { myOpenTickets: 0, needsMyAttention: 0, recentlyResolved: 0 }, recentTickets: [], attentionTickets: [] });
    render(<RequesterDashboard {...props()} />); expect(await screen.findByText(/no matching owned Tickets/)).toBeVisible(); expect(screen.getAllByText("0")).toHaveLength(3);
  });
  it("retries a recoverable failure and refreshes using a new server response", async () => {
    vi.mocked(api.getRequesterDashboard).mockRejectedValueOnce(new Error("private details")).mockResolvedValueOnce(requesterData).mockResolvedValueOnce({ ...requesterData, metrics: { ...requesterData.metrics, myOpenTickets: 19 } });
    render(<RequesterDashboard {...props()} />); fireEvent.click(await screen.findByRole("button", { name: "Retry dashboard" }));
    await screen.findByText("12"); fireEvent.click(screen.getByRole("button", { name: "Refresh Dashboard" })); expect(await screen.findByText("19")).toBeVisible(); expect(screen.queryByText("private details")).toBeNull();
  });
  it.each([[401, "UNAUTHENTICATED"], [403, "PASSWORD_CHANGE_REQUIRED"]])("removes data and reports protected failure %i", async (status, code) => {
    vi.mocked(api.getRequesterDashboard).mockResolvedValueOnce(requesterData).mockRejectedValueOnce(new api.DashboardError(status, code)); const p = props(); render(<RequesterDashboard {...p} />);
    await screen.findByText("12"); fireEvent.click(screen.getByRole("button", { name: "Refresh Dashboard" })); await screen.findByRole("alert"); expect(screen.queryByText("12")).toBeNull(); expect(p.onAccessFailure).toHaveBeenCalledWith(code);
  });
});
