import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AdminUserManagement } from "../../src/AdminUserManagement";
import App from "../../src/App";
import * as api from "../../src/api";
const admin: api.ManagedUser = { id: 1, name: "Test Administrator", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false };
const requester: api.ManagedUser = { id: 2, name: "Test Requester", email: "requester@example.test", role: "REQUESTER", isActive: false, mustChangePassword: true };
const onSelfChange = vi.fn(), onSessionEnded = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(api, "getAdminUsers").mockResolvedValue([admin, requester]);
  vi.spyOn(api, "createAdminUser").mockResolvedValue({ ...requester, isActive: true });
  vi.spyOn(api, "updateAdminUser").mockResolvedValue({ ...requester, isActive: true });
  vi.spyOn(api, "setAdminInitialPassword").mockResolvedValue(requester);
});
afterEach(() => vi.restoreAllMocks());
const show = () => render(<AdminUserManagement currentUserId={1} onSelfChange={onSelfChange} onSessionEnded={onSessionEnded} />);
async function createForm() {
  show();
  await screen.findByText(requester.email);
  fireEvent.click(screen.getByRole("button", { name: "Create User" }));
}
function fillCreate() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New User" } });
  fireEvent.change(screen.getByLabelText("Email Address", { exact: true }), { target: { value: "new@example.test" } });
  fireEvent.change(screen.getByLabelText("Initial password"), { target: { value: "InitialPass123!" } });
}
describe("Administrator User Management", () => {
  const manyUsers = Array.from({ length: 23 }, (_, index) => ({ ...requester, id: index + 10, name: `User ${String(index + 1).padStart(2, "0")}`, email: `user${index + 1}@example.test` }));
  async function showPages() {
    vi.mocked(api.getAdminUsers).mockResolvedValue(manyUsers);
    show(); await screen.findByText("Page 1 of 3 · 23 users");
  }
  it("paginates 23 users as 10/10/3 with next, previous and direct page navigation", async () => {
    await showPages();
    expect(rowNames()).toEqual(manyUsers.slice(0, 10).map(user => user.name));
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(rowNames()).toEqual(manyUsers.slice(10, 20).map(user => user.name));
    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    expect(rowNames()).toEqual(manyUsers.slice(0, 10).map(user => user.name));
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(rowNames()).toEqual(manyUsers.slice(20).map(user => user.name));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Edit user23@example.test" }));
    expect(screen.getByLabelText("Name")).toHaveValue("User 23");
    fireEvent.click(screen.getByRole("button", { name: "Set initial password for user23@example.test" }));
    expect(screen.getByRole("form", { name: "Initial password form" })).toHaveTextContent("user23@example.test");
  });
  it.each(["search", "role", "status", "clear"])("resets pagination for %s changes", async action => {
    await showPages(); fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    if (action === "search") {
      fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "user23@example.test" } });
      expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
      vi.mocked(api.getAdminUsers).mockResolvedValue([manyUsers[22]]);
      fireEvent.click(screen.getByRole("button", { name: "Search" }));
    } else if (action === "clear") fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    else {
      vi.mocked(api.getAdminUsers).mockResolvedValue([manyUsers[22]]);
      fireEvent.change(screen.getByLabelText(action === "role" ? "Filter by role" : "Filter by status"), { target: { value: action === "role" ? "REQUESTER" : "false" } });
    }
    await waitFor(() => expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page"));
    if (action !== "clear") await waitFor(() => expect(rowNames()).toEqual(["User 23"]));
    if (action === "status") expect(api.getAdminUsers).toHaveBeenLastCalledWith({ search: "", role: "", active: "false" }, expect.any(AbortSignal));
  });
  it("sorts the entire result set before paging and resets to page one", async () => {
    await showPages(); fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Sort by name descending" }));
    expect(rowNames()).toEqual([...manyUsers].reverse().slice(0, 10).map(user => user.name));
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(rowNames()).toEqual([...manyUsers].reverse().slice(10, 20).map(user => user.name));
  });
  it("hides pagination on no results", async () => {
    await showPages(); fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    vi.mocked(api.getAdminUsers).mockResolvedValue([]);
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "absent" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("No users match your search or filters.");
    expect(screen.queryByRole("navigation", { name: "User pages" })).toBeNull();
  });
  it("limits page numbers with ellipses and still reaches the final page", async () => {
    vi.mocked(api.getAdminUsers).mockResolvedValue(Array.from({ length: 103 }, (_, index) => ({ ...requester, id: index + 10, email: `many${index}@example.test` })));
    show(); await screen.findByText("Page 1 of 11 · 103 users");
    expect(screen.getAllByRole("button", { name: /^Page / })).toHaveLength(4);
    expect(screen.getByText("…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Page 11" }));
    expect(screen.getAllByRole("row", { name: /^User / })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
  const sortingUsers: api.ManagedUser[] = [
    { ...requester, id: 3, name: "Zoe", email: "zoe@example.test", isActive: true },
    { ...admin, name: "Maya", isActive: false },
    { ...requester, name: "alice", role: "IT_STAFF" },
  ];
  const rowNames = () => screen.getAllByRole("row", { name: /^User / }).map(row => within(row).getAllByRole("cell")[0].textContent);
  it.each([
    ["Name", ["alice", "Maya", "Zoe"], ["Zoe", "Maya", "alice"]],
    ["Role", ["Maya", "alice", "Zoe"], ["Zoe", "alice", "Maya"]],
    ["Email", ["Maya", "alice", "Zoe"], ["Zoe", "alice", "Maya"]],
    ["Status", ["Zoe", "Maya", "alice"], ["Maya", "alice", "Zoe"]],
  ] as const)("sorts %s in both directions and marks the active header", async (field, ascending, descending) => {
    vi.mocked(api.getAdminUsers).mockResolvedValue(sortingUsers);
    show(); await screen.findByText("zoe@example.test");
    if (field !== "Name") fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Sort by ${field.toLowerCase()} `) }));
    expect(rowNames()).toEqual(ascending);
    expect(screen.getByRole("columnheader", { name: field })).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Sort by ${field.toLowerCase()} `) }));
    expect(rowNames()).toEqual(descending);
    expect(screen.getByRole("columnheader", { name: field })).toHaveAttribute("aria-sort", "descending");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Sort by ${field.toLowerCase()} `) }));
    expect(rowNames()).toEqual(ascending);
    expect(api.getAdminUsers).toHaveBeenCalledTimes(1);
    expect(sortingUsers.map(user => user.name)).toEqual(["Zoe", "Maya", "alice"]);
  });
  it("keeps Email visible and Action header unsortable with outlined actions", async () => {
    show(); await screen.findByText(requester.email);
    for (const name of ["Action"]) {
      const header = screen.getByRole("columnheader", { name });
      expect(within(header).queryByRole("button")).toBeNull();
      expect(header).not.toHaveAttribute("aria-sort");
    }
    expect(screen.getByRole("button", { name: `Set initial password for ${requester.email}` })).toHaveTextContent("Set Password");
    expect(screen.getByRole("button", { name: `Set initial password for ${requester.email}` })).toHaveClass("btn-outline-success");
    expect(screen.getByRole("button", { name: `Edit ${requester.email}` })).toHaveClass("btn-outline-success");
  });
  it.each(["alice", "requester@example.test"])("preserves sorting across search %s and combined filters", async search => {
    vi.mocked(api.getAdminUsers).mockResolvedValueOnce(sortingUsers).mockResolvedValue([sortingUsers[2], sortingUsers[0]]);
    show(); await screen.findByText("zoe@example.test");
    fireEvent.click(screen.getByRole("button", { name: /^Sort by name / }));
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: search } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByLabelText("Filter by role"), { target: { value: "REQUESTER" } });
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith({ search, role: "REQUESTER", active: "" }, expect.any(AbortSignal)));
    await waitFor(() => expect(rowNames()).toEqual(["Zoe", "alice"]));
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "descending");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith({ search: "", role: "", active: "" }, expect.any(AbortSignal)));
    await waitFor(() => expect(rowNames()).toEqual(["Zoe", "alice"]));
  });
  it("shows loading then name, email, role and active/inactive status", async () => {
    show(); expect(screen.getByRole("status")).toHaveTextContent("Loading users");
    const card = await screen.findByRole("row", { name: "User requester@example.test" });
    expect(card).toHaveTextContent("Test Requester");
    expect(card).toHaveTextContent("REQUESTER");
    expect(card).toHaveTextContent("Inactive");
    expect(screen.getByRole("row", { name: "User admin@example.test" })).toHaveTextContent("Active");
  });
  it("sends combined search and role filters and can clear them", async () => {
    show(); await screen.findByText(requester.email);
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: " Requester " } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByLabelText("Filter by role"), { target: { value: "REQUESTER" } });
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith({ search: "Requester", role: "REQUESTER", active: "" }, expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith({ search: "", role: "", active: "" }, expect.any(AbortSignal)));
  });
  it("distinguishes an empty list from no search results", async () => {
    vi.mocked(api.getAdminUsers).mockResolvedValue([]);
    show(); await screen.findByText("No users found.");
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "absent" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("No users match your search or filters.");
  });
  it("validates fields before sending create", async () => {
    await createForm();
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByLabelText("Initial password")).toHaveAttribute("aria-describedby", expect.stringContaining("admin-password-error"));
    expect(api.createAdminUser).not.toHaveBeenCalled();
  });
  it.each(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"])("creates a %s account and refreshes the list", async role => {
    await createForm(); fillCreate();
    fireEvent.change(screen.getByLabelText("Role", { exact: true }), { target: { value: role } });
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    await screen.findByText("User created. The initial password must be changed on first login.");
    expect(api.createAdminUser).toHaveBeenCalledWith({ name: "New User", email: "new@example.test", role, isActive: true, password: "InitialPass123!" });
    expect(screen.queryByLabelText("Initial password")).toBeNull();
  });
  it("shows saving and prevents duplicate submission", async () => {
    let finish!: (value: api.ManagedUser) => void;
    vi.mocked(api.createAdminUser).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await createForm(); fillCreate();
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    await act(async () => finish(requester));
  });
  it("loads existing values and saves role, status and profile changes", async () => {
    show(); fireEvent.click(await screen.findByRole("button", { name: "Edit requester@example.test" }));
    expect(screen.getByLabelText("Name")).toHaveValue(requester.name);
    expect(screen.getByLabelText("Account status")).toHaveValue("false");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Updated user" } });
    fireEvent.change(screen.getByLabelText("Role", { exact: true }), { target: { value: "IT_STAFF" } });
    fireEvent.change(screen.getByLabelText("Account status"), { target: { value: "true" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await screen.findByText("User updated successfully.");
    expect(api.updateAdminUser).toHaveBeenCalledWith(2, { name: "Updated user", email: requester.email, role: "IT_STAFF", isActive: true });
  });
  it("preserves form values and associates duplicate email feedback", async () => {
    vi.mocked(api.createAdminUser).mockRejectedValue(new api.AdminApiError(409, "An account with this email already exists.", { email: "Email is already in use." }));
    await createForm(); fillCreate();
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
    expect(screen.getByLabelText("Email Address", { exact: true })).toHaveValue("new@example.test");
    expect(screen.getByLabelText("Email Address", { exact: true })).toHaveAttribute("aria-describedby", "admin-email-error");
  });
  it("shows last-Administrator and missing-user failures without discarding edits", async () => {
    vi.mocked(api.updateAdminUser).mockRejectedValueOnce(new api.AdminApiError(409, "At least one active Administrator must remain."))
      .mockRejectedValueOnce(new api.AdminApiError(404, "User was not found. Refresh the list."));
    show(); fireEvent.click(await screen.findByRole("button", { name: "Edit admin@example.test" }));
    expect(within(screen.getByLabelText("Account status")).getByRole("option", { name: "Inactive" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Role", { exact: true }), { target: { value: "REQUESTER" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await screen.findByText("At least one active Administrator must remain.");
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await screen.findByText("User was not found. Refresh the list.");
  });
  it("sets an initial password and clears the password form after success", async () => {
    show(); fireEvent.click(await screen.findByRole("button", { name: "Set initial password for requester@example.test" }));
    fireEvent.change(screen.getByLabelText("Initial password"), { target: { value: "ResetInitial123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Set Initial Password" }));
    await screen.findByText("Initial password set. Existing sessions have been signed out.");
    expect(api.setAdminInitialPassword).toHaveBeenCalledWith(2, "ResetInitial123!");
    expect(screen.queryByLabelText("Initial password")).toBeNull();
  });
  it("updates the shell identity on self-edit and signs out after self-role change", async () => {
    vi.mocked(api.updateAdminUser).mockResolvedValueOnce({ ...admin, name: "Renamed Admin" }).mockResolvedValueOnce({ ...admin, role: "REQUESTER" });
    show(); fireEvent.click(await screen.findByRole("button", { name: "Edit admin@example.test" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(onSelfChange).toHaveBeenCalledWith(expect.objectContaining({ name: "Renamed Admin" })));
    fireEvent.click(await screen.findByRole("button", { name: "Edit admin@example.test" }));
    fireEvent.change(screen.getByLabelText("Role", { exact: true }), { target: { value: "REQUESTER" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(onSessionEnded).toHaveBeenCalledOnce());
  });
  it.each([401, 403])("hides all protected account controls on HTTP %s", async status => {
    vi.mocked(api.getAdminUsers).mockRejectedValue(new api.AdminApiError(status, status === 401 ? "Your session has expired." : "Administrator access is required."));
    show(); await screen.findByRole("alert");
    expect(screen.queryByText(requester.email)).toBeNull();
    expect(screen.queryByRole("button", { name: "Create User" })).toBeNull();
  });
  it("handles server failures safely and retries", async () => {
    vi.mocked(api.getAdminUsers).mockRejectedValueOnce(new Error("private database detail"));
    show(); expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load users");
    expect(screen.queryByText(/private database/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText(requester.email);
  });
  it("ignores stale list responses after filter changes", async () => {
    let finish!: (users: api.ManagedUser[]) => void;
    vi.mocked(api.getAdminUsers).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce([]);
    show(); fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "missing" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("No users match your search or filters.");
    await act(async () => finish([requester]));
    expect(screen.queryByText(requester.email)).toBeNull();
  });
  it("preserves the Administrator shell and logout without ticket operation navigation", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(admin);
    vi.spyOn(api, "logout").mockResolvedValue();
    render(<App />);
    await screen.findByRole("heading", { name: "User Management" });
    expect(screen.getByText("Test Administrator", { selector: "main > div > div > p > strong" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Administrator navigation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "IT Staff Queue" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Create Ticket" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await screen.findByRole("heading", { name: "TokTickIT Login" });
    expect(screen.queryByRole("heading", { name: "User Management" })).toBeNull();
  });
  it.each(["REQUESTER", "IT_STAFF"] as const)("does not mount Administrator controls for %s", async role => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({ ...admin, role });
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTickets").mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    render(<App />);
    await screen.findByRole("heading", { name: role === "REQUESTER" ? "Create Ticket" : "IT Staff Ticket Queue" });
    expect(api.getAdminUsers).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "User Management" })).toBeNull();
  });
});
