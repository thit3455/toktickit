import { test, expect, Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client";
import bcrypt from "../../server/node_modules/bcrypt";
import { randomUUID } from "node:crypto";

// Same disposable database-fixture convention as user-administration.spec.ts; no API mocks.
process.loadEnvFile("server/.env");
const prisma = new PrismaClient();
const api = process.env.E2E_API_URL ?? "http://localhost:3001";
const initial = "Authentication123!";
let id: number;
let email: string;
async function login(page: Page, password = initial, address = email) {
  await page.getByLabel("Email", { exact: true }).fill(address);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
}
async function change(page: Page, password: string, confirmation = password, current = initial) {
  await page.getByLabel("Current Password", { exact: true }).fill(current);
  await page.getByLabel("New Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm New Password", { exact: true }).fill(confirmation);
  await page.getByRole("button", { name: "Change Password", exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  email = `auth-browser-${randomUUID()}@example.test`;
  id = (await prisma.user.create({ data: { name: "Authentication Requester", email, role: "REQUESTER", passwordHash: await bcrypt.hash(initial, 4), mustChangePassword: true } })).id;
  await page.goto("/");
});
test.afterEach(async () => {
  if (id) {
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.user.deleteMany({ where: { id } });
    id = 0;
  }
});
test.afterAll(async () => prisma.$disconnect());

test("valid login persists; logout invalidates the session and replayed cookie", async ({ page }, testInfo) => {
  await expect(page.getByRole("heading", { name: "TokTickIT Login" })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).focus();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });
  await prisma.user.update({ where: { id }, data: { mustChangePassword: false } });
  await login(page);
  await expect(page.getByRole("heading", { name: "Create Ticket", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Create Ticket", exact: true })).toBeVisible();
  const cookie = (await page.context().cookies(api)).find(c => c.name === "toktickit_session")!;
  expect(cookie).toBeTruthy();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "TokTickIT Login" })).toBeVisible();
  expect((await page.request.get(`${api}/api/tickets`)).status()).toBe(401);
  expect((await page.request.get(`${api}/api/tickets`, { headers: { Cookie: `${cookie.name}=${cookie.value}` } })).status()).toBe(401);
  expect(await prisma.session.count({ where: { userId: id } })).toBe(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "TokTickIT Login" })).toBeVisible();
});

test("invalid credentials and inactive accounts show safe login feedback", async ({ page }) => {
  for (const address of [email, `missing-${randomUUID()}@example.test`]) {
    await login(page, "WrongPassword123!", address);
    await expect(page.getByRole("alert")).toContainText("Invalid email or password");
    await expect(page.getByRole("heading", { name: "TokTickIT Login" })).toBeVisible();
  }
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await login(page);
  await expect(page.getByRole("alert")).toContainText("Account is inactive.");
  expect(await prisma.session.count({ where: { userId: id } })).toBe(0);
});

for (const [label, password] of [["8 characters", "Abcd123!"], ["72 bytes", "a".repeat(72)], ["72 multibyte bytes", "é".repeat(36)]]) {
  test(`first login validates passwords and permits access after change: ${label}`, async ({ page }, testInfo) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "Change Password", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "My Tickets", exact: true })).toHaveCount(0);
    const blocked = await page.request.get(`${api}/api/tickets`);
    expect(blocked.status()).toBe(403);
    expect((await blocked.json()).error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Change Password", exact: true })).toBeVisible();
    for (const invalid of ["a".repeat(7), "a".repeat(73), "é".repeat(36) + "a"]) {
      await change(page, invalid);
      await expect(page.getByRole("alert")).toContainText(invalid.length < 8 ? "at least 8 characters" : "at most 72 UTF-8 bytes");
      const direct = await page.request.post(`${api}/api/auth/change-password`, { data: { currentPassword: initial, newPassword: invalid } });
      expect(direct.status()).toBe(400);
      expect((await prisma.user.findUniqueOrThrow({ where: { id } })).mustChangePassword).toBe(true);
    }
    await change(page, password, "does-not-match");
    await expect(page.getByRole("alert")).toContainText("New passwords do not match.");
    if (label === "8 characters") {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("change-password.png"), fullPage: true });
    }
    await change(page, password, password, "WrongCurrent123!");
    await expect(page.getByRole("alert")).toContainText("Current password is incorrect.");
    await change(page, password);
    await expect(page.getByRole("heading", { name: "Create Ticket", exact: true })).toBeVisible();
    expect((await page.request.get(`${api}/api/tickets`)).status()).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).mustChangePassword).toBe(false);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Create Ticket", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await login(page, initial);
    await expect(page.getByRole("alert")).toContainText("Invalid email or password");
    await login(page, password);
    await expect(page.getByRole("heading", { name: "Create Ticket", exact: true })).toBeVisible();
  });
}
