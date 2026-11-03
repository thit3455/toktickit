import { describe, expect, it } from "vitest";
import { assertI5DatabaseConfiguration } from "../helpers/i5-database.js";
const url = "postgresql://toktickit_lab4_i5_runner:unit-test-only@127.0.0.1:54580/toktickit_lab4_test_i5_abcdef123456";
const valid = { LAB4_I5_TEST_APPROVED: "1", LAB4_TEST_DATABASE_URL: url, LAB4_I5_EXPECTED_PORT: "54580", LAB4_I5_EXPECTED_DATABASE: "toktickit_lab4_test_i5_abcdef123456" };
describe("I5 database configuration guard (no connections)", () => {
  it("accepts the exact approved disposable configuration without opening it", () => expect(assertI5DatabaseConfiguration(valid).port).toBe("54580"));
  it.each([
    { LAB4_I5_TEST_APPROVED: undefined }, { LAB4_TEST_DATABASE_URL: undefined }, { LAB4_I5_EXPECTED_DATABASE: "toktickit" }, { LAB4_I5_EXPECTED_PORT: "5433" },
    ...["5432", "5433", "55432"].map(port => ({ LAB4_TEST_DATABASE_URL: url.replace("54580", port), LAB4_I5_EXPECTED_PORT: port })),
    { LAB4_TEST_DATABASE_URL: url.replace("127.0.0.1", "192.0.2.1") }, { LAB4_TEST_DATABASE_URL: url.replace("i5_runner", "i4_runner") },
    { LAB4_TEST_DATABASE_URL: url + "?host=127.0.0.1" }, { LAB4_TEST_DATABASE_URL: url + "?options=unsafe" }, { LAB4_TEST_DATABASE_URL: url.replace("abcdef123456", "abcdef123457") },
  ])("rejects protected targets before constructing a client %#", changes => expect(() => assertI5DatabaseConfiguration({ ...valid, ...changes })).toThrow());
});
