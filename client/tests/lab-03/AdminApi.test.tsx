import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminUser, getAdminUsers, updateAdminUser, setAdminInitialPassword } from "../../src/api";
afterEach(() => vi.unstubAllGlobals());
describe("Administrator API client", () => {
  it("serializes filters and authenticated mutations without extra user fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    await getAdminUsers({ search: "Name & email", role: "REQUESTER", active: "false" });
    const input = { name: "Test", email: "test@example.test", role: "REQUESTER" as const, isActive: true };
    await createAdminUser({ ...input, password: "InitialPass123!" });
    await updateAdminUser(12, input);
    await setAdminInitialPassword(12, "ResetInitial123!");
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("search")).toBe("Name & email");
    expect(fetchMock.mock.calls[2][0]).toMatch(/\/api\/admin\/users\/12$/);
    expect(fetchMock.mock.calls[3][0]).toMatch(/\/12\/password$/);
    for (const [, options] of fetchMock.mock.calls) expect(options.credentials).toBe("include");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual(input);
  });
  it.each([400, 401, 403, 404, 409, 500])("maps HTTP %s safely", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ error: { message: "private database detail" } }) }));
    await expect(getAdminUsers()).rejects.toMatchObject({ status });
    await expect(getAdminUsers()).rejects.not.toThrow("private database");
  });
  it("handles network and malformed server failures safely", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("private connection detail")).mockResolvedValueOnce({ ok: true, json: async () => null });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getAdminUsers()).rejects.toThrow("Unable to reach the server");
    await expect(getAdminUsers()).rejects.toThrow("unexpected response");
  });
});
