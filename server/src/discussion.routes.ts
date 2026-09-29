import { Router, Response, NextFunction } from "express";
import { authenticateToken, AuthRequest } from "./auth/auth.middleware.js";
import { getPrisma } from "./prisma.js";

export const discussionRoutes = Router();
for (const kind of ["comments", "internal-notes"] as const) {
  const internal = kind === "internal-notes";
  const access = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: { message: "Invalid ticket id." } });
    if (internal && !["IT_STAFF", "ADMINISTRATOR"].includes(req.user!.role))
      return res.status(403).json({ error: { message: "Staff access required." } });
    try {
      const ticket = await getPrisma().ticket.findUnique({ where: { id } });
      if (!ticket || (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.userId))
        return res.status(404).json({ error: { message: "Ticket not found." } });
      next();
    } catch { return res.status(500).json({ error: { message: "Unable to access ticket." } }); }
  };
  discussionRoutes.get(`/tickets/:id/${kind}`, authenticateToken, access, async (req: AuthRequest, res: Response) => {
    try {
      const query = { where: { ticketId: Number(req.params.id) }, include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" as const } };
      const prisma = getPrisma();
      const data = internal ? await prisma.ticketInternalNote.findMany(query) : await prisma.ticketComment.findMany(query);
      return res.json({ data });
    } catch { return res.status(500).json({ error: { message: "Unable to load messages." } }); }
  });
  discussionRoutes.post(`/tickets/:id/${kind}`, authenticateToken, access, async (req: AuthRequest, res: Response) => {
    const message = req.body?.message;
    if (typeof message !== "string" || !message.trim() || message.trim().length > 10000)
      return res.status(400).json({ error: { message: "Message must contain 1 to 10000 characters." } });
    try {
      const query = { data: { ticketId: Number(req.params.id), userId: req.user!.userId, message: message.trim() } };
      const prisma = getPrisma();
      const data = internal ? await prisma.ticketInternalNote.create(query) : await prisma.ticketComment.create(query);
      return res.status(201).json({ data });
    } catch { return res.status(500).json({ error: { message: "Unable to save message." } }); }
  });
}
