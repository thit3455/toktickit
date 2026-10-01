import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
describe("Retired Development Requester API", () => {
  it("does not publish user identities", async () => {
    const response = await request(app).get("/api/requesters");
    expect(response.status).toBe(404);
    expect(response.body.data).toBeUndefined();
  });
});
