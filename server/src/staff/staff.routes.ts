import { Router, Response } from "express";
import {
  authenticateToken,
  AuthRequest,
} from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import { getPrisma } from "../prisma.js";

const router = Router();


// IT Staff Ticket Queue
router.get(
  "/tickets",
  authenticateToken,
  requireRole("IT_STAFF"),
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const prisma = getPrisma();

      const tickets =
        await prisma.ticket.findMany({
          where: {
            currentStatus: {
              not: "CLOSED",
            },
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
          },

          orderBy: {
            createdAt: "desc",
          },
        });


      return res.status(200).json({
        data: tickets,
      });


    } catch {

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message:
            "Unable to retrieve ticket queue.",
        },
      });

    }
  }
);
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
// Claim Ticket
router.patch(
  "/tickets/:id/assign",
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
            assignedStaffId:
              req.user!.userId,
          },

          include: {
            assignedStaff: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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
            "Unable to assign ticket.",
        },
      });

    }
  }
);
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
        requestedPriority,
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
      ];


      if (
        !allowedPriority.includes(
          requestedPriority
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
            requestedPriority,
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