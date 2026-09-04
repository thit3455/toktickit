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

describe("GET /api/tickets", () => {
  const prisma = getPrisma();

  let requesterId: number;
  let categoryOneId: number;
  let categoryTwoId: number;
  let relatedSystemId: number;

  const createdTicketIds: number[] = [];

  const testToken =
    `MY-TICKETS-${Date.now()}`;

  // ---------------------------------------------------------
  // Prepare deterministic Ticket data for these tests
  // ---------------------------------------------------------

  beforeAll(async () => {
    const requesterResponse =
      await request(app).get(
        "/api/requesters"
      );

    requesterId =
      requesterResponse.body.data[0].id;

    const categoryResponse =
      await request(app).get(
        "/api/categories"
      );

    categoryOneId =
      categoryResponse.body[0].id;

    categoryTwoId =
      categoryResponse.body[1].id;

    const systemResponse =
      await request(app).get(
        "/api/related-systems"
      );

    relatedSystemId =
      systemResponse.body.data[0].id;

    // Create 11 Tickets so pagination can be tested.
    for (let index = 1; index <= 11; index++) {
      const priority =
        index % 3 === 0
          ? "HIGH"
          : index % 3 === 1
            ? "LOW"
            : "MEDIUM";

      const categoryId =
        index % 2 === 0
          ? categoryTwoId
          : categoryOneId;

      const response = await request(app)
        .post("/api/tickets")
        .send({
          requesterId,
          categoryId,
          relatedSystemId,

          summary:
            `${testToken} Ticket ${String(index).padStart(2, "0")}`,

          requestedPriority:
            priority,

          description:
            `Test description for My Tickets API Ticket ${index}.`,
        });

      expect(response.status).toBe(201);

      createdTicketIds.push(
        response.body.data.id
      );
    }
  });

  // ---------------------------------------------------------
  // Clean up test Tickets
  // ---------------------------------------------------------

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: {
          id: {
            in: createdTicketIds,
          },
        },
      });
    }
  });

  // ---------------------------------------------------------
  // Test 1 — Requester ownership
  // ---------------------------------------------------------

  it("returns only Tickets belonging to the selected Requester", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .query({
        requesterId,
        page: 1,
        pageSize: 10,
      });

    expect(response.status).toBe(200);

    expect(
      Array.isArray(response.body.data)
    ).toBe(true);

    expect(
      response.body
    ).toHaveProperty("pagination");

    for (const ticket of response.body.data) {
      expect(
        ticket.requesterId
      ).toBe(requesterId);
    }
  });

  // ---------------------------------------------------------
  // Test 2 — Search
  // ---------------------------------------------------------

  it("searches Tickets by summary", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .query({
        requesterId,
        search:
          `${testToken} Ticket 03`,
        page: 1,
        pageSize: 10,
      });

    expect(response.status).toBe(200);

    expect(
      response.body.data
    ).toHaveLength(1);

    expect(
      response.body.data[0].summary
    ).toContain(
      `${testToken} Ticket 03`
    );
  });

  // ---------------------------------------------------------
  // Test 3 — Filters
  // ---------------------------------------------------------

  it("filters Tickets by Category and Requested Priority", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .query({
        requesterId,
        search: testToken,
        categoryId:
          categoryOneId,
        requestedPriority:
          "HIGH",
        page: 1,
        pageSize: 10,
      });

    expect(response.status).toBe(200);

    expect(
      response.body.data.length
    ).toBeGreaterThan(0);

    for (const ticket of response.body.data) {
      expect(
        ticket.category.id
      ).toBe(categoryOneId);

      expect(
        ticket.requestedPriority
      ).toBe("HIGH");
    }
  });

  // ---------------------------------------------------------
  // Test 4 — Sorting
  // ---------------------------------------------------------

  it("sorts Tickets by Ticket Number in ascending order", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .query({
        requesterId,
        search: testToken,
        sortBy:
          "ticketNumber",
        sortOrder: "asc",
        page: 1,
        pageSize: 20,
      });

    expect(response.status).toBe(200);

    const ticketNumbers =
      response.body.data.map(
        (ticket: {
          ticketNumber: string;
        }) =>
          ticket.ticketNumber
      );

    const sortedNumbers = [
      ...ticketNumbers,
    ].sort();

    expect(ticketNumbers).toEqual(
      sortedNumbers
    );
  });

  // ---------------------------------------------------------
  // Test 5 — Pagination
  // ---------------------------------------------------------

  it("paginates requester Tickets correctly", async () => {
    const firstPage =
      await request(app)
        .get("/api/tickets")
        .query({
          requesterId,
          search: testToken,
          page: 1,
          pageSize: 10,
        });

    expect(
      firstPage.status
    ).toBe(200);

    expect(
      firstPage.body.data
    ).toHaveLength(10);

    expect(
      firstPage.body.pagination
        .totalItems
    ).toBe(11);

    expect(
      firstPage.body.pagination
        .totalPages
    ).toBe(2);

    const secondPage =
      await request(app)
        .get("/api/tickets")
        .query({
          requesterId,
          search: testToken,
          page: 2,
          pageSize: 10,
        });

    expect(
      secondPage.status
    ).toBe(200);

    expect(
      secondPage.body.data
    ).toHaveLength(1);

    expect(
      secondPage.body.pagination.page
    ).toBe(2);
  });
});