import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Only deliberately rejected configurations: none can reach a DB connection.
const fake = "postgresql://toktickit_lab4_runner:unit-test-only@127.0.0.1:55432/toktickit_lab4_test_actions";
describe("I3 E2E harness fails closed without database access", () => {
  it.each([
    ["missing approval", undefined, fake],
    ["missing target", "1", undefined],
    ["development database", "1", fake.replace("toktickit_lab4_test_actions", "toktickit")],
    ["wrong port", "1", fake.replace("55432", "5432")],
    ["wrong host", "1", fake.replace("127.0.0.1", "192.0.2.1")],
    ["wrong role", "1", fake.replace("toktickit_lab4_runner", "postgres")],
    ["routing override", "1", `${fake}?host=192.0.2.1`],
  ])("rejects %s before setup", async (_name, approval, url) => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/DATABASE_URL$/i.test(key) && !/^PG/i.test(key) && key !== "LAB4_E2E_APPROVED"));
    if (approval) env.LAB4_E2E_APPROVED = approval;
    if (url) env.LAB4_TEST_DATABASE_URL = url;
    const messages: unknown[] = [];
    const child = spawn(process.execPath, ["--import", pathToFileURL(resolve("node_modules/tsx/dist/loader.mjs")).href, resolve("../e2e/lab-04/test-server.ts")], { env, cwd: process.cwd(), windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"] });
    const exitCode = await new Promise<number | null>((done, fail) => {
      const timer = setTimeout(() => { child.kill(); fail(new Error("Guard check timed out.")); }, 10000);
      child.on("message", message => messages.push(message));
      child.once("error", () => { clearTimeout(timer); fail(new Error("Unable to launch guard check.")); });
      child.once("exit", code => { clearTimeout(timer); done(code); });
    });
    expect(exitCode).toBe(1);
    expect(messages).toEqual([{ type: "failed", error: expect.stringContaining("setup refused or failed") }]);
    expect(JSON.stringify(messages)).not.toContain("unit-test-only");
  });
});
