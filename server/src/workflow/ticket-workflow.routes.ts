import { Router, type Response } from "express";
import { authenticateToken, type AuthRequest } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import { ActionError, parseId, parsePage } from "../actions/actions.rules.js";
import { getTicketHistory } from "./ticket-workflow.service.js";

export function workflowFailure(res: Response, error: unknown) {
  if (error instanceof ActionError) return res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } });
  return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to complete Ticket workflow request." } });
}
export const ticketWorkflowRoutes = Router();
ticketWorkflowRoutes.get("/tickets/:id/status-history", authenticateToken, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: AuthRequest, res) => {
  try {
    const id = parseId(req.params.id), { page, limit } = parsePage(req.query, 50);
    return res.json({ data: await getTicketHistory(id, req.user!.userId, page, limit) });
  } catch (error) { return workflowFailure(res, error); }
});
