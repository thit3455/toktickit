import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { openI5Database } from "../helpers/i5-database.js";
import { dashboardFixture } from "../helpers/dashboard-fixtures.js";
let db: PrismaClient;
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => db }));
const asOf=new Date("2026-10-27T05:00:00.000Z");
describe.skipIf(process.env.LAB4_I5_TEST_APPROVED !== "1")("I5 owned operational PostgreSQL API verification",()=>{
  let owned:Awaited<ReturnType<typeof openI5Database>>,f:Awaited<ReturnType<typeof dashboardFixture>>;
  beforeAll(async()=>{owned=await openI5Database();db=owned.prisma;owned.migrate();f=await dashboardFixture(db,asOf);vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(asOf);},120000);
  afterAll(async()=>{vi.useRealTimers();await owned?.dispose();},30000);
  const dashboard=(actor=2)=>f.agents[actor].get("/api/staff/dashboard");
  it("reconciles full operational counts and four priority buckets",async()=>{
    for(const itPriority of ["LOW","MEDIUM","HIGH","URGENT"] as const)for(let i=0;i<2;i++)await f.ticket({itPriority,assignedStaffId:i?null:f.users[2].id});
    await f.ticket({currentStatus:"CANCELLED"});await f.ticket({currentStatus:"CLOSED"});
    const response=await dashboard();expect(response.status).toBe(200);
    const [expected]=await db.$queryRaw<Array<{unassigned:number;mine:number}>>`SELECT count(*) FILTER (WHERE "assignedStaffId" IS NULL)::int AS unassigned,count(*) FILTER (WHERE "assignedStaffId"=${f.users[2].id})::int AS mine FROM "Ticket" WHERE "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED') AND "createdAt"<=${asOf} AND "updatedAt"<=${asOf}`;
    expect(response.body.data.metrics).toMatchObject({unassignedActiveTickets:expected.unassigned,myActiveTickets:expected.mine,activeTicketsByItPriority:{LOW:2,MEDIUM:2,HIGH:2,URGENT:2}});
    expect(response.body.data.recentTickets).toHaveLength(5);
  });
  it("uses current assignee, not creator/performer/owner, and applies parent/action cutoffs",async()=>{
    const other=await db.user.create({data:{name:"I5 other staff",email:"i5-other@example.test",role:"IT_STAFF",passwordHash:f.users[2].passwordHash,mustChangePassword:false}});
    const parent=await f.ticket({assignedStaffId:other.id,createdAt:new Date("2020-01-01"),updatedAt:new Date("2020-01-01")}),before=(await dashboard()).body.data.metrics.myActiveActions;
    await f.action(parent.id,{createdById:other.id});await f.action(parent.id,{status:"IN_PROGRESS",createdById:other.id});await f.action(parent.id,{assignedToId:other.id});
    await f.action(parent.id,{status:"COMPLETED",result:"Completed fixture",performedById:f.users[2].id});
    await f.action(parent.id,{createdAt:new Date(asOf.getTime()+1)});await f.action(parent.id,{updatedAt:new Date(asOf.getTime()+1)});
    const future=await f.ticket({updatedAt:new Date(asOf.getTime()+1)});await f.action(future.id);
    const response=await dashboard();expect(response.body.data.metrics.myActiveActions).toBe(before+2);
    const [expected]=await db.$queryRaw<Array<{count:number}>>`SELECT count(*)::int AS count FROM "ActionTaken" a JOIN "Ticket" t ON t.id=a."ticketId" WHERE a."assignedToId"=${f.users[2].id} AND a.status IN ('PLANNED','IN_PROGRESS') AND a."createdAt"<=${asOf} AND a."updatedAt"<=${asOf} AND t."createdAt"<=${asOf} AND t."updatedAt"<=${asOf}`;
    expect(response.body.data.metrics.myActiveActions).toBe(expected.count);expect((await dashboard(3)).body.data.metrics.myActiveActions).toBe(0);
  });
  it("bounds action lists and preserves literal Administrator zero ownership",async()=>{
    const parent=await f.ticket();for(let i=0;i<8;i++)await f.action(parent.id);
    const response=await dashboard();expect(response.body.data.myActiveActions).toHaveLength(5);expect(response.body.data.metrics.myActiveActions).toBeGreaterThan(5);
    expect(Object.keys(response.body.data.myActiveActions[0]).sort()).toEqual(["id","ticketId","ticketNumber","description","status","updatedAt"].sort());
    const admin=await dashboard(3);expect(admin.status).toBe(200);expect(admin.body.data.metrics.myActiveTickets).toBe(0);expect(admin.body.data.myActiveActions).toEqual([]);
  });
  it("matches ownership/priority drill-down totals and retains page/sort filters",async()=>{
    const data=(await dashboard()).body.data;
    const links=[[data.drillDown.unassignedActiveTickets,data.metrics.unassignedActiveTickets],[data.drillDown.myActiveTickets,data.metrics.myActiveTickets],
      ...Object.entries(data.drillDown.activeTicketsByItPriority).map(([priority,link])=>[link,data.metrics.activeTicketsByItPriority[priority]])] as [{query:object},number][];
    for(const [link,count]of links){const response=await f.agents[2].get("/api/staff/tickets").query(link.query);expect(response.status).toBe(200);expect(response.body.pagination.total).toBe(count);
      expect((await f.agents[2].get("/api/staff/tickets").query({...link.query,page:2,sort:"updatedAt",order:"desc"})).status).toBe(200);}
    expect((await f.agents[2].get("/api/staff/tickets").query({...data.drillDown.myActiveTickets.query,assigned:"true"})).body.pagination.total).toBe(data.metrics.myActiveTickets);
  });
  it("denies Requesters and unsupported or contradictory controls",async()=>{
    expect((await dashboard(0)).status).toBe(403);expect((await f.agents[2].get("/api/staff/dashboard?owner=me")).status).toBe(400);expect((await f.agents[2].get("/api/staff/tickets?owner=me&assigned=false")).status).toBe(400);
  });
});
