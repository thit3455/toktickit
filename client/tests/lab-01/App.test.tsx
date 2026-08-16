import { afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — success case
  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /check system/i })
    );

    expect(await screen.findByText("Online")).toBeInTheDocument();

    expect(
      screen.getByText("Account and Access")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Hardware")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Software")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Network")
    ).toBeInTheDocument();
  });

  // Issue 4 — failure case
  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("API unavailable")
    );

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /check system/i })
    );

    expect(
      await screen.findByText("Offline")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Unable to connect to TokTickIT API")
    ).toBeInTheDocument();
  });
});