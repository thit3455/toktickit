import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import type { PrismaClient, TicketStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";
import { performance } from "node:perf_hooks";
import { cpus, platform, release } from "node:os";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { app } from "../../src/app.js";
import { assertI6DatabaseConfiguration } from "../helpers/i6-database.js";
import { isolatedLab4Database } from "../helpers/lab4-database.js";
let db: PrismaClient;
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => db }));
describe.skipIf(process.env.LAB4_I6_TEST_APPROVED !== "1")("Approved representative dashboard performance smoke", () => {
    let owned: Awaited<ReturnType<typeof isolatedLab4Database>>, agents: ReturnType<typeof request.agent>[];
    beforeAll(async () => {
        assertI6DatabaseConfiguration();
        owned = await isolatedLab4Database();
        db = owned.prisma;
        owned.migrate();
        const password = "PerformanceFixture123!", passwordHash = await bcrypt.hash(password, 4), users: Array<{
            id: number;
            email: string;
            name: string;
            role: string;
        }> = [];
        for (const [index, role] of (["REQUESTER", "REQUESTER", "IT_STAFF", "IT_STAFF"] as const).entries())
            users.push(await db.user.create({ data: { email: "perf-" + index + "@example.test", name: "I6 performance actor " + index, role, passwordHash, mustChangePassword: false }, select: { id: true, email: true, name: true, role: true } }));
        const category = await db.category.create({ data: { name: "I6 performance category" } }), system = await db.relatedSystem.create({ data: { name: "I6 performance office" } }), time = new Date(Date.now() - 1000);
        const statuses: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
        await db.ticket.createMany({ data: Array.from({ length: 1000 }, (_, i) => ({ ticketNumber: "I6-PERF-" + i, requesterId: users[i % 3 === 0 ? 1 : 0].id, assignedStaffId: i % 4 === 0 && !["RESOLVED", "CLOSED"].includes(statuses[i % 8]) ? null : users[2 + i % 2].id, categoryId: category.id, relatedSystemId: system.id, summary: "Representative performance Ticket " + i, description: "Owned synthetic performance data only", requestedPriority: "HIGH" as const, itPriority: (["LOW", "MEDIUM", "HIGH", "URGENT"] as const)[i % 4], currentStatus: statuses[i % 8], createdAt: time, updatedAt: time })) });
        const tickets = await db.ticket.findMany({ orderBy: { id: "asc" }, select: { id: true, currentStatus: true } });
        await db.actionTaken.createMany({ data: tickets.flatMap((ticket, i) => Array.from({ length: 3 }, (_, j) => ({ ticketId: ticket.id, createdById: users[3].id, assignedToId: users[2 + i % 2].id, description: "Performance work " + i + "/" + j, status: ticket.currentStatus === "CANCELLED" && j < 2 ? "CANCELLED" as const : ["RESOLVED", "CLOSED"].includes(ticket.currentStatus) || j === 2 ? "COMPLETED" as const : (["PLANNED", "IN_PROGRESS"] as const)[j], result: ["RESOLVED", "CLOSED"].includes(ticket.currentStatus) || j === 2 ? "Completed synthetic work" : "", performedById: ["RESOLVED", "CLOSED"].includes(ticket.currentStatus) || j === 2 ? users[2 + i % 2].id : null, completedAt: ["RESOLVED", "CLOSED"].includes(ticket.currentStatus) || j === 2 ? time : null, cancelledAt: ticket.currentStatus === "CANCELLED" && j < 2 ? time : null, cancellationReason: ticket.currentStatus === "CANCELLED" && j < 2 ? "Synthetic performance cancellation" : null, createdAt: time, updatedAt: time }))) });
        await db.ticketStatusEvent.createMany({ data: tickets.filter(t => ["RESOLVED", "CLOSED"].includes(t.currentStatus)).map(ticket => ({ ticketId: ticket.id, fromStatus: "IN_PROGRESS" as const, toStatus: "RESOLVED" as const, actorId: users[2].id, actorName: users[2].name, actorRole: "IT_STAFF" as const, createdAt: time })) });
        agents = [request.agent(app), request.agent(app)];
        for (const [i, userIndex] of [0, 2].entries())
            expect((await agents[i].post("/api/auth/login").send({ email: users[userIndex].email, password })).status).toBe(200);
    }, 120000);
    afterAll(async () => { await owned?.dispose(); });
    it("retains all samples and meets the approved two-second p95 target for both endpoints", async () => {
        expect(await db.ticket.count()).toBe(1000);
        expect(await db.actionTaken.count()).toBe(3000);
        expect(await db.actionTaken.count({ where: { ticket: { currentStatus: { in: ["RESOLVED", "CLOSED", "CANCELLED"] } }, status: { in: ["PLANNED", "IN_PROGRESS"] } } })).toBe(0);
        expect(await db.ticket.count({ where: { currentStatus: { in: ["RESOLVED", "CLOSED"] }, assignedStaffId: null } })).toBe(0);
        const results = [];
        for (const [index, endpoint] of ["/api/requester/dashboard", "/api/staff/dashboard"].entries()) {
            const warmups = [];
            for (let i = 0; i < 3; i++)
                warmups.push((await agents[index].get(endpoint)).status);
            const samples = [];
            for (let i = 0; i < 20; i++) {
                const start = performance.now(), response = await agents[index].get(endpoint), milliseconds = performance.now() - start;
                const data = response.body.data;
                samples.push({ milliseconds, status: response.status, recent: data?.recentTickets?.length, secondary: (data?.attentionTickets ?? data?.myActiveActions)?.length });
            }
            const sorted = samples.map(s => s.milliseconds).sort((a, b) => a - b), p95 = sorted[Math.ceil(.95 * sorted.length) - 1];
            results.push({ endpoint, warmups, samples, p95 });
        }
        const [server] = await db.$queryRawUnsafe<{
            version: string;
        }[]>("SELECT current_setting('server_version') AS version");
        const report = { dataset: { tickets: 1000, actions: 3000 }, warmups: 3, samplesPerEndpoint: 20, thresholdMilliseconds: 2000, method: "Sequential authenticated Supertest HTTP round-trip using performance.now; all samples retained", machine: { platform: platform(), release: release(), cpu: cpus()[0]?.model, node: process.version, postgres: server.version }, results };
        writeFileSync(resolve("../artifacts/lab-04/i6-local/performance-" + Date.now() + ".json"), JSON.stringify(report, null, 2));
        for (const result of results) {
            expect(result.warmups).toEqual([200, 200, 200]);
            for (const sample of result.samples) {
                expect(sample.status).toBe(200);
                expect(sample.recent).toBeLessThanOrEqual(5);
                expect(sample.secondary).toBeLessThanOrEqual(5);
            }
            expect(result.p95).toBeLessThanOrEqual(2000);
        }
    }, 120000);
});
