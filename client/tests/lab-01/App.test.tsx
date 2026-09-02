import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App.js";

describe("App", () => {
  it("renders the TokTickIT application identity", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /TokTickIT IT Service Desk/i,
      })
    ).toBeInTheDocument();
  });

  it("shows the Development Requester selection screen", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Select a Development Requester",
      })
    ).toBeInTheDocument();
  });
});