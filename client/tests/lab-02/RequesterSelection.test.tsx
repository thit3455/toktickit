import { afterEach, describe, it, expect, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("Development Requester Selection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("shows the Requester selection screen", () => {
    vi.spyOn(api, "getRequesters").mockImplementation(
      () => new Promise(() => {})
    );

    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Select a Development Requester",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/This is not a login screen/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("combobox", {
        name: /Development Requester/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Continue/i,
      })
    ).toBeDisabled();
  });

  it("shows a loading state while Requesters are loading", () => {
    vi.spyOn(api, "getRequesters").mockImplementation(
      () => new Promise(() => {})
    );

    render(<App />);

    expect(
      screen.getByText(/Loading Development Requesters/i)
    ).toBeInTheDocument();
  });

  it("shows an empty state when no active Requesters exist", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([]);

    render(<App />);

    expect(
      await screen.findByText(
        /No active Development Requesters are available/i
      )
    ).toBeInTheDocument();
  });

  it("shows a safe failure state when the API fails", async () => {
    vi.spyOn(api, "getRequesters").mockRejectedValue(
      new Error("API failure")
    );

    render(<App />);

    expect(
      await screen.findByText(
        /Unable to load Development Requesters/i
      )
    ).toBeInTheDocument();
  });

  it("selects a Requester and allows changing Requester", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice.johnson@toktickit.test",
      },
      {
        id: 2,
        name: "Brian Smith",
        email: "brian.smith@toktickit.test",
      },
    ]);

    render(<App />);

    const requesterSelect = await screen.findByRole(
      "combobox",
      {
        name: /Development Requester/i,
      }
    );

    fireEvent.change(requesterSelect, {
      target: { value: "1" },
    });

    const continueButton = screen.getByRole("button", {
      name: /Continue/i,
    });

    expect(continueButton).toBeEnabled();

    fireEvent.click(continueButton);

    expect(
      screen.getByText(/Current Requester:/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText("Alice Johnson")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Change Requester/i,
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Select a Development Requester",
      })
    ).toBeInTheDocument();
  });

  it("stores the selected Requester for the current browser session", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice.johnson@toktickit.test",
      },
    ]);

    render(<App />);

    const requesterSelect = await screen.findByRole(
      "combobox",
      {
        name: /Development Requester/i,
      }
    );

    fireEvent.change(requesterSelect, {
      target: { value: "1" },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Continue/i,
      })
    );

    expect(
      sessionStorage.getItem("developmentRequesterId")
    ).toBe("1");
  });
});