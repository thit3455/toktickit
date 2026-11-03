import { test, expect, type Lab4Case } from "./workflow-fixtures";
import type { Page, APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
test.use({ baseURL: "http://localhost:5174", trace: "retain-on-failure", screenshot: "only-on-failure" });
test.setTimeout(90000);
async function login(page: Page, data: Lab4Case & { apiUrl: string }, index = 0) {
  await page.goto("/"); await page.getByLabel("Email", { exact: true }).fill(data.users[index].email);
  await page.getByLabel("Password", { exact: true }).fill(data.password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("button", { name: "Logout", exact: true })).toBeVisible();
}
async function open(page: Page, data: Lab4Case & { apiUrl: string }, requester = false) {
  await page.getByRole("button", { name: requester ? "My Tickets" : "IT Staff Queue", exact: true }).click();
  await page.getByLabel(requester ? "Search Tickets" : "Search tickets", { exact: true }).fill(data.ticketNumber);
  if (!requester) await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: requester ? data.ticketNumber : "Open " + data.ticketNumber, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Actions Taken", exact: true })).toBeVisible();
  if (!requester) await expect(page.getByText("Loading Ticket workflow...", { exact: true })).toHaveCount(0);
}
const panel = (page: Page) => page.getByRole("region", { name: "Ticket Workflow", exact: true });
async function change(page: Page, status: string, reason?: string) {
  const area = panel(page); await area.getByRole("button", { name: "Update Status", exact: true }).click();
  await area.getByLabel("Status *", { exact: true }).selectOption(status);
  if (reason) await area.getByLabel(status === "CANCELLED" ? "Cancellation reason *" : "Reopening reason *", { exact: true }).fill(reason);
  await area.getByRole("button", { name: status === "CANCELLED" ? "Confirm Ticket cancellation" : "Save Ticket change", exact: true }).click();
  await expect(area.getByRole("form", { name: "Ticket workflow editor" })).toHaveCount(0);
  await expect(area.getByText(/Current Ticket status:/)).toContainText(status.replaceAll("_", " "));
}
async function snapshot(request: APIRequestContext, data: Lab4Case & { apiUrl: string }) {
  const response = await request.get(data.apiUrl + "/api/tickets/" + data.ticketId); expect(response.status()).toBe(200); return (await response.json()).data;
}
async function create(request: APIRequestContext, data: Lab4Case & { apiUrl: string }, description: string) {
  const ticket = await snapshot(request, data);
  const response = await request.post(data.apiUrl + "/api/tickets/" + data.ticketId + "/actions-taken", { data: {
    requestId: randomUUID(), expectedTicketVersion: ticket.version, assignedToId: data.users[1].id, description } });
  expect(response.status()).toBe(201); return (await response.json()).data.action;
}
async function complete(request: APIRequestContext, data: Lab4Case & { apiUrl: string }, action: { id: number; version: number }) {
  const ticket = await snapshot(request, data);
  const response = await request.patch(data.apiUrl + "/api/tickets/" + data.ticketId + "/actions-taken/" + action.id, { data: {
    expectedTicketVersion: ticket.version, expectedVersion: action.version, status: "COMPLETED", result: "Verified synthetic repair" } });
  expect(response.status()).toBe(200);
}
async function layout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const unnamed = await panel(page).locator("button:visible").evaluateAll(buttons => buttons.filter(button => !button.textContent?.trim() && !button.getAttribute("aria-label")).length);
  expect(unnamed).toBe(0);
}
test("resolution gate, action completion, close/reopen and historical indication", async ({ page, browser, lab4 }, info) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await login(page, lab4); await open(page, lab4);
  await expect(panel(page).getByText("Record at least one completed action with a nonblank Result.")).toBeVisible();
  await panel(page).getByRole("button", { name: "Update Status", exact: true }).click();
  await expect(panel(page).getByLabel("Status *").locator('option[value="RESOLVED"]')).toBeDisabled();
  await panel(page).getByRole("button", { name: "Cancel Ticket editing" }).click();
  await page.getByRole("button", { name: "Record action", exact: true }).click();
  await page.getByLabel("Action Description *", { exact: true }).fill("Inspect synthetic network");
  await page.getByLabel("Assigned to *", { exact: true }).selectOption(String(lab4.users[1].id));
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(page.getByRole("form", { name: "Action editor" })).toHaveCount(0);
  await page.getByRole("button", { name: /Complete action #/ }).click();
  await page.getByLabel("Result *", { exact: true }).fill("Verified synthetic repair");
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(panel(page).getByText("All resolution requirements are currently satisfied.")).toBeVisible();
  const context = await browser.newContext();
  try {
    expect((await context.request.post(lab4.apiUrl + "/api/auth/login", { data: { email: lab4.users[4].email, password: lab4.password } })).status()).toBe(200);
    expect((await context.request.patch(lab4.apiUrl + "/api/tickets/" + lab4.ticketId + "/resolution-indication")).status()).toBe(200);
  } finally { await context.close(); }
  await page.reload(); await open(page, lab4);
  await expect(panel(page).getByRole("region", { name: "Requester resolution indication" })).toBeVisible();
  await change(page, "RESOLVED"); await expect(page.getByRole("button", { name: "Record action", exact: true })).toHaveCount(0);
  await change(page, "CLOSED"); await change(page, "REOPENED", "Synthetic verification recurrence");
  await expect(panel(page).getByText(/Historical indication; this is not fresh confirmation/)).toBeVisible();
  await panel(page).getByRole("button", { name: "Ticket status history", exact: true }).click();
  await expect(panel(page).getByText("Reason: Synthetic verification recurrence", { exact: true })).toBeVisible();
  const history = await page.request.get(lab4.apiUrl + "/api/tickets/" + lab4.ticketId + "/status-history");
  expect((await history.json()).data.items.map((e: { toStatus: string }) => e.toStatus)).toEqual(["RESOLVED", "CLOSED", "REOPENED"]);
  await layout(page); await page.screenshot({ path: info.outputPath("workflow-resolution-history.png"), fullPage: true });
  expect(errors).toEqual([]);
});
test("Administrator scoped writes and Requester owned read-only privacy", async ({ page, lab4 }) => {
  await login(page, lab4, 3); await open(page, lab4);
  await expect(panel(page).getByRole("button", { name: "Claim Ticket", exact: true })).toHaveCount(0);
  await panel(page).getByRole("button", { name: "Reassign Ticket", exact: true }).click();
  await panel(page).getByLabel("Reassign to *").selectOption(String(lab4.users[1].id));
  await panel(page).getByRole("button", { name: "Save Ticket change", exact: true }).click();
  await expect(panel(page).getByText(/Ticket Owner:/)).toContainText(lab4.users[1].name);
  await panel(page).getByRole("button", { name: "Update IT Priority", exact: true }).click();
  await panel(page).getByLabel("IT Priority *").selectOption("URGENT");
  await panel(page).getByRole("button", { name: "Save Ticket change", exact: true }).click();
  await expect(panel(page).getByText(/Ticket Owner:/)).toContainText("URGENT");
  await change(page, "IN_PROGRESS");
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await login(page, lab4, 4); await open(page, lab4, true);
  await expect(page.getByRole("heading", { name: "Ticket Workflow", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Record action|Update Status|Ticket status history/ })).toHaveCount(0);
  expect((await page.request.get(lab4.apiUrl + "/api/tickets/" + lab4.ticketId + "/status-history")).status()).toBe(403);
  expect((await page.request.patch(lab4.apiUrl + "/api/staff/tickets/" + lab4.ticketId + "/status", { data: { currentStatus: "CANCELLED", expectedTicketVersion: 3, reason: "Denied" } })).status()).toBe(403);
  await page.getByRole("button", { name: "Logout", exact: true }).click(); await login(page, lab4, 5);
  expect((await page.request.get(lab4.apiUrl + "/api/tickets/" + lab4.ticketId)).status()).toBe(404);
});
test("Ticket cancellation retains mixed actions and append-only private evidence", async ({ page, lab4 }, info) => {
  await login(page, lab4); const completed = await create(page.request, lab4, "Completed synthetic repair"); await complete(page.request, lab4, completed);
  const planned = await create(page.request, lab4, "Outstanding synthetic follow-up");
  await open(page, lab4); await change(page, "CANCELLED", "Synthetic request withdrawn");
  await expect(panel(page).getByRole("button", { name: "Update Status", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Record action", exact: true })).toHaveCount(0);
  const response = await page.request.get(lab4.apiUrl + "/api/tickets/" + lab4.ticketId + "/actions-taken");
  const actions = (await response.json()).data.items;
  expect(actions.find((a: { id: number }) => a.id === completed.id).status).toBe("COMPLETED");
  expect(actions.find((a: { id: number }) => a.id === planned.id)).toMatchObject({ status: "CANCELLED", cancellationReason: "Synthetic request withdrawn", version: 2 });
  const revision = await page.request.get(lab4.apiUrl + "/api/tickets/" + lab4.ticketId + "/actions-taken/" + planned.id + "/history");
  expect(revision.status()).toBe(200); expect((await revision.json()).data.items).toHaveLength(2);
  await panel(page).getByRole("button", { name: "Ticket status history", exact: true }).click();
  await expect(panel(page).getByText("Reason: Synthetic request withdrawn", { exact: true })).toBeVisible();
  await expect(panel(page).getByRole("button", { name: /Delete|Edit history/ })).toHaveCount(0);
  await layout(page); await page.screenshot({ path: info.outputPath("workflow-cancellation.png"), fullPage: true });
});
test("two editors retain drafts for explicit conflict review and retry failed history", async ({ page, context, lab4 }, info) => {
  await login(page, lab4); await open(page, lab4);
  const other = await context.newPage(); await other.goto("/"); await open(other, lab4);
  const area = panel(page);
  await area.getByRole("button", { name: "Update Status", exact: true }).click();
  await area.getByLabel("Status *", { exact: true }).selectOption("CANCELLED");
  await area.getByLabel("Cancellation reason *", { exact: true }).fill("Retained synthetic cancellation draft");
  await panel(other).getByRole("button", { name: "Update IT Priority", exact: true }).click();
  await panel(other).getByLabel("IT Priority *").selectOption("URGENT");
  await panel(other).getByRole("button", { name: "Save Ticket change", exact: true }).click();
  await expect(panel(other).getByText("IT priority updated successfully.", { exact: true })).toBeVisible();
  await area.getByRole("button", { name: "Confirm Ticket cancellation" }).click();
  await expect(area.getByRole("button", { name: "Refresh current Ticket" })).toBeVisible();
  await expect(area.getByLabel("Cancellation reason *")).toHaveValue("Retained synthetic cancellation draft");
  await area.getByRole("button", { name: "Refresh current Ticket" }).click();
  await expect(area.getByText(/Status: OPEN. Owner:.*Priority: URGENT/)).toBeVisible();
  await layout(page); await page.screenshot({ path: info.outputPath("workflow-conflict-review.png"), fullPage: true });
  await area.getByRole("button", { name: "Keep draft and use refreshed Ticket version" }).click();
  await area.getByRole("button", { name: "Confirm Ticket cancellation" }).click();
  await expect(area.getByRole("form", { name: "Ticket workflow editor" })).toHaveCount(0);
  const path = "**/api/tickets/" + lab4.ticketId + "/status-history?*";
  await page.route(path, route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR" } }) }));
  await area.getByRole("button", { name: "Ticket status history", exact: true }).click();
  await expect(area.getByRole("button", { name: "Retry Ticket history" })).toBeVisible();
  await page.unroute(path);
  await area.getByRole("button", { name: "Retry Ticket history" }).click();
  await expect(area.getByText("Reason: Retained synthetic cancellation draft", { exact: true })).toBeVisible();
  await other.close();
});

test("keyboard operates confirmation validation and restores focus", async ({ page, lab4 }) => {
  await login(page, lab4); await open(page, lab4);
  const area = panel(page), opener = area.getByRole("button", { name: "Update Status", exact: true });
  await opener.focus(); await page.keyboard.press("Enter");
  const status = area.getByLabel("Status *", { exact: true });
  await expect(status).toBeFocused();
  await status.selectOption("CANCELLED");
  await area.getByRole("button", { name: "Confirm Ticket cancellation", exact: true }).focus();
  await page.keyboard.press("Enter");
  const reason = area.getByLabel("Cancellation reason *", { exact: true });
  await expect(reason).toHaveAttribute("aria-invalid", "true"); await expect(reason).toBeFocused();
  await page.keyboard.type("Keyboard-only synthetic draft");
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
  await expect(area.getByRole("form", { name: "Ticket workflow editor" })).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect((await snapshot(page.request, lab4)).currentStatus).toBe("OPEN");
  await layout(page);
});