import { Prisma, RequestedPriority, TicketPriority, TicketStatus } from "@prisma/client";
import { Router, Response } from "express";
import {
  authenticateToken,
  AuthRequest,
} from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import { getPrisma } from "../prisma.js";
import { parseId } from "../actions/actions.rules.js";
import { parseAssignment, parsePriority, parseStatus } from "../workflow/ticket-workflow.rules.js";
import { assignTicket, getWorkflowTicket, prioritizeTicket, transitionTicket } from "../workflow/ticket-workflow.service.js";
import { workflowFailure } from "../workflow/ticket-workflow.routes.js";

const router = Router();


// IT Staff Ticket Queue: all statuses remain visible unless explicitly filtered.
// I4: Staff/Admin operational access follows the explicitly approved permission matrix.
router.get("/tickets", authenticateToken, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: AuthRequest, res: Response) => {
  const query = req.query;
  const scalar = (key: string, fallback = "") => query[key] === undefined ? fallback : typeof query[key] === "string" ? query[key] as string : null;
  const search = scalar("search")?.trim();
  const status = scalar("status");
  // Keep the existing priority parameter as the Requested Priority filter.
  const priority = scalar("priority");
  const itPriority = scalar("itPriority");
  const assigned = scalar("assigned");
  const sort = scalar("sort", "createdAt");
  const order = scalar("order", "desc");
  const page = scalar("page", "1");
  const limit = scalar("limit", "10");
  const sorts = ["createdAt", "updatedAt", "ticketNumber", "requestedPriority", "itPriority"];
  if (search == null || search.length > 200 || status === null || priority === null || itPriority === null || assigned === null ||
      (status && !Object.values(TicketStatus).includes(status as TicketStatus)) ||
      (priority && !Object.values(RequestedPriority).includes(priority as RequestedPriority)) ||
      (itPriority && !Object.values(TicketPriority).includes(itPriority as TicketPriority)) ||
      !["", "true", "false"].includes(assigned) || !sort || !sorts.includes(sort) || !["asc", "desc"].includes(order ?? "") ||
      !page || !/^[1-9]\d*$/.test(page) || !limit || !/^[1-9]\d*$/.test(limit) ||
      !Number.isSafeInteger(Number(page)) || Number(page) > 1000000 || Number(limit) > 100) {
    return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Invalid ticket queue filters, sorting or pagination." } });
  }
  const where: Prisma.TicketWhereInput = {
    ...(status ? { currentStatus: status as TicketStatus } : {}),
    ...(priority ? { requestedPriority: priority as RequestedPriority } : {}),
    ...(itPriority ? { itPriority: itPriority as TicketPriority } : {}),
    ...(assigned === "true" ? { assignedStaffId: { not: null } } : assigned === "false" ? { assignedStaffId: null } : {}),
    ...(search ? { OR: [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
      { requester: { email: { contains: search, mode: "insensitive" } } },
    ] } : {}),
  };
  try {
    const prisma = getPrisma();
    // Count and rows use the same snapshot; clamp pages after records change.
    const result = await prisma.$transaction(async tx => {
      const total = await tx.ticket.count({ where });
      const totalPages = Math.ceil(total / Number(limit));
      const currentPage = Math.min(Number(page), Math.max(1, totalPages));
      const data = await tx.ticket.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true, email: true } },
          assignedStaff: { select: { id: true, name: true, email: true } },
          category: true, relatedSystem: true,
        },
        // Prisma/PostgreSQL enums follow the schema's LOW -> URGENT order.
        orderBy: [{ [sort]: order } as Prisma.TicketOrderByWithRelationInput, { id: "desc" }],
        skip: (currentPage - 1) * Number(limit), take: Number(limit),
      });
      return { data, pagination: { page: currentPage, limit: Number(limit), total, totalPages } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return res.json(result);
  } catch {
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to retrieve ticket queue." } });
  }
});
// I4 explicitly extends operational reads and writes to Administrators.
router.get("/tickets/:id", authenticateToken, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: AuthRequest, res) => {
  try { return res.json({ data: await getWorkflowTicket(parseId(req.params.id), req.user!.userId) }); }
  catch (error) { return workflowFailure(res, error); }
});
// Only active IT Staff are valid primary owners. Expose no account secrets.
router.get("/users", authenticateToken, requireRole("IT_STAFF", "ADMINISTRATOR"), async (_req, res) => {
  try {
    const data = await getPrisma().user.findMany({
      where: { role: "IT_STAFF", isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return res.json({ data });
  } catch {
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to load active IT Staff." } });
  }
});

// Versions, role revalidation and writes/history share the workflow transaction.
router.patch("/tickets/:id/assign", authenticateToken, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: AuthRequest, res) => {
  try { return res.json({ data: await assignTicket(parseId(req.params.id), req.user!.userId, parseAssignment(req.body)) }); }
  catch (error) { return workflowFailure(res, error); }
});
router.patch("/tickets/:id/status", authenticateToken, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: AuthRequest, res) => {
  try { return res.json({ data: await transitionTicket(parseId(req.params.id), req.user!.userId, parseStatus(req.body)) }); }
  catch (error) { return workflowFailure(res, error); }
});
router.patch("/tickets/:id/priority", authenticateToken, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: AuthRequest, res) => {
  try { return res.json({ data: await prioritizeTicket(parseId(req.params.id), req.user!.userId, parsePriority(req.body)) }); }
  catch (error) { return workflowFailure(res, error); }
});
export default router;
