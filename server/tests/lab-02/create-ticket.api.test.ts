import { describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../../src/app.js";

describe("POST /api/tickets", () => {
  // ---------------------------------------------------------
  // Test 1 — Valid Ticket creation
  // ---------------------------------------------------------

  it("creates a valid Ticket and returns an official Ticket Number", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Laptop battery drains quickly",
        requestedPriority: "MEDIUM",
        description:
          "The laptop battery becomes empty after approximately one hour.",
      });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty("data");

    expect(response.body.data).toHaveProperty("id");

    expect(response.body.data).toHaveProperty(
      "ticketNumber"
    );

    expect(
      response.body.data.ticketNumber
    ).toMatch(/^TKT-\d{4}-\d+$/);

    expect(
      response.body.data.requesterId
    ).toBe(1);

    expect(
      response.body.data.categoryId
    ).toBe(1);

    expect(
      response.body.data.relatedSystemId
    ).toBe(1);

    expect(
      response.body.data.requestedPriority
    ).toBe("MEDIUM");

    expect(
      response.body.data.currentStatus
    ).toBe("NEW");
  });

  // ---------------------------------------------------------
  // Test 2 — Invalid Ticket creation
  // ---------------------------------------------------------

  it("rejects a Ticket when required fields are invalid", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "",
        requestedPriority: "URGENT",
        description: "",
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "The request contains invalid data.",
      },
    });
  });

  // ---------------------------------------------------------
  // Test 3 — Invalid reference
  // ---------------------------------------------------------

  it("rejects a Ticket when a referenced record does not exist", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: 999999,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Laptop battery problem",
        requestedPriority: "HIGH",
        description:
          "The laptop battery is not working correctly.",
      });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      error: {
        code: "REFERENCE_NOT_FOUND",
        message:
          "Requester, Category, or Related System was not found.",
      },
    });
  });
});