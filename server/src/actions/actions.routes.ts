import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import { ActionError, parseCreate, parseId, parsePage, parsePatch } from "./actions.rules.js";
import { createAction, listActions, patchAction } from "./actions.service.js";

export const actionRoutes = Router();
const staff = requireRole("IT_STAFF", "ADMINISTRATOR");
function fail(res: Response, error: unknown) {
  if (error instanceof ActionError) return res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } });
  return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to complete Actions Taken request." } });
}
actionRoutes.get("/tickets/:id/actions-taken", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseId(req.params.id), { page, limit } = parsePage(req.query, 20);
    return res.json({ data: await listActions(id, req.user!.userId, page, limit) });
  } catch (error) { return fail(res, error); }
});
actionRoutes.post("/tickets/:id/actions-taken", authenticateToken, staff, async (req: AuthRequest, res) => {
  try { return res.status(201).json({ data: await createAction(parseId(req.params.id), req.user!.userId, parseCreate(req.body)) }); }
  catch (error) { return fail(res, error); }
});
actionRoutes.patch("/tickets/:id/actions-taken/:actionId", authenticateToken, staff, async (req: AuthRequest, res) => {
  try { return res.json({ data: await patchAction(parseId(req.params.id), parseId(req.params.actionId), req.user!.userId, parsePatch(req.body)) }); }
  catch (error) { return fail(res, error); }
});
actionRoutes.get("/tickets/:id/actions-taken/:actionId/history", authenticateToken, staff, async (req: AuthRequest, res) => {
  try {
    const id = parseId(req.params.id), actionId = parseId(req.params.actionId), { page, limit } = parsePage(req.query, 50);
    return res.json({ data: await listActions(id, req.user!.userId, page, limit, actionId) });
  } catch (error) { return fail(res, error); }
});
