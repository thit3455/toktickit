// Private IPC-only test harness. Never load server/.env or accept a development URL.
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Server } from "node:http";
import { disposableUrl, isolatedLab4Database } from "../../server/tests/helpers/lab4-database.js";

const bcrypt = createRequire(resolve("package.json"))("bcrypt") as typeof import("../../server/node_modules/@types/bcrypt/index.js");

let isolated: Awaited<ReturnType<typeof isolatedLab4Database>> | undefined;
let api: Server | undefined;
let frontend: { close(): Promise<void> } | undefined;
let stopping = false;
const cases = new Map<string, number[]>();
async function stop() {
  if (stopping) return;
  stopping = true;
  try { await frontend?.close(); }
  finally {
    try { if (api) await new Promise<void>(done => { api!.close(() => done()); api!.closeAllConnections(); }); }
    finally { if (isolated) await isolated.dispose(); }
  }
}
async function start() {
  if (process.env.LAB4_E2E_APPROVED !== "1") throw new Error("Explicit isolated E2E approval is required.");
  const url = disposableUrl();
  if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/toktickit_lab4_test_actions" || decodeURIComponent(url.username) !== "toktickit_lab4_runner")
    throw new Error("The dedicated Issue #3 test target is required.");
  if ([...url.searchParams.keys()].some(key => !["schema", "sslmode", "connect_timeout", "application_name"].includes(key))) throw new Error("Unsupported connection options.");
  // All of these checks are reads, before the helper's first schema CREATE.
  const inspector = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const rows = await inspector.$queryRaw<Array<{ database: string; address: string; port: number; version: number; safe_role: boolean; permissions: boolean }>>`
      SELECT current_database() AS database, host(inet_server_addr()) AS address, inet_server_port() AS port,
        current_setting('server_version_num')::int AS version,
        (NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls) AS safe_role,
        (has_database_privilege(current_user, current_database(), 'CONNECT') AND has_database_privilege(current_user, current_database(), 'CREATE') AND has_database_privilege(current_user, current_database(), 'TEMPORARY')) AS permissions
      FROM pg_roles WHERE rolname = current_user`;
    const identity = rows[0];
    if (!identity || identity.database !== "toktickit_lab4_test_actions" ||  identity.version < 180000 || identity.version >= 190000 || !identity.safe_role || !identity.permissions)
      throw new Error("Test server identity/permissions do not match the approved isolated target.");
    const tables = await inspector.$queryRaw<Array<{ count: number }>>`SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','f')`;
    if (tables[0].count !== 0) throw new Error("Existing user tables found. Refusing to reuse or clean them.");
  } finally { await inspector.$disconnect(); }
  isolated = await isolatedLab4Database();
  isolated.migrate();
  // Only this child receives the invocation-owned schema URL. No URL is sent over IPC.
  process.env.DATABASE_URL = isolated.url.toString();
  const { app } = await import("../../server/src/app.js");
  api = await new Promise<Server>((done, fail) => { const server = app.listen(0, "127.0.0.1", () => done(server)); server.once("error", fail); });
  const address = api.address();
  if (!address || typeof address === "string") throw new Error("API port unavailable.");
  const apiUrl = `http://localhost:${address.port}`;
  const { createServer } = await import(pathToFileURL(resolve("../client/node_modules/vite/dist/node/index.js")).href);
  const vite = await createServer({ configFile: resolve("../client/vite.config.ts"), root: resolve("../client"),
    server: { host: "localhost", port: 5174, strictPort: true }, define: { "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl) }, logLevel: "silent" });
  frontend = vite;
  await vite.listen();
  return { apiUrl, baseURL: "http://localhost:5174" };
}
async function fixture() {
  if (!isolated) throw new Error("Harness unavailable.");
  const stamp = randomUUID(); const password = "ActionsUiFixture123!";
  const passwordHash = await bcrypt.hash(password, 4);
  const users = [];
  for (const [index, role] of (["IT_STAFF", "IT_STAFF", "IT_STAFF", "ADMINISTRATOR", "REQUESTER", "REQUESTER", "IT_STAFF"] as const).entries()) {
    users.push(await isolated.prisma.user.create({ data: { name: `Action UI actor ${index} ${stamp.slice(0, 8)}`, email: `action-ui-${index}-${stamp}@example.test`, role, passwordHash, isActive: index !== 6, mustChangePassword: false } }));
  }
  const category = await isolated.prisma.category.create({ data: { name: `Action UI hardware ${stamp}` } });
  const system = await isolated.prisma.relatedSystem.create({ data: { name: `Action UI office ${stamp}` } });
  const ticket = await isolated.prisma.ticket.create({ data: { ticketNumber: `ACTION-UI-${stamp}`, summary: "Printer cannot connect", description: "The office printer is offline.", requesterId: users[4].id, categoryId: category.id, relatedSystemId: system.id, requestedPriority: "HIGH", currentStatus: "OPEN", assignedStaffId: users[0].id } });
  cases.set(stamp, users.map(user => user.id));
  return { caseId: stamp, password, ticketId: ticket.id, ticketNumber: ticket.ticketNumber, users: users.map(({ id, name, email, role }) => ({ id, name, email, role })) };
}
process.on("message", async (message: { type: string; id?: string; caseId?: string; userIndex?: number }) => {
  try {
    if (message.type === "stop") { await stop(); process.exit(0); }
    if (stopping) return;
    if (message.type === "fixture") process.send?.({ id: message.id, data: await fixture() });
    else if (message.type === "deactivate") {
      const ids = cases.get(message.caseId ?? "");
      // Only an actor created by this harness, never arbitrary account IDs.
      if (!isolated || !ids || ![0, 1, 2].includes(message.userIndex ?? -1)) throw new Error("Invalid fixture actor.");
      await isolated.prisma.user.update({ where: { id: ids[message.userIndex!] }, data: { isActive: false } });
      process.send?.({ id: message.id, data: true });
    }
  } catch { process.send?.({ id: message.id, error: "Isolated UI fixture operation failed. Details suppressed." }); }
});
process.on("disconnect", () => { void stop().finally(() => process.exit(1)); });
start().then(data => process.send?.({ type: "ready", data })).catch(async () => {
  // Never relay native/Prisma errors, environment values or connection details.
  process.send?.({ type: "failed", error: "Isolated UI setup refused or failed. Verify approval, empty dedicated PostgreSQL 18 target, runner permissions and free port 5174. Details suppressed." });
  try { await stop(); } finally { process.exit(1); }
});
