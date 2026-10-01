import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
describe("App", () => {
  afterEach(() => vi.restoreAllMocks());
  it("renders the TokTickIT identity at login", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    render(<App />);
    expect(await screen.findByRole("heading", { name: "TokTickIT Login" })).toBeInTheDocument();
  });
  it("does not expose the retired selector", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    render(<App />);
    await screen.findByRole("button", { name: "Login" });
    expect(screen.queryByLabelText("Development Requester")).toBeNull();
  });
});
