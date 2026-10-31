import { test, expect, type Lab4Case } from "./fixtures";
import type { Page } from "@playwright/test";

// This suite has no development DATABASE_URL fallback and never provisions a database.
// The guarded worker requires separately approved, empty, dedicated test access.
test.use({ baseURL: "http://localhost:5174" });
test.setTimeout(90000);
async function login(page: Page, data: Lab4Case, index: number) {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(data.users[index].email);
  await page.getByLabel("Password", { exact: true }).fill(data.password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("button", { name: "Logout", exact: true })).toBeVisible();
}
async function openTicket(page: Page, data: Lab4Case, requester = false) {
  await page.getByRole("button", { name: requester ? "My Tickets" : "IT Staff Queue", exact: true }).click();
  await page.getByLabel(requester ? "Search Tickets" : "Search tickets", { exact: true }).fill(data.ticketNumber);
  if (!requester) await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: requester ? data.ticketNumber : `Open ${data.ticketNumber}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Actions Taken", exact: true })).toBeVisible();
  await expect(page.getByText("Loading Actions Taken...", { exact: true })).toHaveCount(0);
}
async function create(page: Page, data: Lab4Case, description: string, assignee = 1) {
  await page.getByRole("button", { name: "Record action", exact: true }).click();
  await page.getByLabel("Action Description *", { exact: true }).fill(description);
  await page.getByLabel("Assigned to *", { exact: true }).selectOption(String(data.users[assignee].id));
  await expect(page.getByLabel("Assigned to *").getByRole("option", { name: data.users[6].name, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Action #\d+ saved\./ })).toBeVisible();
  const row = page.locator(".actions-table tbody tr").filter({ hasText: description });
  const text = await row.locator("strong").first().innerText();
  return Number(text.match(/#(\d+)/)![1]);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("staff/Admin lifecycle, attribution, corrections, inactive cancellation and requester privacy persist", async ({ page, lab4 }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", error => consoleErrors.push(error.message));
  await login(page, lab4, 0); await openTicket(page, lab4);
  await expect(page.getByText("No Actions Taken recorded yet.")).toBeVisible();
  const id = await create(page, lab4, "Inspect the printer connection");
  await page.getByRole("button", { name: `Edit action #${id}`, exact: true }).click();
  await page.getByLabel("Assigned to *", { exact: true }).selectOption(String(lab4.users[2].id));
  await page.getByLabel("Follow-Up Required?", { exact: true }).check();
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(page.getByLabel("Follow-up Note *", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Follow-up Note *", { exact: true }).fill("Check the connection tomorrow");
  await page.getByLabel("Attachment Notes", { exact: true }).fill("Reference existing Ticket attachment; plain text https://example.test/file");
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(page.getByRole("form", { name: "Action editor" })).toHaveCount(0);
  await page.getByRole("button", { name: `Start action #${id}`, exact: true }).click();
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(page.locator(".action-status").first()).toHaveText("IN PROGRESS");
  await page.getByRole("button", { name: "Logout", exact: true }).click();

  await login(page, lab4, 3); await openTicket(page, lab4);
  await expect(page.getByRole("button", { name: /Claim Ticket|Reassign Ticket|Update Status|Update IT Priority/ })).toHaveCount(0);
  for (const operation of ["assign", "priority", "status"]) {
    const response = await page.request.patch(`${lab4.apiUrl}/api/staff/tickets/${lab4.ticketId}/${operation}`, { data: { assignedStaffId: lab4.users[3].id, currentStatus: "RESOLVED", itPriority: "HIGH" } });
    expect(response.status()).toBe(403);
  }
  await page.getByRole("button", { name: `Complete action #${id}`, exact: true }).click();
  await expect(page.getByText(`The actual performer will be ${lab4.users[3].name}. Pending follow-up may remain, but blocks later Ticket resolution.`)).toBeVisible();
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(page.getByLabel("Result *", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Result *", { exact: true }).fill("Connection restored");
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(page.getByRole("button", { name: `Correct action #${id}`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Correct action #${id}`, exact: true }).click();
  await expect(page.getByLabel("Assigned to *", { exact: true })).toBeDisabled();
  await page.getByLabel("Result *", { exact: true }).fill("Connection restored and verified");
  await page.getByLabel("Follow-Up Required?", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(page.getByRole("form", { name: "Action editor" })).toHaveCount(0);
  await page.getByRole("button", { name: `History for action #${id}`, exact: true }).click();
  const history = page.getByRole("region", { name: `Private revision history for action #${id}` });
  await expect(history.getByText(/Version 5/)).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("actions-admin-history.png"), fullPage: true });

  const cancelledId = await create(page, lab4, "Check an alternative cable", 1);
  await lab4.deactivate(1);
  await page.reload(); await openTicket(page, lab4);
  await expect(page.getByRole("button", { name: `Start action #${cancelledId}`, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: `Complete action #${cancelledId}`, exact: true })).toBeDisabled();
  await page.getByRole("button", { name: `Cancel action #${cancelledId}`, exact: true }).click();
  await page.getByRole("button", { name: "Confirm cancellation", exact: true }).click();
  await expect(page.getByLabel("Cancellation reason *", { exact: true })).toBeFocused();
  await page.getByLabel("Cancellation reason *", { exact: true }).fill("Alternative work is no longer required");
  await page.getByRole("button", { name: "Keep action", exact: true }).click();
  await expect(page.getByRole("button", { name: `Cancel action #${cancelledId}`, exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByLabel("Cancellation reason *", { exact: true }).fill("Alternative work is no longer required");
  await page.getByRole("button", { name: "Confirm cancellation", exact: true }).click();
  await expect(page.getByRole("form", { name: "Confirm action cancellation" })).toHaveCount(0);
  await page.getByRole("button", { name: "Logout", exact: true }).click();

  await login(page, lab4, 4); await openTicket(page, lab4, true);
  await page.getByText(`View action #${id} details`, { exact: true }).click();
  await page.getByText(`View action #${cancelledId} details`, { exact: true }).click();
  await expect(page.getByText("Connection restored and verified", { exact: true })).toBeVisible();
  const completedRow = page.locator(".actions-table tbody tr").filter({ hasText: `Action #${id}` });
  await expect(completedRow.getByText(lab4.users[0].name, { exact: true })).toBeVisible();
  await expect(completedRow.getByText(lab4.users[2].name, { exact: true })).toBeVisible();
  await expect(completedRow.getByText(lab4.users[3].name, { exact: true })).toBeVisible();
  await expect(page.getByText("Alternative work is no longer required", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Record action|Edit action|Complete action|Cancel action|History for action/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Internal Notes", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Public Comments", exact: true })).toBeVisible();
  await expect(page.locator(".actions-taken a")).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("actions-requester-read-only.png"), fullPage: true });
  await page.reload(); await openTicket(page, lab4, true);
  await expect(page.locator(".actions-table tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await login(page, lab4, 5);
  expect((await page.request.get(`${lab4.apiUrl}/api/tickets/${lab4.ticketId}/actions-taken`)).status()).toBe(404);
  expect(consoleErrors).toEqual([]);
});

test("two editors preserve drafts and explicitly review a stale action before reapplying", async ({ page, browser, lab4 }, testInfo) => {
  await login(page, lab4, 0); await openTicket(page, lab4);
  const id = await create(page, lab4, "Concurrent action");
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = testInfo.project.use;
  const context = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL: "http://localhost:5174" });
  try {
    const other = await context.newPage(); await login(other, lab4, 2); await openTicket(other, lab4);
    await page.getByRole("button", { name: `Edit action #${id}`, exact: true }).click();
    await other.getByRole("button", { name: `Edit action #${id}`, exact: true }).click();
    await page.getByLabel("Action Description *", { exact: true }).fill("First editor saved");
    await other.getByLabel("Action Description *", { exact: true }).fill("Second editor retained draft");
    await page.getByRole("button", { name: "Save action", exact: true }).click();
    await expect(page.getByRole("form", { name: "Action editor" })).toHaveCount(0);
    await other.getByRole("button", { name: "Save action", exact: true }).click();
    await expect(other.getByRole("button", { name: "Refresh current record", exact: true })).toBeVisible();
    await expect(other.getByLabel("Action Description *", { exact: true })).toHaveValue("Second editor retained draft");
    await expect(other.getByRole("button", { name: "Save action", exact: true })).toBeDisabled();
    await other.getByRole("button", { name: "Refresh current record", exact: true }).click();
    await expect(other.getByRole("heading", { name: "Current saved record", exact: true })).toBeVisible();
    await noOverflow(other); await other.screenshot({ path: testInfo.outputPath("actions-conflict-review.png"), fullPage: true });
    await other.getByRole("button", { name: "Keep draft and use refreshed versions", exact: true }).click();
    await other.getByRole("button", { name: "Save action", exact: true }).click();
    await expect(other.getByRole("form", { name: "Action editor" })).toHaveCount(0);
    await page.reload(); await openTicket(page, lab4);
    await expect(page.getByText("Second editor retained draft", { exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test("offline creation keeps the original request and produces a single persisted action after retry", async ({ page, context, lab4 }) => {
  await login(page, lab4, 0); await openTicket(page, lab4);
  await page.getByRole("button", { name: "Record action", exact: true }).click();
  await page.getByLabel("Action Description *", { exact: true }).fill("Retry one action");
  await page.getByLabel("Assigned to *", { exact: true }).selectOption(String(lab4.users[1].id));
  await context.setOffline(true);
  try {
    await page.getByRole("button", { name: "Save action", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry original creation", exact: true })).toBeVisible();
    await expect(page.getByLabel("Action Description *", { exact: true })).toBeDisabled();
  } finally { await context.setOffline(false); }
  await page.getByRole("button", { name: "Retry original creation", exact: true }).click();
  await expect(page.getByRole("form", { name: "Action editor" })).toHaveCount(0);
  await page.reload(); await openTicket(page, lab4);
  await expect(page.locator(".actions-table tbody tr")).toHaveCount(1);
  await expect(page.getByText("Retry one action", { exact: true })).toBeVisible();
});
