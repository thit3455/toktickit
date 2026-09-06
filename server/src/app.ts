import express, {
  Request,
  Response,
} from "express";

import cors from "cors";
import multer from "multer";

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
// Lab 2 — Attachment Configuration
// ---------------------------------------------------------------------------

const MAX_ATTACHMENT_SIZE =
  5 * 1024 * 1024;

const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_ATTACHMENT_SIZE,
  },
});

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

      return res
        .status(200)
        .json(categories);
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
        typeof req.query
          .requestedPriority === "string"
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
        typeof req.query.sortOrder ===
        "string"
          ? req.query.sortOrder
          : "desc";

      // -----------------------------------------------------
      // Query validation
      // -----------------------------------------------------

      if (
        !Number.isInteger(requesterId) ||
        requesterId <= 0 ||
        !Number.isInteger(page) ||
        page < 1 ||
        ![10, 20, 50].includes(pageSize)
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
        ].includes(requestedPriority)
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
      // Requester-owned WHERE conditions
      // -----------------------------------------------------

      const where: Prisma.TicketWhereInput =
        {
          requesterId,
        };

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

      if (categoryId !== undefined) {
        where.categoryId = categoryId;
      }

      if (
        relatedSystemId !== undefined
      ) {
        where.relatedSystemId =
          relatedSystemId;
      }

      if (requestedPriority) {
        where.requestedPriority =
          requestedPriority as RequestedPriority;
      }

      if (currentStatus) {
        where.currentStatus =
          currentStatus as TicketStatus;
      }

      // -----------------------------------------------------
      // Sorting
      // -----------------------------------------------------

      const direction:
        | "asc"
        | "desc" =
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
          ticketNumber: direction,
        });
      } else {
        orderBy.push({
          updatedAt: direction,
        });
      }

      orderBy.push({
        id: direction,
      });

      // -----------------------------------------------------
      // Retrieve Tickets
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
            requestedPriority: true,
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
// Lab 2 — Requester Ticket Detail
// Only the owning Requester may retrieve the Ticket.
// ---------------------------------------------------------------------------

