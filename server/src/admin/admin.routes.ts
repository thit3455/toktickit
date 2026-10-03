import { Router, Response } from "express";
import { Prisma, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { authenticateToken, AuthRequest } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import { getPrisma } from "../prisma.js";

const router = Router();
router.use(authenticateToken, requireRole("ADMINISTRATOR"));
const publicUser = { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true } as const;
class AccountError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}
function fail(res: Response, error: unknown) {
  if (error instanceof AccountError) return res.status(error.status).json({ error: { code: error.code, message: error.message, fields: error.fields } });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return res.status(409).json({ error: { code: "DUPLICATE_EMAIL", message: "An account with this email already exists.", fields: { email: "Email is already in use." } } });
    if (error.code === "P2034") return res.status(409).json({ error: { code: "CONCURRENT_UPDATE", message: "Another account change occurred. Refresh and try again." } });
  }
  return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to complete user management request." } });
}
function idOf(value: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new AccountError(400, "INVALID_ID", "A valid User ID is required.");
  return id;
}
function bodyOf(body: unknown, allowed: string[]) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) {
    throw new AccountError(400, "INVALID_INPUT", "Supply only the supported account fields.");
  }
  return body as Record<string, unknown>;
}
function passwordOf(value: unknown) {
  if (typeof value !== "string" || value.length < 8 || Buffer.byteLength(value, "utf8") > 72) {
    throw new AccountError(400, "VALIDATION_ERROR", "Check the highlighted fields.", { password: "Use at least 8 characters and at most 72 UTF-8 bytes." });
  }
  return value;
}
function accountFields(body: Record<string, unknown>, create: boolean) {
  const fields: Record<string, string> = {};
  const data: { name?: string; email?: string; role?: UserRole; isActive?: boolean } = {};
  if (create || "name" in body) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120) fields.name = "Name must contain 1 to 120 characters.";
    else data.name = body.name.trim();
  }
  if (create || "email" in body) {
    if (typeof body.email !== "string" || body.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) fields.email = "Enter a valid email address.";
    else data.email = body.email.trim().toLowerCase();
  }
  if (create || "role" in body) {
    if (!Object.values(UserRole).includes(body.role as UserRole)) fields.role = "Select one valid role.";
    else data.role = body.role as UserRole;
  }
  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") fields.isActive = "Choose Active or Inactive.";
    else data.isActive = body.isActive;
  }
  if (Object.keys(fields).length) throw new AccountError(400, "VALIDATION_ERROR", "Check the highlighted fields.", fields);
  return data;
}
// A serializable transaction makes the count-and-update protection safe for concurrent role changes.
async function mutate<T>(actorId: number, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getPrisma().$transaction(async tx => {
        const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, isActive: true, mustChangePassword: true } });
        if (!actor?.isActive || actor.role !== "ADMINISTRATOR" || actor.mustChangePassword) throw new AccountError(403, "FORBIDDEN", "Administrator access is required.");
        return operation(tx);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
}
async function uniqueEmail(tx: Prisma.TransactionClient, email: string, exceptId?: number) {
  if (await tx.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } })) {
    throw new AccountError(409, "DUPLICATE_EMAIL", "An account with this email already exists.", { email: "Email is already in use." });
  }
}

router.get("/users", async (req, res) => {
  try {
    const { search = "", role = "", active = "" } = req.query;
    if (typeof search !== "string" || search.length > 200 || typeof role !== "string" || (role && !Object.values(UserRole).includes(role as UserRole)) || !["", "true", "false"].includes(active as string)) throw new AccountError(400, "INVALID_QUERY", "Invalid user search or filters.");
    const data = await getPrisma().user.findMany({
      where: {
        ...(search.trim() ? { OR: [{ name: { contains: search.trim(), mode: "insensitive" as const } }, { email: { contains: search.trim(), mode: "insensitive" as const } }] } : {}),
        ...(role ? { role: role as UserRole } : {}), ...(active ? { isActive: active === "true" } : {}),
      },
      select: publicUser, orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return res.json({ data });
  } catch (error) { return fail(res, error); }
});
router.post("/users", async (req: AuthRequest, res) => {
  try {
    const body = bodyOf(req.body, ["name", "email", "role", "isActive", "password"]);
    const fields = accountFields(body, true);
    const passwordHash = await bcrypt.hash(passwordOf(body.password), 10);
    const data = await mutate(req.user!.userId, async tx => {
      await uniqueEmail(tx, fields.email!);
      return tx.user.create({ data: { name: fields.name!, email: fields.email!, role: fields.role!, isActive: fields.isActive ?? true, passwordHash, mustChangePassword: true }, select: publicUser });
    });
    return res.status(201).json({ data });
  } catch (error) { return fail(res, error); }
});
router.patch("/users/:id", async (req: AuthRequest, res) => {
  try {
    const id = idOf(req.params.id);
    const fields = accountFields(bodyOf(req.body, ["name", "email", "role", "isActive"]), false);
    const data = await mutate(req.user!.userId, async tx => {
      const target = await tx.user.findUnique({ where: { id }, select: publicUser });
      if (!target) throw new AccountError(404, "USER_NOT_FOUND", "User was not found.");
      if (id === req.user!.userId && fields.isActive === false) throw new AccountError(409, "SELF_DEACTIVATION", "You cannot deactivate your own account.");
      const nextRole = fields.role ?? target.role;
      const nextActive = fields.isActive ?? target.isActive;
      if (target.isActive && target.role === "ADMINISTRATOR" && (!nextActive || nextRole !== "ADMINISTRATOR")) {
        if (await tx.user.count({ where: { role: "ADMINISTRATOR", isActive: true } }) <= 1) throw new AccountError(409, "LAST_ADMINISTRATOR", "At least one active Administrator must remain.");
      }
      if (fields.email) await uniqueEmail(tx, fields.email, id);
      const saved = await tx.user.update({ where: { id }, data: fields, select: publicUser });
      if (target.role !== saved.role || (target.isActive && !saved.isActive)) await tx.session.deleteMany({ where: { userId: id } });
      return saved;
    });
    return res.json({ data });
  } catch (error) { return fail(res, error); }
});
router.post("/users/:id/password", async (req: AuthRequest, res) => {
  try {
    const id = idOf(req.params.id);
    const body = bodyOf(req.body, ["password"]);
    const passwordHash = await bcrypt.hash(passwordOf(body.password), 10);
    const data = await mutate(req.user!.userId, async tx => {
      if (!await tx.user.findUnique({ where: { id }, select: { id: true } })) throw new AccountError(404, "USER_NOT_FOUND", "User was not found.");
      const saved = await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true }, select: publicUser });
      await tx.session.deleteMany({ where: { userId: id } });
      return saved;
    });
    return res.json({ data });
  } catch (error) { return fail(res, error); }
});
export default router;
