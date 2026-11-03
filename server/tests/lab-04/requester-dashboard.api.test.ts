import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { openI5Database } from "../helpers/i5-database.js";
import { dashboardFixture } from "../helpers/dashboard-fixtures.js";
let db: PrismaClient;
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => db }));
const asOf = new Date("2026-10-27T05:00:00.000Z"), start = new Date("2026-10-20T17:00:00.000Z");
describe.skipIf(process.env.LAB4_I5_TEST_APPROVED !== "1")("I5 owned Requester PostgreSQL API verification", () => {
  let owned: Awaited<ReturnType<typeof openI5Database>>, f: Awaited<ReturnType<typeof dashboardFixture>>;
  beforeAll(async () => { owned = await openI5Database(); db = owned.prisma; owned.migrate(); f = await dashboardFixture(db, asOf); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(asOf); }, 120000);
  afterAll(async () => { vi.useRealTimers(); await owned?.dispose(); }, 30000);
  const dashboard = () => f.agents[0].get("/api/requester/dashboard");
  async function resolvedCount() { const response = await dashboard(); expect(response.status).toBe(200); return response.body.data.metrics.recentlyResolved as number; }
  it("reconciles owned counts and bounded ordering with independent SQL", async () => {
    for (let i=0;i<7;i++) { await f.ticket({ currentStatus:i<2?"WAITING_FOR_REQUESTER":"OPEN" }); await f.ticket({ requesterId:f.users[1].id }); }
    const response=await dashboard();expect(response.status).toBe(200);
    const [expected]=await db.$queryRaw<Array<{open:number;attention:number}>>`SELECT count(*) FILTER (WHERE "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'))::int AS open,count(*) FILTER (WHERE "currentStatus"='WAITING_FOR_REQUESTER')::int AS attention FROM "Ticket" WHERE "requesterId"=${f.users[0].id} AND "createdAt"<=${asOf} AND "updatedAt"<=${asOf}`;
    expect(response.body.data.metrics).toMatchObject({myOpenTickets:expected.open,needsMyAttention:expected.attention});
    const rows=await db.$queryRaw<Array<{id:number}>>`SELECT id FROM "Ticket" WHERE "requesterId"=${f.users[0].id} AND "createdAt"<=${asOf} AND "updatedAt"<=${asOf} ORDER BY "updatedAt" DESC,id DESC LIMIT 5`;
    expect(response.body.data.recentTickets.map((row:{id:number})=>row.id)).toEqual(rows.map(row=>row.id));
    expect(response.body.data.attentionTickets).toHaveLength(2);
    expect(Object.keys(response.body.data.recentTickets[0]).sort()).toEqual(["id","ticketNumber","summary","currentStatus","requestedPriority","itPriority","assignedStaffId","updatedAt"].sort());
  });
  it.each([[-1,false],[0,true],[1,true]] as const)("includes start offset %i ms correctly",async(offset,included)=>{
    const before=await resolvedCount(),ticket=await f.ticket({currentStatus:"RESOLVED"});await f.event(ticket.id,new Date(start.getTime()+offset));expect(await resolvedCount()).toBe(before+Number(included));
  });
  it.each([[-1,true],[0,true],[1,false]] as const)("includes end offset %i ms correctly",async(offset,included)=>{
    const before=await resolvedCount(),ticket=await f.ticket({currentStatus:"CLOSED"});await f.event(ticket.id,new Date(asOf.getTime()+offset));expect(await resolvedCount()).toBe(before+Number(included));
  });
  it("uses the latest event, with no future fallback, legacy inference or reopened count",async()=>{
    const before=await resolvedCount();const future=await f.ticket({currentStatus:"RESOLVED"});await f.event(future.id,new Date(asOf.getTime()-10));await f.event(future.id,new Date(asOf.getTime()+1));
    await f.ticket({currentStatus:"RESOLVED"});const reopened=await f.ticket({currentStatus:"REOPENED"});await f.event(reopened.id,asOf);expect(await resolvedCount()).toBe(before);
    const [expected]=await db.$queryRaw<Array<{count:number}>>`SELECT count(*)::int AS count FROM "Ticket" t JOIN LATERAL (SELECT e."createdAt" FROM "TicketStatusEvent" e WHERE e."ticketId"=t.id AND e."toStatus"='RESOLVED' ORDER BY e."createdAt" DESC,e.id DESC LIMIT 1) latest ON true WHERE t."requesterId"=${f.users[0].id} AND t."currentStatus" IN ('RESOLVED','CLOSED') AND t."createdAt"<=${asOf} AND t."updatedAt"<=${asOf} AND latest."createdAt">=${start} AND latest."createdAt"<=${asOf}`;
    expect(await resolvedCount()).toBe(expected.count);
  });
  it("independently excludes future-created/updated parents and retains old active work",async()=>{
    const before=(await dashboard()).body.data.metrics.myOpenTickets;
    await f.ticket({createdAt:new Date(asOf.getTime()+1)});await f.ticket({updatedAt:new Date(asOf.getTime()+1)});await f.ticket({createdAt:new Date("2020-01-01"),updatedAt:new Date("2020-01-01")});
    expect((await dashboard()).body.data.metrics.myOpenTickets).toBe(before+1);
  });
  it("matches each card with paginated lists and retains the original live cutoff",async()=>{
    const data=(await dashboard()).body.data;
    for(const key of ["myOpenTickets","needsMyAttention","recentlyResolved"] as const){
      const response=await f.agents[0].get("/api/tickets").query({...data.drillDown[key].query,pageSize:10});
      expect(response.status).toBe(200);expect(response.body.pagination.totalItems).toBe(data.metrics[key]);
      expect((await f.agents[0].get("/api/tickets/my").query({...data.drillDown[key].query,page:2,pageSize:10})).status).toBe(200);
    }
    const ticket=await f.ticket(),snapshot=(await dashboard()).body.data;
    await db.ticket.update({where:{id:ticket.id},data:{updatedAt:new Date(asOf.getTime()+1)}});
    expect((await f.agents[0].get("/api/tickets").query(snapshot.drillDown.myOpenTickets.query)).body.pagination.totalItems).toBe(snapshot.metrics.myOpenTickets-1);
  });
  it("rejects role/identity overrides and returns no private fields",async()=>{
    expect((await f.agents[2].get("/api/requester/dashboard")).status).toBe(403);expect((await f.agents[3].get("/api/requester/dashboard")).status).toBe(403);
    expect((await f.agents[0].get("/api/requester/dashboard?requesterId=2")).status).toBe(400);
    const response=await dashboard();for(const link of Object.values(response.body.data.drillDown) as {query:{asOf:string}}[])expect(link.query.asOf).toBe(response.body.data.asOf);
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|sessionId|internalNotes|attachment/);
  });
});
