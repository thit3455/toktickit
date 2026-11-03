import { vi } from "vitest";
vi.mock("../../src/dashboard.api", async original => {
  const actual = await original<typeof import("../../src/dashboard.api")>();
  const { requesterData, staffData } = await import("./dashboard-fixtures");
  return { ...actual, getRequesterDashboard: async () => requesterData, getStaffDashboard: async () => staffData };
});
