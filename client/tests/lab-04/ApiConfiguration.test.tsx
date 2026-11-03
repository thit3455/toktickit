import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const targets = [
  ["default local backend", undefined, "http://localhost:3001"],
  ["explicit deployment backend", "https://api.toktickit.example", "https://api.toktickit.example"],
  ["explicit same-origin proxy", "", ""],
] as const;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Application API configuration", () => {
  it.each(targets)("uses %s for authenticated API requests", async (_label, value, expected) => {
    vi.stubEnv("VITE_API_URL", value);
    vi.resetModules();
    const { API_URL, getCurrentUser } = await import("../../src/api");
    const user = { id: 17, email: "configuration@example.test", name: "Configuration fixture", role: "REQUESTER", mustChangePassword: false };
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ data: user }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(API_URL).toBe(expected);
    expect(await getCurrentUser()).toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(expected + "/api/auth/me", expect.objectContaining({ credentials: "include" }));
  });

  it.each(targets)("uses %s for public and private discussion reads", async (_label, value, expected) => {
    vi.stubEnv("VITE_API_URL", value);
    vi.resetModules();
    const { TicketDiscussion } = await import("../../src/TicketDiscussion");
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<TicketDiscussion ticketId={12} staff />);
    expect(await screen.findAllByText("No messages yet.")).toHaveLength(2);
    for (const path of ["comments", "internal-notes"]) {
      expect(fetchMock).toHaveBeenCalledWith(expected + "/api/tickets/12/" + path, expect.objectContaining({ credentials: "include" }));
    }
  });
});
