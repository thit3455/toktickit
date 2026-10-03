import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
describe("Authenticated Requester identity replaces selection", () => {
  const user = { id: 1, name: "Alice Johnson", email: "alice@example.test", role: "REQUESTER" as const, mustChangePassword: false };
  beforeEach(() => {
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]);
  });
  afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });
  it("uses the same initial-password screen for Requesters and opens tickets after changing", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({ ...user, mustChangePassword: true });
    const change = vi.spyOn(api, "changePassword").mockResolvedValue();
    render(<App />);
    await screen.findByRole("heading", { name: "Change Password" });
    expect(screen.queryByRole("button", { name: "My Tickets" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "NewRequester123!" } });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("New passwords do not match.");
    expect(change).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "NewRequester123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    await screen.findByRole("heading", { name: "Create Ticket" });
    expect(change).toHaveBeenCalledWith("Password123!", "NewRequester123!");
  });
  it.each([
    ["7 characters", "a".repeat(7), false],
    ["8 characters", "a".repeat(8), true],
    ["72 bytes", "a".repeat(72), true],
    ["73 bytes", "a".repeat(73), false],
    ["72 multibyte bytes", "é".repeat(36), true],
    ["73 multibyte bytes", "é".repeat(36) + "a", false],
  ])("validates password boundary: %s", async (_label, password, valid) => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({ ...user, mustChangePassword: true });
    const change = vi.spyOn(api, "changePassword").mockResolvedValue();
    render(<App />);
    await screen.findByRole("heading", { name: "Change Password" });
    fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: password } });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    if (valid) {
      await screen.findByRole("heading", { name: "Create Ticket" });
      expect(change).toHaveBeenCalledWith("Password123!", password);
    } else {
      expect(change).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(String(password).length < 8 ? "at least 8 characters" : "at most 72 UTF-8 bytes");
    }
  });
  it("shows session loading", () => {
    vi.spyOn(api, "getCurrentUser").mockImplementation(() => new Promise(() => {}));
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading session");
  });
  it("requires login without a session", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    render(<App />);
    expect(await screen.findByRole("heading", { name: "TokTickIT Login" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Development Requester")).toBeNull();
  });
  it("ignores stored identity and shows authenticated name and role", async () => {
    sessionStorage.setItem("developmentRequesterId", "999");
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
    render(<App />);
    await screen.findByRole("heading", { name: "Create Ticket" });
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText(/REQUESTER/)).toBeInTheDocument();
    for (const name of ["Change Requester", "IT Staff Queue", "Claim Ticket", "User Management"]) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(screen.queryByText("Internal Notes")).toBeNull();
  });
  it("logs out and clears protected screens", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
    const signout = vi.spyOn(api, "logout").mockResolvedValue();
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Logout" }));
    await screen.findByRole("heading", { name: "TokTickIT Login" });
    expect(signout).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "My Tickets" })).toBeNull();
  });
  it("shows a safe session failure", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(new Error("private database detail"));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to restore your session");
    expect(screen.queryByText(/private database/)).toBeNull();
  });
  it("shows logout failure without claiming success", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
    vi.spyOn(api, "logout").mockRejectedValue(new Error("offline"));
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Logout" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to log out");
    expect(screen.getByRole("heading", { name: "Create Ticket" })).toBeInTheDocument();
  });
});
