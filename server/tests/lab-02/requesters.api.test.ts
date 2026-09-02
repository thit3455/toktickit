import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters", () => {
  it("returns only active Development Requesters", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);

    expect(response.body).toHaveProperty("data");
    expect(Array.isArray(response.body.data)).toBe(true);

    expect(response.body.data.length).toBeGreaterThanOrEqual(4);

    for (const requester of response.body.data) {
      expect(requester).toHaveProperty("id");
      expect(requester).toHaveProperty("name");
      expect(requester).toHaveProperty("email");

      // API should not expose inactive Requesters.
      expect(requester).not.toHaveProperty("isActive");
    }

    const emails = response.body.data.map(
      (requester: { email: string }) => requester.email
    );

    expect(emails).not.toContain(
      "inactive.requester@toktickit.test"
    );
  });
});