import { describe, expect, it } from "vitest";
import { assertI6DatabaseConfiguration, assertI6OwnedApplicationConfiguration, assertI6ApiUrl } from "../helpers/i6-database.js";
const nonce = "ddfdebd14943";
const configuration = () => ({ LAB4_I6_TEST_APPROVED: "1", LAB4_I6_EXPECTED_NONCE: nonce, LAB4_I6_EXPECTED_PORT: "60999", LAB4_TEST_DATABASE_URL: "postgresql://toktickit_lab4_i4_runner:unit%40secret@127.0.0.1:60999/toktickit_lab4_test_i4_" + nonce, LAB4_I6_DASHBOARD_DATABASE_URL: "postgresql://toktickit_lab4_i5_runner:unit%40secret@127.0.0.1:60999/toktickit_lab4_test_i5_" + nonce, LAB4_RECOVERY_DATABASE_URL: "postgresql://toktickit_lab4_i4_runner:unit%40secret@127.0.0.1:60999/toktickit_lab4_test_i6_recovery_" + nonce });
describe("I6 execution configuration refuses unsafe targets before database access", () => {
    it("accepts only the three explicitly approved compatibility targets", () => { for (const kind of ["workflow", "dashboard", "recovery"] as const)
        expect(assertI6DatabaseConfiguration(configuration(), kind).port).toBe("60999"); });
    it.each([
        ["approval", { LAB4_I6_TEST_APPROVED: "0" }], ["missing explicit URL", { LAB4_TEST_DATABASE_URL: undefined, DATABASE_URL: "postgresql://private:private@localhost:5433/toktickit" }],
        ["host", { LAB4_TEST_DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL.replace("127.0.0.1", "localhost") }],
        ...["5432", "5433", "55432"].map(port => ["protected port " + port, { LAB4_I6_EXPECTED_PORT: port, LAB4_TEST_DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL.replace("60999", port) }] as [
            string,
            NodeJS.ProcessEnv
        ]),
        ["database", { LAB4_TEST_DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL.replace("toktickit_lab4_test_i4_" + nonce, "toktickit") }],
        ["role", { LAB4_TEST_DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL.replace("toktickit_lab4_i4_runner", "administrator") }],
        ["password", { LAB4_TEST_DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL.replace(":unit%40secret", "") }],
        ["port identity", { LAB4_I6_EXPECTED_PORT: "60001" }], ["nonce", { LAB4_I6_EXPECTED_NONCE: "ffffffffffff" }],
        ["routing option", { LAB4_TEST_DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL + "?host=remote" }],
        ["service option", { LAB4_TEST_DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL + "?service=development" }],
        ["preselected schema", { LAB4_TEST_DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL + "?schema=unowned" }],
    ] as const)("rejects %s without returning credentials", (_reason, patch) => { expect(() => assertI6DatabaseConfiguration({ ...configuration(), ...patch })).toThrow(/Issue #6/); });
    it("binds the legacy application URL to the exact allocated schema and primary target", () => { const env = { ...configuration(), LAB4_I6_OWNED_SCHEMA: "lab4_" + "a".repeat(32), DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL + "?schema=lab4_" + "a".repeat(32) }; expect(assertI6OwnedApplicationConfiguration(env).searchParams.get("schema")).toBe(env.LAB4_I6_OWNED_SCHEMA); expect(() => assertI6OwnedApplicationConfiguration({ ...env, DATABASE_URL: configuration().LAB4_TEST_DATABASE_URL + "?schema=public" })).toThrow(/Issue #6/); expect(() => assertI6OwnedApplicationConfiguration({ ...env, DATABASE_URL: env.DATABASE_URL.replace("60999", "5433") })).toThrow(/Issue #6/); });
    it("requires a controller-owned loopback API instead of port-3000/3002/3003 fallback", () => { const env = { ...configuration(), E2E_API_URL: "http://localhost:60998", LAB4_I6_OWNED_API_PORT: "60998" }; expect(assertI6ApiUrl(env)).toBe("http://localhost:60998"); for (const port of ["3000", "3001", "3002", "3003", "5173", "5174"])
        expect(() => assertI6ApiUrl({ ...env, E2E_API_URL: "http://localhost:" + port, LAB4_I6_OWNED_API_PORT: port })).toThrow(/Issue #6/); expect(() => assertI6ApiUrl({ ...env, E2E_API_URL: undefined })).toThrow(/Issue #6/); });
});
