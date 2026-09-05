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

  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let relatedSystemId: number;
  let ticketId: number;

  beforeAll(async () => {
    const requesterResponse =
      await request(app).get(
        "/api/requesters"
      );

    requesterAId =
      requesterResponse.body.data[0].id;

    requesterBId =
      requesterResponse.body.data[1].id;

    const categoryResponse =
      await request(app).get(
        "/api/categories"
      );

    categoryId =
      categoryResponse.body[0].id;

    const systemResponse =
      await request(app).get(
        "/api/related-systems"
      );

    relatedSystemId =
      systemResponse.body.data[0].id;

    const createResponse =
      await request(app)
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
  });

  it("returns an owned Ticket with its read-only detail fields", async () => {
    const response =
      await request(app).get(
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
      await request(app).get(
        `/api/tickets/${ticketId}`
      ).query({
        requesterId:
          requesterBId,
      });

    expect(
      response.status
    ).toBe(404);

    expect(
      response.body.error
    ).toBeDefined();
  });

  it("rejects an invalid Requester query", async () => {
    const response =
      await request(app).get(
        `/api/tickets/${ticketId}`
      );

    expect(
      response.status
    ).toBe(400);

    expect(
      response.body.error.code
    ).toBe(
      "INVALID_QUERY"
    );
  });
});