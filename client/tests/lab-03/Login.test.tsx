import { afterEach, describe, expect, it, vi } from "vitest";
import { login } from "../../src/api";

afterEach(() => vi.unstubAllGlobals());
describe("Safe login feedback", () => {
  it("maps ACCOUNT_INACTIVE to safe feedback without exposing arbitrary server text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { code: "ACCOUNT_INACTIVE", message: "private server detail" } }) }));
    await expect(login("inactive@example.test", "Password123!")).rejects.toThrow("Account is inactive.");
  });
  it.each([401, 403, 500])("preserves generic login feedback for other HTTP %s errors", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ error: { code: "OTHER", message: "private server detail" } }) }));
    await expect(login("user@example.test", "Password123!")).rejects.toThrow("Invalid email or password");
  });
  it("preserves generic feedback for a non-JSON error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error("Invalid JSON"); } }));
    await expect(login("user@example.test", "Password123!")).rejects.toThrow("Invalid email or password");
  });
});
