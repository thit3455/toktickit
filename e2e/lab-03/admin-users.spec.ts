import { test, expect, Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client";
import bcrypt from "../../server/node_modules/bcrypt";
import { randomUUID } from "node:crypto";

process.loadEnvFile("server/.env");
const prisma = new PrismaClient();
const api = process.env.E2E_API_URL ?? "http://localhost:3001";
test.describe("Administrator User Management with real API", () => {
  let adminId: number, adminEmail: string, managedEmail: string;
  let extraIds: number[] = [];
  const password = "AdminBrowser123!";
  async function login(page: Page, email: string, value: string) {
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(value);
    await page.getByRole("button", { name: "Login", exact: true }).click();
  }
  async function search(page: Page, value: string) {
    await page.getByLabel("Search users").fill(value);
    await page.getByRole("button", { name: "Search", exact: true }).click();
  }
  async function noOverflow(page: Page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  test.beforeEach(async ({ page }) => {
    extraIds = [];
    adminEmail = `admin-browser-${randomUUID()}@example.test`;
    managedEmail = `managed-browser-${randomUUID()}@example.test`;
    adminId = (await prisma.user.create({ data: { name: "Browser Administrator", email: adminEmail, role: "ADMINISTRATOR", passwordHash: await bcrypt.hash(password, 4), mustChangePassword: false } })).id;
    await page.goto("/");
    await login(page, adminEmail, password);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  });
  test.afterEach(async () => {
    const users = await prisma.user.findMany({ where: { OR: [{ id: adminId }, { email: managedEmail }] }, select: { id: true } });
    const ids = [...users.map(user => user.id), ...extraIds];
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });
  test.afterAll(async () => prisma.$disconnect());
  test("creates, edits, filters, activates and resets an account with persistence", async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await expect(page.getByRole("navigation", { name: "Administrator navigation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "IT Staff Queue" })).toHaveCount(0);
    await search(page, adminEmail);
    await expect(page.getByRole("row", { name: `User ${adminEmail}` })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("admin-list.png"), fullPage: true });
    await page.getByRole("button", { name: `Edit ${adminEmail}`, exact: true }).click();
    await expect(page.getByLabel("Account status").locator('option[value="false"]')).toBeDisabled();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Create User", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create New User" })).toBeFocused();
    // Read both rectangles in one browser frame; focus can scroll between separate calls.
    const [listBox, editorBox] = await page.evaluate(() => [".admin-users-panel", ".admin-editor-panel"].map(selector => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    if (page.viewportSize()!.width >= 992) {
      expect(editorBox!.x).toBeGreaterThanOrEqual(listBox!.x + listBox!.width);
      expect(Math.abs(editorBox!.y - listBox!.y)).toBeLessThan(2);
    } else expect(editorBox!.y).toBeGreaterThanOrEqual(listBox!.y + listBox!.height);
    await page.getByRole("button", { name: "Save User" }).click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("admin-validation.png"), fullPage: true });
    await page.getByLabel("Name", { exact: true }).fill("Browser Managed Requester");
    await page.getByLabel("Email Address", { exact: true }).fill(adminEmail);
    await page.getByLabel("Initial password", { exact: true }).fill("InitialBrowser123!");
    await page.getByRole("button", { name: "Save User" }).click();
    await expect(page.getByText("Email is already in use.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email Address")).toHaveAttribute("aria-describedby", "admin-email-error");
    await page.screenshot({ path: testInfo.outputPath("admin-duplicate.png"), fullPage: true });
    await page.getByLabel("Email Address", { exact: true }).fill(managedEmail);
    await page.getByRole("button", { name: "Save User" }).click();
    await expect(page.getByText("User created. The initial password must be changed on first login.")).toBeVisible();
    await search(page, managedEmail);
    const card = page.getByRole("row", { name: `User ${managedEmail}` });
    await expect(card).toContainText("REQUESTER");
    await page.getByRole("button", { name: `Edit ${managedEmail}`, exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("Browser Managed Staff");
    await page.getByLabel("Role", { exact: true }).selectOption("IT_STAFF");
    await page.getByLabel("Account status").selectOption("false");
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("admin-edit.png"), fullPage: true });
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("User updated successfully.")).toBeVisible();
    await expect(card).toContainText("Inactive");
    await page.reload();
    await search(page, managedEmail);
    await expect(card).toContainText("Browser Managed Staff");
    await expect(card).toContainText("IT STAFF");
    await expect(card).toContainText("Inactive");
    await page.getByLabel("Filter by role").selectOption("REQUESTER");
    await expect(page.getByText("No users match your search or filters.")).toBeVisible();
    await page.getByLabel("Filter by role").selectOption("IT_STAFF");
    await expect(card).toBeVisible();
    const rejected = await page.request.post(`${api}/api/auth/login`, { data: { email: managedEmail, password: "InitialBrowser123!" } });
    expect(rejected.status()).toBe(403);
    await page.getByRole("button", { name: `Edit ${managedEmail}`, exact: true }).click();
    await page.getByLabel("Account status").selectOption("true");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("User updated successfully.")).toBeVisible();
    await expect(card).toBeVisible();
    await page.getByRole("button", { name: `Set initial password for ${managedEmail}`, exact: true }).click();
    await page.getByLabel("Initial password", { exact: true }).fill("ResetBrowser123!");
    await page.getByRole("button", { name: "Set Initial Password", exact: true }).click();
    await expect(page.getByText("Initial password set. Existing sessions have been signed out.")).toBeVisible();
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(page.getByRole("heading", { name: "TokTickIT Login" })).toBeVisible();
    expect((await page.request.get(`${api}/api/admin/users`)).status()).toBe(401);
    await login(page, managedEmail, "ResetBrowser123!");
    await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();
    await page.getByLabel("Current Password", { exact: true }).fill("ResetBrowser123!");
    await page.getByLabel("New Password", { exact: true }).fill("ChangedBrowser123!");
    await page.getByLabel("Confirm New Password", { exact: true }).fill("ChangedBrowser123!");
    await page.getByRole("button", { name: "Change Password", exact: true }).click();
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();
    expect((await page.request.get(`${api}/api/admin/users`)).status()).toBe(403);
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: managedEmail } });
    expect(saved).toMatchObject({ name: "Browser Managed Staff", role: "IT_STAFF", isActive: true, mustChangePassword: false });
    await noOverflow(page);
  });
  test("paginates and sorts the complete filtered user list without overflow", async ({ page }, testInfo) => {
    const batch = randomUUID();
    const passwordHash = await bcrypt.hash(password, 4);
    for (let index = 1; index <= 23; index++) {
      const number = String(index).padStart(2, "0");
      const user = await prisma.user.create({ data: { name: `Page User ${number}`, email: `page-${number}-${batch}@example.test`, role: "REQUESTER", isActive: index % 2 === 1, passwordHash, mustChangePassword: false } });
      extraIds.push(user.id);
    }
    await search(page, batch);
    const rows = page.getByRole("row", { name: /^User / });
    await expect(rows).toHaveCount(10);
    await expect(page.getByText("Page 1 of 3 · 23 users")).toBeVisible();
    await expect(page.getByRole("button", { name: "Prev", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(rows.first()).toContainText("Page User 11");
    await page.getByRole("button", { name: "Page 3", exact: true }).click();
    await expect(rows).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Prev", exact: true }).click();
    await expect(rows.first()).toContainText("Page User 11");
    await page.getByRole("button", { name: "Sort by name descending" }).click();
    await expect(page.getByText("Page 1 of 3 · 23 users")).toBeVisible();
    await expect(rows.first()).toContainText("Page User 23");
    await page.getByRole("button", { name: "Sort by email ascending" }).click();
    await expect(rows.first()).toContainText("Page User 01");
    await page.getByLabel("Filter by role").selectOption("REQUESTER");
    await expect(rows).toHaveCount(10);
    await page.getByRole("button", { name: "Page 3", exact: true }).click();
    await page.getByLabel("Filter by status").selectOption("false");
    await expect(page.getByText("Page 1 of 2 · 11 users")).toBeVisible();
    await expect(rows.first()).toContainText("Page User 02");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Page User 22");
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("admin-pagination.png"), fullPage: true });
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByRole("button", { name: "Page 1", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(rows).toHaveCount(10);
    await noOverflow(page);
  });
});
