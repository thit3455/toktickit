import { test, expect, type DashboardCase } from "./dashboard-fixtures";
import type { Page } from "@playwright/test";
test.use({ baseURL: "http://localhost:5174", trace: "retain-on-failure", screenshot: "only-on-failure" });
test.setTimeout(90000);
async function login(page: Page, data: DashboardCase, actor: number) {
  await page.goto("/"); await page.getByLabel("Email", { exact: true }).fill(data.users[actor].email); await page.getByLabel("Password", { exact: true }).fill(data.password);
  await page.getByRole("button", { name: "Login", exact: true }).click(); await expect(page.getByRole("button", { name: "Dashboard", exact: true })).toHaveAttribute("aria-current", "page");
}
async function layout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const unnamed = await page.locator(".dashboard button:visible").evaluateAll(buttons => buttons.filter(button => !button.textContent?.trim() && !button.getAttribute("aria-label")).length);
  expect(unnamed).toBe(0);
}
for (const [name, actor] of [["requester", 2], ["staff", 0], ["administrator", 4]] as const) {
  test(name + " authoritative dashboard, privacy and drill-down", async ({ page, dashboard }, info) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    const endpoint = actor === 2 ? "/api/requester/dashboard" : "/api/staff/dashboard";
    const pendingSnapshot = page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.status() === 200);
    await login(page, dashboard, actor);
    const response = await pendingSnapshot; const data = (await response.json()).data;
    await expect(page.getByText("Loading dashboard...", { exact: true })).toHaveCount(0);
    if (actor === 2) expect(data.metrics).toEqual({ myOpenTickets: 2, needsMyAttention: 1, recentlyResolved: 1 });
    else expect(data.metrics).toEqual({ unassignedActiveTickets: 1, myActiveTickets: actor === 0 ? 1 : 0, myActiveActions: actor === 0 ? 1 : 0, activeTicketsByItPriority: { LOW: 0, MEDIUM: 1, HIGH: 1, URGENT: 1 } });
    await layout(page); await page.screenshot({ path: info.outputPath(name + "-dashboard.png"), fullPage: true });
    if (actor === 2) {
      expect((await page.request.get(dashboard.apiUrl + "/api/tickets/" + dashboard.tickets.other.id)).status()).toBe(404);
      const request = page.waitForRequest(value => new URL(value.url()).pathname === "/api/tickets");
      await page.getByRole("button", { name: "View Tickets waiting for you", exact: true }).click();
      const query = new URL((await request).url()).searchParams; expect(query.get("asOf")).toBe(data.asOf); expect(query.get("currentStatus")).toBe("WAITING_FOR_REQUESTER");
      await expect(page.getByRole("button", { name: dashboard.tickets.waiting.ticketNumber, exact: true })).toBeVisible();
      expect((await page.request.get(dashboard.apiUrl + "/api/staff/dashboard")).status()).toBe(403);
    } else if (actor === 0) {
      await page.getByRole("button", { name: "Open action #" + dashboard.targetActionId + " on " + dashboard.tickets.waiting.ticketNumber, exact: true }).click();
      await expect(page.locator("#action-" + dashboard.targetActionId)).toBeFocused();
      expect((await page.request.get(dashboard.apiUrl + "/api/admin/users")).status()).toBe(403);
    } else {
      await expect(page.getByRole("button", { name: "User Management", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "View URGENT active Tickets", exact: true }).click();
      await expect(page.getByRole("button", { name: "Open " + dashboard.tickets.other.ticketNumber, exact: true })).toBeVisible();
    }
    await layout(page); expect(errors).toEqual([]);
  });
}
test("safe error retry, keyboard navigation and genuine empty ownership", async ({ page, dashboard }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await login(page, dashboard, 2); await expect(page.getByText("Loading dashboard...", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Dashboard", exact: true }).focus();
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "My Tickets", exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Create Ticket", exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Refresh Dashboard", exact: true })).toBeFocused();
  let release!: () => void; const held = new Promise<void>(done => { release = done; });
  await page.route("**/api/requester/dashboard", async route => { await held; await route.continue(); });
  try {
    await page.keyboard.press("Enter"); await expect(page.getByText("Loading dashboard...", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh Dashboard", exact: true })).toBeDisabled();
    await page.screenshot({ path: info.outputPath("requester-loading.png"), fullPage: true });
  } finally { release(); }
  await expect(page.getByText("Loading dashboard...", { exact: true })).toHaveCount(0);
  await page.unroute("**/api/requester/dashboard");
  await page.route("**/api/requester/dashboard", route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "SERVER_ERROR" } }) }));
  await page.getByRole("button", { name: "Refresh Dashboard", exact: true }).click(); await expect(page.getByRole("button", { name: "Retry dashboard", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("requester-error.png"), fullPage: true }); await page.unroute("**/api/requester/dashboard");
  await page.getByRole("button", { name: "Retry dashboard", exact: true }).focus(); await page.keyboard.press("Enter"); await expect(page.getByRole("button", { name: "View My Open Tickets", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Logout", exact: true }).click(); await login(page, dashboard, 5);
  await expect(page.getByText(/Your dashboard has no matching owned Tickets/)).toBeVisible(); await layout(page);
  await page.screenshot({ path: info.outputPath("requester-empty.png"), fullPage: true });
  expect(errors).toEqual([]);
});
