import { test as base, expect } from "@playwright/test";
import bcrypt from "../../server/node_modules/bcrypt";
import { randomUUID } from "node:crypto";
import { ownedI6Prisma, assertI6ApiUrl } from "../../server/tests/helpers/i6-database";
import { appendRevision } from "../../server/src/actions/actions.service";
export const test = base.extend<{
    sample: {
        db: ReturnType<typeof ownedI6Prisma>;
        api: string;
        password: string;
        users: {
            id: number;
            name: string;
            email: string;
            role: string;
        }[];
        ticket: {
            id: number;
            ticketNumber: string;
        };
        actionId: number;
    };
}>({
    sample: async ({}, use) => {
        const db = ownedI6Prisma(), api = assertI6ApiUrl(), stamp = randomUUID(), password = "I6BrowserFixture123!", passwordHash = await bcrypt.hash(password, 4), users: Array<{
            id: number;
            name: string;
            email: string;
            role: string;
        }> = [];
        try {
            for (const [i, role] of (["REQUESTER", "REQUESTER", "IT_STAFF", "IT_STAFF", "ADMINISTRATOR"] as const).entries())
                users.push(await db.user.create({ data: { name: "I6 " + role + " " + stamp.slice(0, 8) + " long display name for wrapping", email: "i6-" + i + "-" + stamp + "@example.test", role, passwordHash, mustChangePassword: false }, select: { id: true, name: true, email: true, role: true } }));
            const category = await db.category.create({ data: { name: "I6 category " + stamp } }), system = await db.relatedSystem.create({ data: { name: "I6 office " + stamp } });
            const ticket = await db.ticket.create({ data: { ticketNumber: "I6-UI-" + stamp, requesterId: users[0].id, assignedStaffId: users[2].id, categoryId: category.id, relatedSystemId: system.id, summary: ("I6 network printer connectivity and long text wrapping " + stamp).slice(0, 120), description: "A representative long but valid description. ".repeat(20), requestedPriority: "HIGH", itPriority: "URGENT", currentStatus: "OPEN" }, select: { id: true, ticketNumber: true } });
            await db.ticketStatusEvent.create({ data: { ticketId: ticket.id, fromStatus: "NEW", toStatus: "OPEN", actorId: users[2].id, actorName: users[2].name, actorRole: "IT_STAFF" } });
            const action = await db.$transaction(async (tx) => { const value = await tx.actionTaken.create({ data: { ticketId: ticket.id, createdById: users[2].id, assignedToId: users[3].id, description: "Inspect the printer cable and network configuration. ".repeat(12) } }); await appendRevision(tx, value, { ...users[2], role: "IT_STAFF" }, "CREATE"); return value; });
            await use({ db, api, password, users, ticket, actionId: action.id });
        }
        finally {
            await db.$disconnect();
        }
    },
});
export { expect };
