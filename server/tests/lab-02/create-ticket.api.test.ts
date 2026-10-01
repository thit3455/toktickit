import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requesterFixture } from "../helpers/requester.js";
import { getPrisma } from "../../src/prisma.js";
describe("POST /api/tickets authenticated regression", () => {
  let fixture: Awaited<ReturnType<typeof requesterFixture>>;
  let categoryId: number, relatedSystemId: number;
  const prisma = getPrisma();
  const payload = () => ({ categoryId, relatedSystemId, summary: "Laptop battery drains quickly", requestedPriority: "MEDIUM", description: "The laptop battery becomes empty after approximately one hour." });
  beforeAll(async () => {
    fixture = await requesterFixture();
    categoryId = (await prisma.category.findFirstOrThrow({ where: { isActive: true } })).id;
    relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } })).id;
  });
  afterAll(async () => fixture?.cleanup());
  it("creates an official ticket using authenticated identity despite tampering", async () => {
    const response = await fixture.agents[0].post("/api/tickets").send({ ...payload(), requesterId: fixture.users[1].id, currentStatus: "CLOSED" });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ requesterId: fixture.users[0].id, categoryId, relatedSystemId, requestedPriority: "MEDIUM", currentStatus: "NEW" });
    expect(response.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d+$/);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: response.body.data.id } })).description).toBe(payload().description);
  });
  it("preserves required-field and length validation", async () => {
    for (const invalid of [{ summary: "" }, { summary: "tiny" }, { summary: "x".repeat(121) }, { description: "short" }, { description: "x".repeat(2001) }, { requestedPriority: "URGENT" }]) {
      const response = await fixture.agents[0].post("/api/tickets").send({ ...payload(), ...invalid });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
  it("rejects a missing reference", async () => {
    const response = await fixture.agents[0].post("/api/tickets").send({ ...payload(), categoryId: 2147483647 });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("REFERENCE_NOT_FOUND");
  });
});
