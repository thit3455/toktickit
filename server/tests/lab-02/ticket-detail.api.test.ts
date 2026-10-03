import { requesterFixture } from "../helpers/requester.js";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";

import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/tickets/:id", () => {
  const prisma = getPrisma();
  let fixture: Awaited<ReturnType<typeof requesterFixture>>;

  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let relatedSystemId: number;
  let ticketId: number;

  beforeAll(async () => {
    fixture = await requesterFixture();
    requesterAId = fixture.users[0].id;
    requesterBId = fixture.users[1].id;
    const categoryResponse =
      await fixture.agents[0].get(
        "/api/categories"
      );

    categoryId =
      categoryResponse.body[0].id;

    const systemResponse =
      await fixture.agents[0].get(
        "/api/related-systems"
      );

    relatedSystemId =
      systemResponse.body.data[0].id;

    const createResponse =
      await fixture.agents[0]
        .post("/api/tickets")
        .send({
          requesterId:
            requesterAId,

          categoryId,

          relatedSystemId,

          summary:
            "Ticket detail ownership test",

          requestedPriority:
            "MEDIUM",

          description:
            "This ticket is created for the Ticket Detail API test.",
        });

    expect(
      createResponse.status
    ).toBe(201);

    ticketId =
      createResponse.body.data.id;
  });

  afterAll(async () => {
    if (ticketId) {
      await prisma.ticket.delete({
        where: {
          id: ticketId,
        },
      });
    }
    await fixture?.cleanup();
  });

  it("returns an owned Ticket with its read-only detail fields", async () => {
    const response =
      await fixture.agents[0].get(
        `/api/tickets/${ticketId}`
      ).query({
        requesterId:
          requesterAId,
      });

    expect(
      response.status
    ).toBe(200);

    expect(
      response.body.data
    ).toMatchObject({
      id: ticketId,
      requesterId:
        requesterAId,
      summary:
        "Ticket detail ownership test",
      description:
        "This ticket is created for the Ticket Detail API test.",
      requestedPriority:
        "MEDIUM",
      currentStatus:
        "NEW",
    });

    expect(
      response.body.data.ticketNumber
    ).toMatch(
      /^TKT-\d{4}-\d+$/
    );

    expect(
      response.body.data.category
    ).toHaveProperty("name");

    expect(
      response.body.data.relatedSystem
    ).toHaveProperty("name");

    expect(
      response.body.data.requester
    ).toHaveProperty("name");
  });

  it("does not return another Requester's Ticket", async () => {
    const response =
      await fixture.agents[1].get(
        `/api/tickets/${ticketId}`
      ).query({
        requesterId:
          requesterAId,
      });

    expect(
      response.status
    ).toBe(404);

    expect(
      response.body.error
    ).toBeDefined();
  });

  it("rejects unauthenticated detail access", async () => {
    const response =
      await request(app).get(
        `/api/tickets/${ticketId}`
      );

    expect(
      response.status
    ).toBe(401);

    expect(
      response.body.error.code
    ).toBe(
      "UNAUTHENTICATED"
    );
  });
});