import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Issue 4 — verifies that GET /api/categories returns the four
// seeded categories from PostgreSQL in predictable id order.
describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);

    expect(response.body).toHaveLength(4);

    expect(
      response.body.map((category: { name: string }) => category.name)
    ).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);

    const ids = response.body.map(
      (category: { id: number }) => category.id
    );

    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});