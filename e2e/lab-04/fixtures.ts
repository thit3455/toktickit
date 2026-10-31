import { test as base, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface Lab4Case {
  caseId: string; password: string; ticketId: number; ticketNumber: string;
  users: Array<{ id: number; name: string; email: string; role: string }>;
}
type Harness = { apiUrl: string; request(type: string, input?: object): Promise<unknown> };
export const test = base.extend<{ lab4: Lab4Case & { apiUrl: string; deactivate(index: number): Promise<void> } }, { harness: Harness }>({
  harness: [async ({}, use) => {
    // Missing configuration fails setup, never silently skips or falls back to .env.
    if (process.env.LAB4_E2E_APPROVED !== "1" || !process.env.LAB4_TEST_DATABASE_URL) throw new Error("Approve isolated I3 E2E execution and configure LAB4_E2E_APPROVED=1 plus LAB4_TEST_DATABASE_URL privately.");
    // Strip inherited development URLs/libpq settings. The child alone gets its guarded target.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/DATABASE_URL$/i.test(key) && !/^PG/i.test(key)));
    env.LAB4_TEST_DATABASE_URL = process.env.LAB4_TEST_DATABASE_URL;
    const child: ChildProcess = spawn(process.execPath, ["--import", pathToFileURL(resolve("server/node_modules/tsx/dist/loader.mjs")).href, resolve("e2e/lab-04/test-server.ts")], {
      cwd: resolve("server"), env, windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    let exited = false; child.once("exit", () => { exited = true; });
    function waitForMessage(accept: (message: Record<string, unknown>) => boolean, timeout = 120000): Promise<Record<string, unknown>> {
      return new Promise((done, fail) => {
        const timer = setTimeout(() => finish(new Error("Isolated UI harness timed out. Inspect owned test schemas before retrying.")), timeout);
        const message = (value: unknown) => { const item = value as Record<string, unknown>; if (accept(item)) finish(undefined, item); };
        const exit = () => finish(new Error("Isolated UI harness exited. Connection details suppressed."));
        const error = () => finish(new Error("Unable to start isolated UI harness."));
        function finish(failure?: Error, value?: Record<string, unknown>) {
          clearTimeout(timer); child.off("message", message); child.off("exit", exit); child.off("error", error);
          if (failure) fail(failure); else done(value!);
        }
        child.on("message", message); child.once("exit", exit); child.once("error", error);
      });
    }
    try {
      const ready = await waitForMessage(item => item.type === "ready" || item.type === "failed");
      if (ready.type !== "ready") throw new Error(String(ready.error));
      const data = ready.data as { apiUrl: string };
      await use({ apiUrl: data.apiUrl, async request(type, input = {}) {
        const id = randomUUID(); const reply = waitForMessage(item => item.id === id);
        child.send({ type, id, ...input });
        const result = await reply;
        if (result.error) throw new Error(String(result.error));
        return result.data;
      } });
    } finally {
      if (!exited && child.connected) {
        await new Promise<void>((done, fail) => {
          const timer = setTimeout(() => { child.kill(); fail(new Error("Harness cleanup timed out. Owned schema may remain; no database was reset.")); }, 30000);
          child.once("exit", () => { clearTimeout(timer); done(); }); child.send({ type: "stop" });
        });
      }
    }
  }, { scope: "worker", timeout: 180000 }],
  lab4: async ({ harness }, use) => {
    const data = await harness.request("fixture") as Lab4Case;
    await use({ ...data, apiUrl: harness.apiUrl, async deactivate(userIndex) { await harness.request("deactivate", { caseId: data.caseId, userIndex }); } });
  },
});
export { expect };
