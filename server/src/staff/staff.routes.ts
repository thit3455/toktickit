import { Prisma, RequestedPriority, TicketPriority, TicketStatus } from "@prisma/client";
import { Router, Response } from "express";
import {
  authenticateToken,
  AuthRequest,
} from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import { getPrisma } from "../prisma.js";

const router = Router();


// IT Staff Ticket Queue: all statuses remain visible unless explicitly filtered.
router.get("/tickets", authenticateToken, requireRole("IT_STAFF"), async (req: AuthRequest, res: Response) => {
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
// IT Staff Ticket Detail
router.get(
  "/tickets/:id",
  authenticateToken,
  requireRole("IT_STAFF"),
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const ticketId = Number(req.params.id);

      if (
        !Number.isInteger(ticketId) ||
        ticketId <= 0
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_TICKET_ID",
            message: "Invalid ticket id.",
          },
        });
      }


      const prisma = getPrisma();


      const ticket =
        await prisma.ticket.findUnique({
          where: {
            id: ticketId,
          },

          include: {
            requester: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },

            assignedStaff: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },

            category: true,

            relatedSystem: true,

            attachments: true,
          },
        });


      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }


      return res.status(200).json({
        data: ticket,
      });


    } catch {

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message:
            "Unable to retrieve ticket.",
        },
      });

    }
  }
);
// Only active IT Staff are valid primary owners. Expose no account secrets.
router.get("/users", authenticateToken, requireRole("IT_STAFF"), async (_req, res) => {
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

// No assignedStaffId means claim; an explicit ID means reassignment.
router.patch("/tickets/:id/assign", authenticateToken, requireRole("IT_STAFF"), async (req: AuthRequest, res: Response) => {
  const ticketId = Number(req.params.id);
  const reassign = Object.prototype.hasOwnProperty.call(req.body ?? {}, "assignedStaffId");
  const staffId = reassign ? req.body.assignedStaffId : req.user!.userId;
  if (!Number.isSafeInteger(ticketId) || ticketId <= 0)
    return res.status(400).json({ error: { code: "INVALID_TICKET_ID", message: "Invalid ticket id." } });
  if (typeof staffId !== "number" || !Number.isSafeInteger(staffId) || staffId <= 0)
    return res.status(400).json({ error: { code: "INVALID_STAFF_ID", message: "Select a valid active IT Staff member." } });
  try {
    const result = await getPrisma().$transaction(async tx => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return { status: 404, error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } };
      const staff = await tx.user.findFirst({ where: { id: staffId, role: "IT_STAFF", isActive: true } });
      if (!staff) return { status: 400, error: { code: "INVALID_STAFF_ID", message: "Select a valid active IT Staff member." } };
      if (!reassign) {
        // Conditional write prevents a claim from overwriting another owner's claim.
        const claim = await tx.ticket.updateMany({ where: { id: ticketId, OR: [{ assignedStaffId: null }, { assignedStaffId: staffId }] }, data: { assignedStaffId: staffId } });
        if (!claim.count) return { status: 409, error: { code: "TICKET_ALREADY_ASSIGNED", message: "This ticket already has an owner. Refresh the ticket and use Reassign Ticket." } };
      } else {
        await tx.ticket.update({ where: { id: ticketId }, data: { assignedStaffId: staffId } });
      }
      const data = await tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: { assignedStaff: { select: { id: true, name: true, email: true } } } });
      return { status: 200, data };
    });
    return res.status(result.status).json("error" in result ? { error: result.error } : { data: result.data });
  } catch {
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to assign ticket." } });
  }
});
// Update Ticket Status
router.patch(
  "/tickets/:id/status",
  authenticateToken,
  requireRole("IT_STAFF"),
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {

      const ticketId = Number(req.params.id);

      const {
        currentStatus,
      } = req.body;


      if (
        !Number.isInteger(ticketId) ||
        ticketId <= 0
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_TICKET_ID",
            message: "Invalid ticket id.",
          },
        });
      }


      const allowedStatuses = [
        "OPEN",
        "REOPENED",
        "IN_PROGRESS",
        "WAITING_FOR_REQUESTER",
        "RESOLVED",
        "CLOSED",
      ];


      if (
        !allowedStatuses.includes(
          currentStatus
        )
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_STATUS",
            message: "Invalid ticket status.",
          },
        });
      }


      const prisma = getPrisma();


      const ticket =
        await prisma.ticket.findUnique({
          where: {
            id: ticketId,
          },
        });


      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }


      const updatedTicket =
        await prisma.ticket.update({
          where: {
            id: ticketId,
          },

          data: {
            currentStatus,
          },
        });


      return res.status(200).json({
        data: updatedTicket,
      });


    } catch {

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message:
            "Unable to update ticket status.",
        },
      });

    }
  }
);
// Update Ticket Priority
router.patch(
  "/tickets/:id/priority",
  authenticateToken,
  requireRole("IT_STAFF"),
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {

      const ticketId = Number(req.params.id);

      const {
        itPriority,
        } = req.body;


      if (
        !Number.isInteger(ticketId) ||
        ticketId <= 0
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_TICKET_ID",
            message: "Invalid ticket id.",
          },
        });
      }


      const allowedPriority = [
        "LOW",
        "MEDIUM",
        "HIGH",
        "URGENT",
      ];


      if (
        !allowedPriority.includes(
           itPriority
        )
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_PRIORITY",
            message: "Invalid priority.",
          },
        });
      }


      const prisma = getPrisma();


      const ticket =
        await prisma.ticket.findUnique({
          where: {
            id: ticketId,
          },
        });


      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }


      const updatedTicket =
        await prisma.ticket.update({
          where: {
            id: ticketId,
          },

          data: {
              itPriority,
          },
        });


      return res.status(200).json({
        data: updatedTicket,
      });


    } catch {

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message:
            "Unable to update priority.",
        },
      });

    }
  }
);

export default router;
