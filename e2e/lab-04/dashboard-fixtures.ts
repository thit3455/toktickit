import { test as base, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export interface DashboardCase {
  apiUrl: string; password: string; targetActionId: number;
  users: { id: number; name: string; email: string; role: string }[];
  tickets: Record<"open" | "waiting" | "resolved" | "other", { id: number; ticketNumber: string }>;
}
// Test-scoped: each case gets a pristine owned schema and never sees prior fixtures.
export const test = base.extend<{ dashboard: DashboardCase }>({
  dashboard: [async ({}, use) => {
    if (process.env.LAB4_I5_TEST_APPROVED !== "1" || !process.env.LAB4_TEST_DATABASE_URL) throw new Error("Separate Issue #5 database approval and verified configuration are required.");
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/DATABASE_URL$/i.test(key) && !/^PG/i.test(key)));
    env.LAB4_TEST_DATABASE_URL = process.env.LAB4_TEST_DATABASE_URL;
    const child = spawn(process.execPath, ["--import", pathToFileURL(resolve("server/node_modules/tsx/dist/loader.mjs")).href, resolve("e2e/lab-04/dashboard-test-server.ts")],
      { cwd: resolve("server"), env, windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"] });
    let exited = false; child.once("exit", () => { exited = true; });
    try {
      const data = await new Promise<DashboardCase>((done, fail) => {
        const timer = setTimeout(() => fail(new Error("I5 harness startup timed out; inspect its owned schema before retrying.")), 120000);
        child.once("error", () => { clearTimeout(timer); fail(new Error("Unable to start I5 harness.")); });
        child.once("exit", () => { clearTimeout(timer); fail(new Error("I5 harness exited before readiness. Details suppressed.")); });
        child.once("message", value => { clearTimeout(timer); const message = value as { type: string; data: DashboardCase; error?: string }; if (message.type === "ready") done(message.data); else fail(new Error(message.error ?? "I5 setup refused.")); });
      });
      await use(data);
    } finally {
      if (!exited && child.connected) await new Promise<void>((done, fail) => {
        const timer = setTimeout(() => { child.kill(); fail(new Error("I5 owned-schema cleanup timed out; no existing database was reset.")); }, 30000);
        child.once("exit", code => { clearTimeout(timer); if (code === 0) done(); else fail(new Error("I5 cleanup failed; inspect only its owned schema.")); });
        child.send({ type: "stop" });
      });
    }
  }, { timeout: 180000 }],
});
export { expect };
