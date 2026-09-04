import express, {
  Request,
  Response,
} from "express";

import cors from "cors";

import {
  Prisma,
  RequestedPriority,
  TicketStatus,
} from "@prisma/client";

import { getPrisma } from "./prisma.js";

export const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Lab 1 — API Health Check
// ---------------------------------------------------------------------------

app.get(
  "/api/health",
  (_req: Request, res: Response) => {
    return res.status(200).json({
      status: "ok",
      service: "TokTickIT API",
    });
  }
);

// ---------------------------------------------------------------------------
// Lab 1 / Lab 2 — Category List
// ---------------------------------------------------------------------------

app.get(
  "/api/categories",
  async (_req: Request, res: Response) => {
    try {
      const categories =
        await getPrisma().category.findMany({
          where: {
            isActive: true,
          },

          select: {
            id: true,
            name: true,
          },

          orderBy: {
            id: "asc",
          },
        });

      return res.status(200).json(
        categories
      );
    } catch {
      return res.status(500).json({
        error:
          "Unable to retrieve categories",
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 — Development Requester List
// This is NOT authentication.
// ---------------------------------------------------------------------------

app.get(
  "/api/requesters",
  async (_req: Request, res: Response) => {
    try {
      const requesters =
        await getPrisma().requesterUser.findMany(
          {
            where: {
              isActive: true,
            },

            select: {
              id: true,
              name: true,
              email: true,
            },

            orderBy: {
              id: "asc",
            },
          }
        );

      return res.status(200).json({
        data: requesters,
      });
    } catch {
      return res.status(500).json({
        error: {
          code:
            "REQUESTER_LOAD_ERROR",

          message:
            "Unable to retrieve Development Requesters.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 — Related System List
// ---------------------------------------------------------------------------

app.get(
  "/api/related-systems",
  async (_req: Request, res: Response) => {
    try {
      const systems =
        await getPrisma().relatedSystem.findMany(
          {
            where: {
              isActive: true,
            },

            select: {
              id: true,
              name: true,
            },

            orderBy: {
              id: "asc",
            },
          }
        );

      return res.status(200).json({
        data: systems,
      });
    } catch {
      return res.status(500).json({
        error: {
          code:
            "RELATED_SYSTEM_LOAD_ERROR",

          message:
            "Unable to retrieve Related Systems.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 — My Tickets
// Requester ownership + search + filter + sort + pagination
// ---------------------------------------------------------------------------

app.get(
  "/api/tickets",
  async (req: Request, res: Response) => {
    try {
      const requesterId = Number(
        req.query.requesterId
      );

      const page = Number(
        req.query.page ?? 1
      );

      const pageSize = Number(
        req.query.pageSize ?? 10
      );

      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const categoryId =
        req.query.categoryId !== undefined
          ? Number(req.query.categoryId)
          : undefined;

      const relatedSystemId =
        req.query.relatedSystemId !== undefined
          ? Number(
              req.query.relatedSystemId
            )
          : undefined;

      const requestedPriority =
        typeof req.query.requestedPriority ===
        "string"
          ? req.query.requestedPriority
          : undefined;

      const currentStatus =
        typeof req.query.currentStatus ===
        "string"
          ? req.query.currentStatus
          : undefined;

      const sortBy =
        typeof req.query.sortBy === "string"
          ? req.query.sortBy
          : "updatedAt";

      const sortOrder =
        typeof req.query.sortOrder === "string"
          ? req.query.sortOrder
          : "desc";

      // -----------------------------------------------------
      // Basic query validation
      // -----------------------------------------------------

      if (
        !Number.isInteger(requesterId) ||
        requesterId <= 0 ||
        !Number.isInteger(page) ||
        page < 1 ||
        ![10, 20, 50].includes(
          pageSize
        )
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message:
              "Invalid My Tickets query parameters.",
          },
        });
      }

      if (
        categoryId !== undefined &&
        (!Number.isInteger(categoryId) ||
          categoryId <= 0)
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message:
              "Invalid My Tickets query parameters.",
          },
        });
      }

      if (
        relatedSystemId !== undefined &&
        (!Number.isInteger(
          relatedSystemId
        ) ||
          relatedSystemId <= 0)
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message:
              "Invalid My Tickets query parameters.",
          },
        });
      }

      if (
        requestedPriority &&
        ![
          "LOW",
          "MEDIUM",
          "HIGH",
        ].includes(
          requestedPriority
        )
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message:
              "Invalid My Tickets query parameters.",
          },
        });
      }

      if (
        currentStatus &&
        currentStatus !== "NEW"
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message:
              "Invalid My Tickets query parameters.",
          },
        });
      }

      if (
        ![
          "updatedAt",
          "createdAt",
          "ticketNumber",
        ].includes(sortBy)
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message:
              "Invalid My Tickets query parameters.",
          },
        });
      }

      if (
        !["asc", "desc"].includes(
          sortOrder
        )
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message:
              "Invalid My Tickets query parameters.",
          },
        });
      }

      const prisma = getPrisma();

      // -----------------------------------------------------
      // Confirm selected Requester exists
      // -----------------------------------------------------

      const requester =
        await prisma.requesterUser.findFirst(
          {
            where: {
              id: requesterId,
              isActive: true,
            },

            select: {
              id: true,
            },
          }
        );

      if (!requester) {
        return res.status(404).json({
          error: {
            code:
              "REQUESTER_NOT_FOUND",

            message:
              "Development Requester was not found.",
          },
        });
      }

      // -----------------------------------------------------
      // Build requester-owned WHERE condition
      // -----------------------------------------------------

      const where: Prisma.TicketWhereInput =
        {
          requesterId,
        };

      // Search Ticket Number or Summary
      if (search) {
        where.OR = [
          {
            ticketNumber: {
              contains: search,
              mode: "insensitive",
            },
          },

          {
            summary: {
              contains: search,
              mode: "insensitive",
            },
          },
        ];
      }

      // Category filter
      if (categoryId !== undefined) {
        where.categoryId =
          categoryId;
      }

      // Related System filter
      if (
        relatedSystemId !== undefined
      ) {
        where.relatedSystemId =
          relatedSystemId;
      }

      // Priority filter
      if (requestedPriority) {
        where.requestedPriority =
          requestedPriority as RequestedPriority;
      }

      // Status filter
      if (currentStatus) {
        where.currentStatus =
          currentStatus as TicketStatus;
      }

      // -----------------------------------------------------
      // Sorting
      // -----------------------------------------------------

      const direction =
        sortOrder === "asc"
          ? "asc"
          : "desc";

      const orderBy: Prisma.TicketOrderByWithRelationInput[] =
        [];

      if (sortBy === "createdAt") {
        orderBy.push({
          createdAt: direction,
        });
      } else if (
        sortBy === "ticketNumber"
      ) {
        orderBy.push({
          ticketNumber:
            direction,
        });
      } else {
        orderBy.push({
          updatedAt: direction,
        });
      }

      // Stable secondary sort
      orderBy.push({
        id: direction,
      });

      // -----------------------------------------------------
      // Fetch Tickets + count
      // -----------------------------------------------------

      const [
        tickets,
        totalItems,
      ] = await Promise.all([
        prisma.ticket.findMany({
          where,

          select: {
            id: true,
            ticketNumber: true,
            requesterId: true,
            summary: true,
            requestedPriority:
              true,
            currentStatus: true,
            createdAt: true,
            updatedAt: true,

            category: {
              select: {
                id: true,
                name: true,
              },
            },

            relatedSystem: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          orderBy,

          skip:
            (page - 1) *
            pageSize,

          take: pageSize,
        }),

        prisma.ticket.count({
          where,
        }),
      ]);

      const totalPages =
        totalItems === 0
          ? 0
          : Math.ceil(
              totalItems /
                pageSize
            );

      return res.status(200).json({
        data: tickets,

        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
      });
    } catch {
      return res.status(500).json({
        error: {
          code:
            "TICKET_LIST_ERROR",

          message:
            "Unable to retrieve Tickets.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 — Create Ticket
// ---------------------------------------------------------------------------

app.post(
  "/api/tickets",
  async (req: Request, res: Response) => {
    try {
      const {
        requesterId,
        categoryId,
        relatedSystemId,
        summary,
        requestedPriority,
        description,
      } = req.body;

      const cleanSummary =
        typeof summary === "string"
          ? summary.trim()
          : "";

      const cleanDescription =
        typeof description ===
        "string"
          ? description.trim()
          : "";

      // -----------------------------------------------------
      // Required-field validation
      // -----------------------------------------------------

      if (
        !requesterId ||
        !categoryId ||
        !relatedSystemId ||
        !cleanSummary ||
        !cleanDescription ||
        ![
          "LOW",
          "MEDIUM",
          "HIGH",
        ].includes(
          requestedPriority
        )
      ) {
        return res.status(400).json({
          error: {
            code:
              "VALIDATION_ERROR",

            message:
              "The request contains invalid data.",
          },
        });
      }

      // -----------------------------------------------------
      // Length validation
      // -----------------------------------------------------

      if (
        cleanSummary.length < 5 ||
        cleanSummary.length >
          120 ||
        cleanDescription.length <
          10 ||
        cleanDescription.length >
          2000
      ) {
        return res.status(400).json({
          error: {
            code:
              "VALIDATION_ERROR",

            message:
              "The request contains invalid data.",
          },
        });
      }

      const prisma = getPrisma();

      // -----------------------------------------------------
      // Validate referenced records
      // -----------------------------------------------------

      const [
        requester,
        category,
        relatedSystem,
      ] = await Promise.all([
        prisma.requesterUser.findFirst(
          {
            where: {
              id: Number(
                requesterId
              ),
              isActive: true,
            },
          }
        ),

        prisma.category.findFirst({
          where: {
            id: Number(
              categoryId
            ),
            isActive: true,
          },
        }),

        prisma.relatedSystem.findFirst(
          {
            where: {
              id: Number(
                relatedSystemId
              ),
              isActive: true,
            },
          }
        ),
      ]);

      if (
        !requester ||
        !category ||
        !relatedSystem
      ) {
        return res.status(404).json({
          error: {
            code:
              "REFERENCE_NOT_FOUND",

            message:
              "Requester, Category, or Related System was not found.",
          },
        });
      }

      // -----------------------------------------------------
      // Create Ticket
      // -----------------------------------------------------

      const temporaryNumber =
        `TEMP-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      const createdTicket =
        await prisma.ticket.create(
          {
            data: {
              ticketNumber:
                temporaryNumber,

              requesterId:
                Number(
                  requesterId
                ),

              categoryId:
                Number(
                  categoryId
                ),

              relatedSystemId:
                Number(
                  relatedSystemId
                ),

              summary:
                cleanSummary,

              description:
                cleanDescription,

              requestedPriority,

              currentStatus:
                "NEW",
            },
          }
        );

      // -----------------------------------------------------
      // Generate official Ticket Number
      // -----------------------------------------------------

      const year =
        createdTicket.createdAt.getFullYear();

      const ticketNumber =
        `TKT-${year}-${String(
          createdTicket.id
        ).padStart(6, "0")}`;

      const ticket =
        await prisma.ticket.update({
          where: {
            id:
              createdTicket.id,
          },

          data: {
            ticketNumber,
          },
        });

      return res.status(201).json({
        data: {
          id: ticket.id,

          ticketNumber:
            ticket.ticketNumber,

          requesterId:
            ticket.requesterId,

          categoryId:
            ticket.categoryId,

          relatedSystemId:
            ticket.relatedSystemId,

          summary:
            ticket.summary,

          requestedPriority:
            ticket.requestedPriority,

          currentStatus:
            ticket.currentStatus,

          createdAt:
            ticket.createdAt,
        },
      });
    } catch {
      return res.status(500).json({
        error: {
          code:
            "TICKET_CREATE_ERROR",

          message:
            "Unable to create Ticket.",
        },
      });
    }
  }
);

export default app;