app.get(
  "/api/tickets/:id",
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(
        req.params.id
      );

      const requesterId = Number(
        req.query.requesterId
      );

      if (
        !Number.isInteger(ticketId) ||
        ticketId <= 0 ||
        !Number.isInteger(
          requesterId
        ) ||
        requesterId <= 0
      ) {
        return res.status(400).json({
          error: {
            code:
              "INVALID_QUERY",

            message:
              "A valid Ticket ID and Requester ID are required.",
          },
        });
      }

      const prisma = getPrisma();

      // Requester ownership enforcement
      const ticket =
        await prisma.ticket.findFirst(
          {
            where: {
              id: ticketId,
              requesterId,
            },

            select: {
              id: true,
              ticketNumber: true,
              requesterId: true,
              categoryId: true,
              relatedSystemId: true,
              summary: true,
              description: true,
              requestedPriority: true,
              currentStatus: true,
              createdAt: true,
              updatedAt: true,

              requester: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },

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
          }
        );

      if (!ticket) {
        return res.status(404).json({
          error: {
            code:
              "TICKET_NOT_FOUND",

            message:
              "Ticket was not found.",
          },
        });
      }

      return res.status(200).json({
        data: ticket,
      });
    } catch {
      return res.status(500).json({
        error: {
          code:
            "TICKET_DETAIL_ERROR",

          message:
            "Unable to retrieve Ticket details.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 — Add Ticket Attachment
// Only the owning Requester may add an attachment.
// ---------------------------------------------------------------------------

app.post(
  "/api/tickets/:id/attachments",

  (req: Request, res: Response) => {
    upload.single("file")(
      req,
      res,

      async (uploadError) => {
        // ---------------------------------------------------
        // Multer file-size error
        // ---------------------------------------------------

        if (
          uploadError instanceof
            multer.MulterError &&
          uploadError.code ===
            "LIMIT_FILE_SIZE"
        ) {
          return res.status(400).json({
            error: {
              code:
                "ATTACHMENT_TOO_LARGE",

              message:
                "Each attachment must be 5 MB or smaller.",
            },
          });
        }

        // Other multipart/upload parsing error
        if (uploadError) {
          return res.status(400).json({
            error: {
              code:
                "ATTACHMENT_UPLOAD_ERROR",

              message:
                "Unable to process attachment.",
            },
          });
        }

        try {
          const ticketId = Number(
            req.params.id
          );

          const requesterId = Number(
            req.query.requesterId
          );

          // -------------------------------------------------
          // Validate Ticket + Requester IDs
          // -------------------------------------------------

          if (
            !Number.isInteger(
              ticketId
            ) ||
            ticketId <= 0 ||
            !Number.isInteger(
              requesterId
            ) ||
            requesterId <= 0
          ) {
            return res
              .status(400)
              .json({
                error: {
                  code:
                    "INVALID_QUERY",

                  message:
                    "A valid Ticket ID and Requester ID are required.",
                },
              });
          }

          const prisma =
            getPrisma();

          // -------------------------------------------------
          // Ticket ownership check
          // -------------------------------------------------

          const ticket =
            await prisma.ticket.findFirst(
              {
                where: {
                  id: ticketId,
                  requesterId,
                },

                select: {
                  id: true,
                },
              }
            );

          if (!ticket) {
            return res
              .status(404)
              .json({
                error: {
                  code:
                    "TICKET_NOT_FOUND",

                  message:
                    "Ticket was not found.",
                },
              });
          }

          // -------------------------------------------------
          // File required
          // -------------------------------------------------

          if (!req.file) {
            return res
              .status(400)
              .json({
                error: {
                  code:
                    "ATTACHMENT_REQUIRED",

                  message:
                    "An attachment file is required.",
                },
              });
          }

          // -------------------------------------------------
          // Allowed file types
          // -------------------------------------------------

          if (
            !ALLOWED_ATTACHMENT_TYPES.includes(
              req.file.mimetype
            )
          ) {
            return res
              .status(400)
              .json({
                error: {
                  code:
                    "INVALID_ATTACHMENT_TYPE",

                  message:
                    "Only JPG/JPEG, PNG, WEBP, and PDF files are allowed.",
                },
              });
          }

          // -------------------------------------------------
          // Maximum 5 active attachments
          // -------------------------------------------------

          const activeAttachmentCount =
            await prisma.attachment.count(
              {
                where: {
                  ticketId,
                  isRemoved: false,
                },
              }
            );

          if (
            activeAttachmentCount >= 5
          ) {
            return res
              .status(400)
              .json({
                error: {
                  code:
                    "ATTACHMENT_LIMIT_REACHED",

                  message:
                    "A Ticket may have a maximum of 5 active attachments.",
                },
              });
          }

          // -------------------------------------------------
          // Save attachment
          // -------------------------------------------------

          const attachment =
            await prisma.attachment.create(
              {
                data: {
                  ticketId,

                  fileName:
                    req.file.originalname,

                  mimeType:
                    req.file.mimetype,

                  fileSize:
                    req.file.size,

                  content:
                    req.file.buffer,
                },

                select: {
                  id: true,
                  ticketId: true,
                  fileName: true,
                  mimeType: true,
                  fileSize: true,
                  isRemoved: true,
                  uploadedAt: true,
                },
              }
            );

          return res
            .status(201)
            .json({
              data: attachment,
            });
        } catch {
          return res
            .status(500)
            .json({
              error: {
                code:
                  "ATTACHMENT_UPLOAD_ERROR",

                message:
                  "Unable to upload attachment.",
              },
            });
        }
      }
    );
  }
);

// ---------------------------------------------------------------------------
// Lab 2 — List Ticket Attachments
// Only the owning Requester may view attachment metadata.
// Removed attachments remain visible as retained metadata.
// ---------------------------------------------------------------------------

app.get(
  "/api/tickets/:id/attachments",
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(
        req.params.id
      );

      const requesterId = Number(
        req.query.requesterId
      );

      if (
        !Number.isInteger(ticketId) ||
        ticketId <= 0 ||
        !Number.isInteger(requesterId) ||
        requesterId <= 0
      ) {
        return res.status(400).json({
          error: {
            code:
              "INVALID_QUERY",

            message:
              "A valid Ticket ID and Requester ID are required.",
          },
        });
      }

      const prisma = getPrisma();

      const ticket =
        await prisma.ticket.findFirst(
          {
            where: {
              id: ticketId,
              requesterId,
            },

            select: {
              id: true,
            },
          }
        );

      if (!ticket) {
        return res.status(404).json({
          error: {
            code:
              "TICKET_NOT_FOUND",

            message:
              "Ticket was not found.",
          },
        });
      }

      const attachments =
        await prisma.attachment.findMany(
          {
            where: {
              ticketId,
            },

            select: {
              id: true,
              ticketId: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              isRemoved: true,
              uploadedAt: true,
              removedAt: true,
              removalReason: true,
            },

            orderBy: {
              uploadedAt: "asc",
            },
          }
        );

      return res.status(200).json({
        data: attachments,
      });
    } catch {
      return res.status(500).json({
        error: {
          code:
            "ATTACHMENT_LIST_ERROR",

          message:
            "Unable to retrieve attachments.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 — Download Ticket Attachment
// Only the owning Requester may download an active attachment.
// Soft-removed attachments cannot be downloaded.
// ---------------------------------------------------------------------------

app.get(
  "/api/attachments/:attachmentId/download",
  async (req: Request, res: Response) => {
    try {
      const attachmentId = Number(
        req.params.attachmentId
      );

      const requesterId = Number(
        req.query.requesterId
      );

      if (
        !Number.isInteger(
          attachmentId
        ) ||
        attachmentId <= 0 ||
        !Number.isInteger(requesterId) ||
        requesterId <= 0
      ) {
        return res.status(400).json({
          error: {
            code:
              "INVALID_QUERY",

            message:
              "A valid Attachment ID and Requester ID are required.",
          },
        });
      }

      const prisma = getPrisma();

      const attachment =
        await prisma.attachment.findUnique(
          {
            where: {
              id: attachmentId,
            },

            select: {
              id: true,
              fileName: true,
              mimeType: true,
              content: true,
              isRemoved: true,

              ticket: {
                select: {
                  requesterId: true,
                },
              },
            },
          }
        );

      if (
        !attachment ||
        attachment.ticket.requesterId !==
          requesterId ||
        attachment.isRemoved
      ) {
        return res.status(404).json({
          error: {
            code:
              "ATTACHMENT_NOT_FOUND",

            message:
              "Attachment was not found.",
          },
        });
      }

      res.setHeader(
        "Content-Type",
        attachment.mimeType
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${attachment.fileName.replace(
          /["\r\n]/g,
          "_"
        )}"`
      );

      return res
        .status(200)
        .send(
          Buffer.from(
            attachment.content
          )
        );
    } catch {
      return res.status(500).json({
        error: {
          code:
            "ATTACHMENT_DOWNLOAD_ERROR",

          message:
            "Unable to download attachment.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 — Soft Remove Ticket Attachment
// Metadata is retained and a removal reason is required.
// Only the owning Requester may remove the attachment.
// ---------------------------------------------------------------------------

app.delete(
  "/api/attachments/:attachmentId",
  async (req: Request, res: Response) => {
    try {
      const attachmentId = Number(
        req.params.attachmentId
      );

      const requesterId = Number(
        req.query.requesterId
      );

      const removalReason =
        typeof req.body?.removalReason ===
        "string"
          ? req.body.removalReason.trim()
          : "";

      if (
        !Number.isInteger(
          attachmentId
        ) ||
        attachmentId <= 0 ||
        !Number.isInteger(requesterId) ||
        requesterId <= 0
      ) {
        return res.status(400).json({
          error: {
            code:
              "INVALID_QUERY",

            message:
              "A valid Attachment ID and Requester ID are required.",
          },
        });
      }

      if (!removalReason) {
        return res.status(400).json({
          error: {
            code:
              "REMOVAL_REASON_REQUIRED",

            message:
              "A removal reason is required.",
          },
        });
      }

      const prisma = getPrisma();

      const attachment =
        await prisma.attachment.findUnique(
          {
            where: {
              id: attachmentId,
            },

            select: {
              id: true,
              isRemoved: true,

              ticket: {
                select: {
                  requesterId: true,
                },
              },
            },
          }
        );

      if (
        !attachment ||
        attachment.ticket.requesterId !==
          requesterId
      ) {
        return res.status(404).json({
          error: {
            code:
              "ATTACHMENT_NOT_FOUND",

            message:
              "Attachment was not found.",
          },
        });
      }

      if (attachment.isRemoved) {
        return res.status(400).json({
          error: {
            code:
              "ATTACHMENT_ALREADY_REMOVED",

            message:
              "Attachment has already been removed.",
          },
        });
      }

      const removedAttachment =
        await prisma.attachment.update(
          {
            where: {
              id: attachmentId,
            },

            data: {
              isRemoved: true,
              removedAt: new Date(),
              removalReason,
            },

            select: {
              id: true,
              ticketId: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              isRemoved: true,
              uploadedAt: true,
              removedAt: true,
              removalReason: true,
            },
          }
        );

      return res.status(200).json({
        data: removedAttachment,
      });
    } catch {
      return res.status(500).json({
        error: {
          code:
            "ATTACHMENT_REMOVE_ERROR",

          message:
            "Unable to remove attachment.",
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
        await prisma.ticket.create({
          data: {
            ticketNumber:
              temporaryNumber,

            requesterId:
              Number(requesterId),

            categoryId:
              Number(categoryId),

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
        });

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