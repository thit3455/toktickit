import { API_URL, type TicketStatus } from "./api";
export interface DashboardLink { screen: "myTickets" | "staffQueue"; query: Record<string, string | number> }
export interface DashboardTicket { id: number; ticketNumber: string; summary: string; currentStatus: TicketStatus; requestedPriority: string; itPriority: string; assignedStaffId: number | null; updatedAt: string }
export interface DashboardAction { id: number; ticketId: number; ticketNumber: string; description: string; status: "PLANNED" | "IN_PROGRESS"; updatedAt: string }
interface Snapshot { asOf: string; timeZone: "Asia/Bangkok"; window: { start: string; end: string }; recentTickets: DashboardTicket[] }
export interface RequesterDashboardData extends Snapshot {
  metrics: { myOpenTickets: number; needsMyAttention: number; recentlyResolved: number }; attentionTickets: DashboardTicket[];
  drillDown: { myOpenTickets: DashboardLink; needsMyAttention: DashboardLink; recentlyResolved: DashboardLink; recentTickets: DashboardLink };
}
export interface StaffDashboardData extends Snapshot {
  metrics: { unassignedActiveTickets: number; myActiveTickets: number; myActiveActions: number; activeTicketsByItPriority: Record<"LOW" | "MEDIUM" | "HIGH" | "URGENT", number> };
  myActiveActions: DashboardAction[];
  drillDown: { unassignedActiveTickets: DashboardLink; myActiveTickets: DashboardLink; activeTicketsByItPriority: Record<"LOW" | "MEDIUM" | "HIGH" | "URGENT", DashboardLink>; recentTickets: DashboardLink };
}
export class DashboardError extends Error {
  constructor(public status: number, public code: string) {
    super(status === 401 ? "Your session has expired. Please sign in again." : code === "PASSWORD_CHANGE_REQUIRED" ? "Change your initial password before continuing."
      : status === 403 ? "You no longer have permission to view this dashboard." : "Unable to load the dashboard. Please try again.");
    this.name = "DashboardError";
  }
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const id = (v: unknown) => count(v) && v > 0;
const instant = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const active = "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED";
export const dashboardPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
function tickets(v: unknown, asOf: string) {
  return Array.isArray(v) && v.length <= 5 && v.every(t => object(t) && id(t.id) && typeof t.ticketNumber === "string" && typeof t.summary === "string"
    && statuses.includes(t.currentStatus as string) && ["LOW", "MEDIUM", "HIGH"].includes(t.requestedPriority as string) && dashboardPriorities.includes(t.itPriority as typeof dashboardPriorities[number])
    && (t.assignedStaffId === null || id(t.assignedStaffId)) && instant(t.updatedAt) && t.updatedAt <= asOf);
}
function snapshot(v: unknown): v is Record<string, unknown> & { asOf: string; window: { start: string; end: string } } {
  if (!object(v) || !instant(v.asOf) || v.timeZone !== "Asia/Bangkok" || !object(v.window) || !instant(v.window.start) || v.window.end !== v.asOf || !object(v.metrics) || !object(v.drillDown)) return false;
  const local = new Date(Date.parse(v.asOf) + 7 * 3600000);
  const expected = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - 6) - 7 * 3600000).toISOString();
  return v.window.start === expected && tickets(v.recentTickets, v.asOf);
}
function link(v: unknown, screen: DashboardLink["screen"], query: Record<string, string | number>) {
  return object(v) && v.screen === screen && object(v.query) && Object.keys(v.query).length === Object.keys(query).length
    && Object.entries(query).every(([key, value]) => (v.query as Record<string, unknown>)[key] === value);
}
function requester(v: unknown): v is RequesterDashboardData {
  if (!snapshot(v)) return false;
  const m = v.metrics as Record<string, unknown>, d = v.drillDown as Record<string, unknown>, common = { asOf: v.asOf, page: 1 };
  return ["myOpenTickets", "needsMyAttention", "recentlyResolved"].every(key => count(m[key])) && tickets(v.attentionTickets, v.asOf)
    && link(d.myOpenTickets, "myTickets", { ...common, statuses: active })
    && link(d.needsMyAttention, "myTickets", { ...common, currentStatus: "WAITING_FOR_REQUESTER" })
    && link(d.recentlyResolved, "myTickets", { ...common, statuses: "RESOLVED,CLOSED", resolvedSince: v.window.start, resolvedUntil: v.asOf })
    && link(d.recentTickets, "myTickets", { ...common, sortBy: "updatedAt", sortOrder: "desc" });
}
function staff(v: unknown): v is StaffDashboardData {
  if (!snapshot(v)) return false;
  const m = v.metrics as Record<string, unknown>, d = v.drillDown as Record<string, unknown>, common = { asOf: v.asOf, page: 1, statuses: active };
  return ["unassignedActiveTickets", "myActiveTickets", "myActiveActions"].every(key => count(m[key]))
    && object(m.activeTicketsByItPriority) && dashboardPriorities.every(key => count((m.activeTicketsByItPriority as Record<string, unknown>)[key]))
    && Array.isArray(v.myActiveActions) && v.myActiveActions.length <= 5 && v.myActiveActions.every(a => object(a) && id(a.id) && id(a.ticketId)
      && typeof a.ticketNumber === "string" && typeof a.description === "string" && ["PLANNED", "IN_PROGRESS"].includes(a.status as string) && instant(a.updatedAt) && a.updatedAt <= v.asOf)
    && link(d.unassignedActiveTickets, "staffQueue", { ...common, assigned: "false" }) && link(d.myActiveTickets, "staffQueue", { ...common, owner: "me" })
    && object(d.activeTicketsByItPriority) && dashboardPriorities.every(key => link((d.activeTicketsByItPriority as Record<string, unknown>)[key], "staffQueue", { ...common, itPriority: key }))
    && link(d.recentTickets, "staffQueue", { asOf: v.asOf, page: 1, sort: "updatedAt", order: "desc" });
}
async function get<T>(path: string, validate: (v: unknown) => v is T, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try { response = await fetch(API_URL + path, { credentials: "include", signal }); }
  catch (error) { if (object(error) && error.name === "AbortError") throw error; throw new DashboardError(0, "NETWORK_ERROR"); }
  let body: unknown;
  try { body = await response.json(); } catch { throw new DashboardError(response.status, "MALFORMED_RESPONSE"); }
  if (!response.ok) throw new DashboardError(response.status, object(body) && object(body.error) && typeof body.error.code === "string" ? body.error.code : "REQUEST_FAILED");
  if (!object(body) || !validate(body.data)) throw new DashboardError(response.status, "MALFORMED_RESPONSE");
  return body.data;
}
export const getRequesterDashboard = (signal?: AbortSignal) => get("/api/requester/dashboard", requester, signal);
export const getStaffDashboard = (signal?: AbortSignal) => get("/api/staff/dashboard", staff, signal);
