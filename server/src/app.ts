import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";

export const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Lab 1 — API Health Check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

// ---------------------------------------------------------------------------
// Lab 1 — Category List
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json(categories);
  } catch {
    res.status(500).json({
      error: "Unable to retrieve categories",
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Development Requester List
// Only ACTIVE Requesters are returned.
// This is a Lab 2 testing mechanism, NOT authentication.
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
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
    });

    res.status(200).json({
      data: requesters,
    });
  } catch {
    res.status(500).json({
      error: {
        code: "REQUESTER_LOAD_ERROR",
        message: "Unable to retrieve Development Requesters.",
      },
    });
  }
});
// ---------------------------------------------------------------------------
// Lab 2 — Related System List
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
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

    res.status(200).json({
      data: systems,
    });
  } catch {
    res.status(500).json({
      error: {
        code: "RELATED_SYSTEM_LOAD_ERROR",
        message: "Unable to retrieve Related Systems.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Create Ticket
// ---------------------------------------------------------------------------
app.post("/api/tickets", async (req: Request, res: Response) => {
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
      typeof summary === "string" ? summary.trim() : "";

    const cleanDescription =
      typeof description === "string" ? description.trim() : "";

    if (
      !requesterId ||
      !categoryId ||
      !relatedSystemId ||
      !cleanSummary ||
      !cleanDescription ||
      !["LOW", "MEDIUM", "HIGH"].includes(requestedPriority)
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid data.",
        },
      });
    }

    if (
      cleanSummary.length < 5 ||
      cleanSummary.length > 120 ||
      cleanDescription.length < 10 ||
      cleanDescription.length > 2000
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid data.",
        },
      });
    }

    const prisma = getPrisma();

    const [requester, category, relatedSystem] =
      await Promise.all([
        prisma.requesterUser.findFirst({
          where: {
            id: Number(requesterId),
            isActive: true,
          },
        }),
        prisma.category.findFirst({
          where: {
            id: Number(categoryId),
            isActive: true,
          },
        }),
        prisma.relatedSystem.findFirst({
          where: {
            id: Number(relatedSystemId),
            isActive: true,
          },
        }),
      ]);

    if (!requester || !category || !relatedSystem) {
      return res.status(404).json({
        error: {
          code: "REFERENCE_NOT_FOUND",
          message:
            "Requester, Category, or Related System was not found.",
        },
      });
    }

    const temporaryNumber =
      `TEMP-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const createdTicket = await prisma.ticket.create({
      data: {
        ticketNumber: temporaryNumber,
        requesterId: Number(requesterId),
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        summary: cleanSummary,
        description: cleanDescription,
        requestedPriority,
        currentStatus: "NEW",
      },
    });

    const year = createdTicket.createdAt.getFullYear();

    const ticketNumber =
      `TKT-${year}-${String(createdTicket.id).padStart(6, "0")}`;

    const ticket = await prisma.ticket.update({
      where: {
        id: createdTicket.id,
      },
      data: {
        ticketNumber,
      },
    });

    return res.status(201).json({
      data: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        requesterId: ticket.requesterId,
        categoryId: ticket.categoryId,
        relatedSystemId: ticket.relatedSystemId,
        summary: ticket.summary,
        requestedPriority: ticket.requestedPriority,
        currentStatus: ticket.currentStatus,
        createdAt: ticket.createdAt,
      },
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "TICKET_CREATE_ERROR",
        message: "Unable to create Ticket.",
      },
    });
  }
});
export default app;