// Explicit I5 approval only. This child never loads project environment files.
import { openI5Database } from "../../server/tests/helpers/i5-database.js";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Server } from "node:http";
const bcrypt = createRequire(resolve("package.json"))("bcrypt") as typeof import("../../server/node_modules/@types/bcrypt/index.js");
let owned: Awaited<ReturnType<typeof openI5Database>> | undefined, api: Server | undefined, frontend: { close(): Promise<void> } | undefined;
let appDisconnect: (() => Promise<void>) | undefined, stopping = false;
async function stop() {
  if (stopping) return; stopping = true;
  try { await frontend?.close(); } finally {
    try { if (api) await new Promise<void>(done => { api!.close(() => done()); api!.closeAllConnections(); }); await appDisconnect?.(); }
    finally { await owned?.dispose(); }
  }
}
async function start() {
  owned = await openI5Database(); owned.migrate();
  process.env.DATABASE_URL = owned.url.href;
  const { app } = await import("../../server/src/app.js");
  const { getPrisma } = await import("../../server/src/prisma.js"); appDisconnect = () => getPrisma().$disconnect();
  const password = "DashboardFixture123!", stamp = randomUUID(), passwordHash = await bcrypt.hash(password, 4);
  const users = [];
  for (const [index, role] of (["IT_STAFF", "IT_STAFF", "REQUESTER", "REQUESTER", "ADMINISTRATOR", "REQUESTER"] as const).entries()) {
    users.push(await owned.prisma.user.create({ data: { name: "I5 actor " + index, email: "i5-" + index + "-" + stamp + "@example.test", role, passwordHash, isActive: true, mustChangePassword: false } }));
  }
  const category = await owned.prisma.category.create({ data: { name: "I5 hardware " + stamp } });
  const system = await owned.prisma.relatedSystem.create({ data: { name: "I5 office " + stamp } });
  const time = new Date(Date.now() - 1000);
  async function ticket(suffix: string, currentStatus: "OPEN" | "WAITING_FOR_REQUESTER" | "RESOLVED", requesterId: number, assignedStaffId: number | null, itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT") {
    return owned!.prisma.ticket.create({ data: { ticketNumber: "I5-" + suffix + "-" + stamp, requesterId, assignedStaffId, categoryId: category.id, relatedSystemId: system.id, summary: "Dashboard fixture " + suffix, description: "Owned disposable I5 schema", requestedPriority: "HIGH", currentStatus, itPriority, createdAt: time, updatedAt: time } });
  }
  const open = await ticket("OPEN", "OPEN", users[2].id, users[0].id, "HIGH");
  const waiting = await ticket("WAIT", "WAITING_FOR_REQUESTER", users[2].id, users[1].id, "MEDIUM");
  const resolved = await ticket("RESOLVED", "RESOLVED", users[2].id, users[0].id, "LOW");
  const other = await ticket("OTHER", "OPEN", users[3].id, null, "URGENT");
  await owned.prisma.ticketStatusEvent.create({ data: { ticketId: resolved.id, fromStatus: "IN_PROGRESS", toStatus: "RESOLVED", actorId: users[0].id, actorName: users[0].name, actorRole: "IT_STAFF", createdAt: time } });
  const { appendRevision } = await import("../../server/src/actions/actions.service.js");
  let targetActionId = 0;
  for (let index = 0; index < 22; index++) {
    const action = await owned.prisma.$transaction(async tx => {
      const item = await tx.actionTaken.create({ data: { ticketId: waiting.id, createdById: users[1].id, assignedToId: users[0].id, description: "Dashboard assigned action " + index,
        status: index === 21 ? "PLANNED" : "COMPLETED", result: index === 21 ? "" : "Completed fixture work", performedById: index === 21 ? null : users[0].id, completedAt: index === 21 ? null : time, createdAt: time, updatedAt: time } });
      await appendRevision(tx, item, users[1], "CREATE"); return item;
    });
    targetActionId = action.id;
  }
  api = await new Promise<Server>((done, fail) => { const server = app.listen(0, "127.0.0.1", () => done(server)); server.once("error", fail); });
  const address = api.address(); if (!address || typeof address === "string") throw new Error("Owned API address unavailable.");
  const apiUrl = "http://localhost:" + address.port;
  const { createServer } = await import(pathToFileURL(resolve("../client/node_modules/vite/dist/node/index.js")).href);
  const vite = await createServer({ configFile: resolve("../client/vite.config.ts"), root: resolve("../client"), cacheDir: resolve("../artifacts/lab-04/i5-local/vite-cache"),
    server: { host: "localhost", port: 5174, strictPort: true }, define: { "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl) }, logLevel: "silent" });
  frontend = vite;
  await vite.listen();
  return { apiUrl, password, targetActionId, users: users.map(({ id, name, email, role }) => ({ id, name, email, role })), tickets: { open, waiting, resolved, other } };
}
process.on("message", message => { if ((message as { type: string }).type === "stop") void stop().then(() => process.exit(0)).catch(() => process.exit(1)); });
process.on("disconnect", () => { void stop().finally(() => process.exit(1)); });
start().then(data => process.send?.({ type: "ready", data })).catch(async () => {
  process.send?.({ type: "failed", error: "Issue #5 setup refused or failed. Verify approval, newly owned empty PostgreSQL 18 target, runner privileges and free port 5174. Details suppressed." });
  try { await stop(); } finally { process.exit(1); }
});
