import { describe, expect, it } from "vitest";
import { dashboardWindow, ticketCutoff, resolutionWindowFilter, listDashboardFilters, activeTicketStatuses } from "../../src/dashboard/dashboard.rules.js";
const asOf = new Date("2026-10-27T05:00:00.000Z");
describe("I5 approved snapshot and drill-down rules (no database)", () => {
  it.each([
    ["2026-10-27T05:00:00.000Z", "2026-10-20T17:00:00.000Z"],
    ["2026-10-26T16:59:59.999Z", "2026-10-19T17:00:00.000Z"],
    ["2026-10-26T17:00:00.000Z", "2026-10-20T17:00:00.000Z"],
    ["2027-01-01T00:00:00.000Z", "2026-12-25T17:00:00.000Z"],
  ])("uses seven Bangkok calendar dates for %s", (instant, start) => {
    expect(dashboardWindow(new Date(instant))).toEqual({ start, end: instant });
  });
  it("applies both inclusive upper cutoffs without a lower date bound", () => {
    expect(ticketCutoff(asOf)).toEqual({ createdAt: { lte: asOf }, updatedAt: { lte: asOf } });
    expect(activeTicketStatuses).toEqual(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"]);
  });
  it("requires an in-window resolution and excludes every later resolution", () => {
    const start = new Date(dashboardWindow(asOf).start);
    expect(resolutionWindowFilter(start, asOf)).toEqual({ AND: [
      { statusEvents: { some: { toStatus: "RESOLVED", createdAt: { gte: start, lte: asOf } } } },
      { statusEvents: { none: { toStatus: "RESOLVED", createdAt: { gt: asOf } } } },
    ] });
  });
  it("does not add a global cutoff to ordinary lists", () => {
    expect(listDashboardFilters({}, "requester", 7, asOf)).toEqual({});
  });
  it("preserves exact cutoff, status set and literal current-user ownership", () => {
    expect(listDashboardFilters({ asOf: asOf.toISOString(), statuses: "OPEN,REOPENED", owner: "me" }, "staff", 7, asOf)).toEqual({
      ...ticketCutoff(asOf), currentStatus: { in: ["OPEN", "REOPENED"] }, assignedStaffId: 7,
    });
  });
  it("accepts an inclusive point event interval", () => {
    expect(listDashboardFilters({ asOf: asOf.toISOString(), resolvedSince: asOf.toISOString(), resolvedUntil: asOf.toISOString() }, "requester", 7, asOf)).toMatchObject(resolutionWindowFilter(asOf, asOf));
  });
  it.each([
    { asOf: "bad" }, { asOf: "2026-10-27T05:00:00Z" }, { asOf: ["2026-10-27T05:00:00.000Z"] },
    { asOf: "2026-10-27T05:00:00.001Z" }, { statuses: "" }, { statuses: "OPEN,OPEN" },
    { statuses: "OPEN,UNKNOWN" }, { statuses: ["OPEN"] }, { statuses: "OPEN", currentStatus: "OPEN" },
    { resolvedSince: asOf.toISOString() }, { resolvedUntil: asOf.toISOString() },
    { resolvedSince: asOf.toISOString(), resolvedUntil: asOf.toISOString() },
    { asOf: asOf.toISOString(), resolvedSince: "2026-10-27T05:00:00.001Z", resolvedUntil: asOf.toISOString() },
  ])("rejects malformed or contradictory requester filters %#", query => {
    expect(() => listDashboardFilters(query, "requester", 7, asOf)).toThrow();
  });
  it.each([{ owner: "someone" }, { owner: ["me"] }, { owner: "me", assigned: "false" }, { statuses: "OPEN", status: "OPEN" }])("rejects invalid staff filters %#", query => {
    expect(() => listDashboardFilters(query, "staff", 7, asOf)).toThrow();
  });
});
