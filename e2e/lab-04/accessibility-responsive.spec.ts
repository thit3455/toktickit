import { test, expect } from "./i6-browser-fixtures";
import { inspectScreen, keyboardActivate, visibleFocus } from "./i6-accessibility";
import type { Page } from "@playwright/test";
test.use({ baseURL: "http://localhost:5174", trace: "retain-on-failure", screenshot: "only-on-failure" });
test.setTimeout(180000);
async function login(page: Page, email: string, password: string) { await page.goto("/"); await page.getByLabel("Email", { exact: true }).fill(email); await page.getByLabel("Password", { exact: true }).fill(password); await keyboardActivate(page, page.getByRole("button", { name: "Login", exact: true })); }
test("keyboard login and mandatory password change work for all roles", async ({ page, sample }, info) => {
    await page.goto("/");
    await inspectScreen(page, "login", info);
    await page.getByLabel("Email", { exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Login", exact: true })).toBeFocused();
    await visibleFocus(page, page.getByRole("button", { name: "Login", exact: true }));
    for (const index of [0, 2, 4]) {
        const user = sample.users[index];
        await sample.db.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
        await login(page, user.email, sample.password);
        await expect(page.getByRole("heading", { name: "Change Password", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Dashboard", exact: true })).toHaveCount(0);
        expect((await page.request.get(sample.api + "/api/requester/dashboard")).status()).toBe(403);
        await page.getByLabel("Current Password", { exact: true }).fill(sample.password);
        await page.getByLabel("New Password", { exact: true }).fill(sample.password);
        await page.getByLabel("Confirm New Password", { exact: true }).fill(sample.password);
        await keyboardActivate(page, page.getByRole("button", { name: "Change Password", exact: true }));
        await expect(page.getByRole("alert")).toContainText("New password must differ");
        await expect(page.getByRole("heading", { name: "Change Password", exact: true })).toBeVisible();
        expect((await sample.db.user.findUniqueOrThrow({ where: { id: user.id }, select: { mustChangePassword: true } })).mustChangePassword).toBe(true);
        await inspectScreen(page, "mandatory-" + user.role.toLowerCase(), info);
        await page.getByLabel("Current Password", { exact: true }).fill(sample.password);
        await page.getByLabel("New Password", { exact: true }).fill("I6ChangedPassword123!");
        await page.getByLabel("Confirm New Password", { exact: true }).fill("I6ChangedPassword123!");
        await keyboardActivate(page, page.getByRole("button", { name: "Change Password", exact: true }));
        await expect(page.getByRole("button", { name: "Dashboard", exact: true })).toBeVisible();
        expect((await sample.db.user.findUniqueOrThrow({ where: { id: user.id }, select: { mustChangePassword: true } })).mustChangePassword).toBe(false);
        await keyboardActivate(page, page.getByRole("button", { name: "Logout", exact: true }));
        await login(page, user.email, sample.password);
        await expect(page.getByRole("alert")).toContainText("Invalid email or password");
    }
});
test("Requester major screens, validation, safe feedback and focus", async ({ page, sample }, info) => {
    await login(page, sample.users[0].email, sample.password);
    await expect(page.getByRole("heading", { name: "Requester Dashboard", exact: true })).toBeVisible();
    await inspectScreen(page, "requester-dashboard", info);
    await page.getByRole("button", { name: "Dashboard", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "My Tickets", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "My Tickets", exact: true })).toBeVisible();
    await inspectScreen(page, "requester-list", info);
    await keyboardActivate(page, page.getByRole("button", { name: sample.ticket.ticketNumber, exact: true }));
    await expect(page.getByRole("heading", { name: "Actions Taken", exact: true })).toBeVisible();
    await inspectScreen(page, "requester-detail-actions", info);
    await expect(page.getByRole("button", { name: "Record action", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Internal Notes", exact: true })).toHaveCount(0);
    await keyboardActivate(page, page.getByRole("button", { name: "Create Ticket", exact: true }));
    await inspectScreen(page, "requester-create", info);
    await keyboardActivate(page, page.getByRole("button", { name: "Submit Ticket", exact: true }));
    await expect(page.getByText("Category is required.", { exact: true })).toBeVisible();
    await inspectScreen(page, "requester-create-validation", info);
    await keyboardActivate(page, page.getByRole("button", { name: "Dashboard", exact: true }));
    await expect(page.getByText("Loading dashboard...", { exact: true })).toHaveCount(0);
    let release!: () => void;
    const hold = new Promise<void>(done => { release = done; });
    await page.route("**/api/requester/dashboard", async (route) => { await hold; await route.continue(); });
    try {
        await keyboardActivate(page, page.getByRole("button", { name: "Refresh Dashboard", exact: true }));
        await expect(page.getByText("Loading dashboard...", { exact: true })).toBeVisible();
        await inspectScreen(page, "requester-loading", info, true);
    }
    finally {
        release();
    }
    await expect(page.getByText("Loading dashboard...", { exact: true })).toHaveCount(0);
    await page.unroute("**/api/requester/dashboard");
    await page.route("**/api/requester/dashboard", route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "SERVER_ERROR" } }) }));
    await keyboardActivate(page, page.getByRole("button", { name: "Refresh Dashboard", exact: true }));
    await expect(page.getByRole("button", { name: "Retry dashboard", exact: true })).toBeVisible();
    await inspectScreen(page, "requester-safe-error", info);
    await page.unroute("**/api/requester/dashboard");
    await keyboardActivate(page, page.getByRole("button", { name: "Retry dashboard", exact: true }));
    await expect(page.getByRole("button", { name: "View My Open Tickets", exact: true })).toBeVisible();
    await keyboardActivate(page, page.getByRole("button", { name: "Logout", exact: true }));
    await login(page, sample.users[1].email, sample.password);
    await expect(page.getByText(/Your dashboard has no matching owned Tickets/)).toBeVisible();
    await inspectScreen(page, "requester-empty", info);
});
test("IT Staff queue, Actions and Workflow editors/history support keyboard focus", async ({ page, sample }, info) => {
    await login(page, sample.users[2].email, sample.password);
    await inspectScreen(page, "staff-dashboard", info);
    await keyboardActivate(page, page.getByRole("button", { name: "IT Staff Queue", exact: true }));
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue", exact: true })).toBeVisible();
    await inspectScreen(page, "staff-queue", info);
    await page.getByLabel("Search tickets", { exact: true }).fill(sample.ticket.ticketNumber);
    await keyboardActivate(page, page.getByRole("button", { name: "Search", exact: true }));
    await keyboardActivate(page, page.getByRole("button", { name: "Open " + sample.ticket.ticketNumber, exact: true }));
    await expect(page.getByRole("button", { name: "Update Status", exact: true })).toBeVisible();
    await inspectScreen(page, "staff-detail-workflow", info);
    const opener = page.getByRole("button", { name: "Record action", exact: true });
    await keyboardActivate(page, opener);
    await expect(page.getByLabel("Action Description *", { exact: true })).toBeFocused();
    await visibleFocus(page, page.getByLabel("Action Description *", { exact: true }));
    await inspectScreen(page, "action-editor-focus", info);
    await keyboardActivate(page, page.getByRole("button", { name: "Cancel editing", exact: true }));
    await expect(opener).toBeFocused();
    await keyboardActivate(page, page.getByRole("button", { name: "Cancel action #" + sample.actionId, exact: true }));
    await expect(page.getByLabel("Cancellation reason *", { exact: true })).toBeFocused();
    await inspectScreen(page, "action-cancel-dialog", info);
    await keyboardActivate(page, page.getByRole("button", { name: "Keep action", exact: true }));
    await keyboardActivate(page, page.getByRole("button", { name: "Update Status", exact: true }));
    await expect(page.getByLabel("Status *", { exact: true })).toBeFocused();
    await inspectScreen(page, "workflow-editor", info);
    await keyboardActivate(page, page.getByRole("button", { name: "Cancel Ticket editing", exact: true }));
    await keyboardActivate(page, page.getByRole("button", { name: "History for action #" + sample.actionId, exact: true }));
    await expect(page.getByRole("region", { name: "Private revision history for action #" + sample.actionId, exact: true })).toBeVisible();
    await inspectScreen(page, "action-revision-history", info);
    await keyboardActivate(page, page.getByRole("button", { name: "Ticket status history", exact: true }));
    await expect(page.getByRole("region", { name: "Private Ticket status history", exact: true })).toBeVisible();
    await inspectScreen(page, "ticket-status-history", info);
});
test("Administrator dashboard, User Management and validation retain role restrictions", async ({ page, sample }, info) => {
    await login(page, sample.users[4].email, sample.password);
    await expect(page.getByRole("heading", { name: "Administrator Dashboard", exact: true })).toBeVisible();
    await inspectScreen(page, "administrator-dashboard", info);
    await expect(page.getByRole("button", { name: "Create Ticket", exact: true })).toHaveCount(0);
    await keyboardActivate(page, page.getByRole("button", { name: "User Management", exact: true }));
    await expect(page.getByRole("heading", { name: "User Management", exact: true })).toBeVisible();
    await inspectScreen(page, "administrator-users", info);
    await keyboardActivate(page, page.getByRole("button", { name: "Create User", exact: true }));
    await expect(page.getByRole("heading", { name: "Create New User", exact: true })).toBeFocused();
    await inspectScreen(page, "administrator-editor", info);
    await keyboardActivate(page, page.getByRole("button", { name: "Save User", exact: true }));
    await expect(page.getByLabel("Name", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await inspectScreen(page, "administrator-validation", info);
    await keyboardActivate(page, page.getByRole("button", { name: "Cancel", exact: true }));
});
test("320px layouts retain role navigation and readable dashboard controls", async ({ page, sample }, info) => {
    await page.setViewportSize({ width: 320, height: 900 });
    for (const index of [0, 2, 4]) {
        await login(page, sample.users[index].email, sample.password);
        await expect(page.getByRole("button", { name: "Refresh Dashboard", exact: true })).toBeEnabled();
        await inspectScreen(page, "small-mobile-" + sample.users[index].role.toLowerCase(), info);
        await keyboardActivate(page, page.getByRole("button", { name: "Logout", exact: true }));
    }
});
