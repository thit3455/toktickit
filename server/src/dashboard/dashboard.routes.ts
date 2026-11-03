import { Router } from "express";
import { authenticateToken, type AuthRequest } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import { ActionError } from "../actions/actions.rules.js";
import { requesterDashboard, staffDashboard } from "./dashboard.service.js";
export const dashboardRoutes = Router();
for (const [path, roles, read] of [
  ["/requester/dashboard", ["REQUESTER"], requesterDashboard],
  ["/staff/dashboard", ["IT_STAFF", "ADMINISTRATOR"], staffDashboard],
] as const) {
  dashboardRoutes.get(path, authenticateToken, requireRole(...roles), async (req: AuthRequest, res) => {
    if (Object.keys(req.query).length) return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Dashboard query parameters are not supported." } });
    try { return res.json({ data: await read(req.user!.userId) }); }
    catch (error) {
      if (error instanceof ActionError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to load the dashboard. Please try again." } });
    }
  });
}
