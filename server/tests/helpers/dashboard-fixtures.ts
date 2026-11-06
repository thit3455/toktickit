import { randomUUID } from "node:crypto";
import { type Prisma, type PrismaClient, type TicketStatus } from "@prisma/client";
import { requesterFixture } from "./requester.js";
export async function dashboardFixture(db: PrismaClient, asOf: Date) {
  const auth = await requesterFixture();
  const category = await db.category.create({ data: { name: "I5 category " + randomUUID() } });
  const system = await db.relatedSystem.create({ data: { name: "I5 system " + randomUUID() } });
  const timestamp = new Date(asOf.getTime() - 1000);
  async function ticket(extra: Partial<Prisma.TicketUncheckedCreateInput> = {}) {
    return db.ticket.create({ data: { ticketNumber: "I5-" + randomUUID(), requesterId: auth.users[0].id, assignedStaffId: auth.users[2].id, categoryId: category.id, relatedSystemId: system.id, summary: "Disposable dashboard fixture", description: "Owned Issue #5 test schema only", requestedPriority: "HIGH", currentStatus: "OPEN", createdAt: timestamp, updatedAt: timestamp, ...extra } });
  }
  async function event(ticketId: number, createdAt: Date, toStatus: TicketStatus = "RESOLVED") {
    return db.ticketStatusEvent.create({ data: { ticketId, fromStatus: "IN_PROGRESS", toStatus, actorId: auth.users[2].id, actorName: auth.users[2].name, actorRole: "IT_STAFF", createdAt } });
  }
  async function action(ticketId: number, extra: Partial<Prisma.ActionTakenUncheckedCreateInput> = {}) {
    return db.actionTaken.create({ data: { ticketId, createdById: auth.users[2].id, assignedToId: auth.users[2].id, description: "Disposable assigned work", status: "PLANNED", createdAt: timestamp, updatedAt: timestamp, ...extra } });
  }
  return { ...auth, ticket, event, action };
}
