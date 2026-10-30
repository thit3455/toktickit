import { Prisma, PrismaClient, TicketStatus, UserRole } from "@prisma/client";
import { appendRevision } from "../src/actions/actions.service.js";

type SeedParticipant = { id: number; name: string; role: UserRole; isActive: boolean };
// Pure eligibility policy, also checked without database access. Seed performer
// doubles as Ticket Owner, which requires IT_STAFF even though API performers
// may also be Administrators. Initial-password settings are never rewritten.
export function validateSeedParticipants(accounts: readonly SeedParticipant[], ids: { creatorId: number; assigneeId: number; performerId: number }) {
  function eligible(id: number, roles: readonly UserRole[], purpose: string) {
    const account = accounts.find(value => value.id === id);
    if (!account?.isActive || !roles.includes(account.role)) {
      throw new Error(`Lab 4 seed requires an active ${purpose}. Existing accounts were preserved.`);
    }
    return account;
  }
  return {
    creator: eligible(ids.creatorId, ["IT_STAFF", "ADMINISTRATOR"], "IT Staff or Administrator creator"),
    assignee: eligible(ids.assigneeId, ["IT_STAFF"], "IT Staff assignee"),
    performer: eligible(ids.performerId, ["IT_STAFF"], "IT Staff performer/Ticket Owner"),
  };
}

// Called by the existing seed entry point. Stable identities and create-only Ticket
// transactions preserve passwords, edits, assignments, history and original dates.
export async function seedLab4(prisma: PrismaClient, passwordHash: string) {
  const definitions = [
    ["requester", "REQUESTER", true], ["empty-requester", "REQUESTER", true],
    ["creator", "IT_STAFF", true], ["assignee", "IT_STAFF", true],
    ["performer", "IT_STAFF", true], ["inactive-assignee", "IT_STAFF", false], ["empty-staff", "IT_STAFF", true],
  ] as const;
  const users = new Map<string, { id: number; name: string; role: UserRole }>();
  for (const [key, role, isActive] of definitions) {
    const user = await prisma.user.upsert({ where: { email: `lab4-${key}@toktickit.test` }, update: {},
      create: { name: `Lab 4 ${key}`, email: `lab4-${key}@toktickit.test`, role, isActive, passwordHash, mustChangePassword: true } });
    users.set(key, user);
  }
  const [category, system] = await Promise.all([
    prisma.category.upsert({ where: { name: "Network" }, update: {}, create: { name: "Network" } }),
    prisma.relatedSystem.upsert({ where: { name: "Campus Wi-Fi" }, update: {}, create: { name: "Campus Wi-Fi" } }),
  ]);
  const ids = { creatorId: users.get("creator")!.id, assigneeId: users.get("assignee")!.id, performerId: users.get("performer")!.id };
  const statuses: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED", "OPEN"];
  for (const [index, status] of statuses.entries()) {
    const ticketNumber = `TKT-LAB4-${String(index + 1).padStart(3, "0")}`;
    await prisma.$transaction(async tx => {
      if (await tx.ticket.findUnique({ where: { ticketNumber } })) return;
      // Read eligibility and attribution inside the same Serializable transaction
      // as new fixture writes. Existing Tickets bypass all writes and validation.
      const accounts = await tx.user.findMany({ where: { id: { in: Object.values(ids) } }, select: { id: true, name: true, role: true, isActive: true } });
      const { creator, assignee, performer } = validateSeedParticipants(accounts, ids);
      const now = new Date();
      const ticket = await tx.ticket.create({ data: {
        ticketNumber, requesterId: users.get("requester")!.id, assignedStaffId: index === 0 ? null : performer.id,
        categoryId: category.id, relatedSystemId: system.id, summary: `Lab 4 ${status}: ${index === 8 ? "inactive-assignee rejection example" : "action lifecycle example"}`,
        description: "Repeatable Lab 4 demonstration. Actions Taken are shared with the requester; Internal Notes remain private.",
        requestedPriority: (["LOW", "MEDIUM", "HIGH"] as const)[index % 3], itPriority: (["LOW", "MEDIUM", "HIGH", "URGENT"] as const)[index % 4],
        currentStatus: status, createdAt: now, updatedAt: now,
      } });
      let version = 0;
      const count = index === 0 ? 0 : index === 2 || index === 6 ? 3 : 1;
      for (let offset = 0; offset < count; offset++) {
        const followUp = status === "WAITING_FOR_REQUESTER" || (index === 2 && offset === 2);
        let action = await tx.actionTaken.create({ data: {
          ticketId: ticket.id, createdById: creator.id, assignedToId: assignee.id,
          description: offset === 0 ? "Inspect wireless logs" : `Follow-up investigation ${offset}`,
          followUpRequired: followUp, followUpNote: followUp ? "Ask the requester to retest after class." : "",
          attachmentNotes: "Refer to existing Ticket Attachments where applicable.", createdAt: now, updatedAt: now,
        } });
        await appendRevision(tx, action, creator, "CREATE"); version++;
        const completed = ["RESOLVED", "CLOSED", "REOPENED", "WAITING_FOR_REQUESTER"].includes(status) && offset === 0 || index === 2 && offset === 0;
        if (completed || status === "CANCELLED" || (index === 2 && offset === 1)) {
          action = await tx.actionTaken.update({ where: { id: action.id }, data: {
            status: completed ? "COMPLETED" : status === "CANCELLED" ? "CANCELLED" : "IN_PROGRESS", version: { increment: 1 }, updatedAt: now,
            ...(completed ? { result: "Reviewed logs and verified the connection.", performedById: performer.id, completedAt: now } : {}),
            ...(status === "CANCELLED" ? { cancellationReason: "Duplicate request; retained for reference.", cancelledAt: now } : {}),
          } });
          await appendRevision(tx, action, completed ? performer : creator, "STATUS"); version++;
        }
      }
      // These are new demonstration Tickets, with known transitions, never legacy backfill.
      const path: TicketStatus[] = status === "NEW" ? [] : status === "CANCELLED" ? ["CANCELLED"] :
        status === "CLOSED" ? ["OPEN", "RESOLVED", "CLOSED"] : status === "REOPENED" ? ["OPEN", "RESOLVED", "REOPENED"] :
        status === "OPEN" ? ["OPEN"] : ["OPEN", status];
      let from: TicketStatus = "NEW";
      for (const to of path) {
        await tx.ticketStatusEvent.create({ data: { ticketId: ticket.id, fromStatus: from, toStatus: to,
          actorId: performer.id, actorName: performer.name, actorRole: performer.role, createdAt: now,
          reason: ["CANCELLED", "REOPENED"].includes(to) ? "Known Lab 4 demonstration transition." : null } });
        from = to; version++;
      }
      await tx.ticket.update({ where: { id: ticket.id }, data: { version, updatedAt: now } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
