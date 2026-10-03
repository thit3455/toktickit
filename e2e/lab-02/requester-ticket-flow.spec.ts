import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client";
import bcrypt from "../../server/node_modules/bcrypt";
import { randomUUID } from "node:crypto";

process.loadEnvFile("server/.env");
const prisma = new PrismaClient();
const api = process.env.E2E_API_URL ?? "http://localhost:3001";
test.describe("Authenticated Requester regression", () => {
  let userId: number, email: string;
  const password = "RequesterBrowser123!";
  test.beforeEach(async ({ page }) => {
    email = `browser-${randomUUID()}@example.test`;
    userId = (await prisma.user.create({ data: { name: "Browser Requester", email, role: "REQUESTER", passwordHash: await bcrypt.hash(password, 4), mustChangePassword: false } })).id;
    await page.goto("/");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  });
  test.afterEach(async () => {
    if (userId) {
      await prisma.ticket.deleteMany({ where: { requesterId: userId } });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });
  test.afterAll(async () => prisma.$disconnect());
  async function noOverflow(page: import("@playwright/test").Page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  test("creates and views a ticket, uploads, comments, indicates resolution and logs out", async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await expect(page.getByText("Browser Requester", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Change Requester" })).toHaveCount(0);
    await noOverflow(page);
    await expect(page.locator("#category")).toBeEnabled();
    await expect(page.getByText("Loading ticket reference data...")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("requester-create.png"), fullPage: true });
    await page.locator("#category").selectOption({ index: 1 });
    await page.locator("#related-system").selectOption({ index: 1 });
    const summary = `Browser network issue ${randomUUID().slice(0, 8)}`;
    await page.locator("#ticket-summary").fill(summary);
    await page.locator("#requested-priority").selectOption("HIGH");
    await page.locator("#description").fill("The laptop cannot connect to the campus wireless network.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByText("Ticket created successfully", { exact: false })).toBeVisible();
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: userId, summary } });
    expect(ticket.requestedPriority).toBe("HIGH");
    await page.getByRole("button", { name: "My Tickets", exact: true }).click();
    await expect(page.getByRole("button", { name: ticket.ticketNumber })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("requester-list.png"), fullPage: true });
    await page.getByRole("button", { name: ticket.ticketNumber }).click();
    await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
    await expect(page.getByText("Internal Notes", { exact: true })).toHaveCount(0);
    await page.locator('input[type="file"]').setInputFiles({ name: "evidence.pdf", mimeType: "application/pdf", buffer: Buffer.from("Requester browser evidence") });
    await page.getByRole("button", { name: "Upload Attachment", exact: true }).click();
    await expect(page.getByText("evidence.pdf", { exact: true })).toBeVisible();
    const message = '<img src=x onerror="alert(1)"> The connection is working now.';
    await page.getByLabel("New public comment").fill(message);
    await page.getByRole("button", { name: "Add Public Comment" }).click();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.locator("article img")).toHaveCount(0);
    await page.getByRole("button", { name: "Problem Appears Resolved", exact: true }).click();
    await expect(page.getByText("Resolution indication saved. Ticket status has not changed.")).toBeVisible();
    const saved = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(saved.currentStatus).toBe("NEW");
    expect(saved.requesterResolvedAt).not.toBeNull();
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("requester-detail.png"), fullPage: true });
    await page.reload();
    await page.getByRole("button", { name: "My Tickets", exact: true }).click();
    await page.getByRole("button", { name: ticket.ticketNumber }).click();
    await expect(page.getByText(/You indicated that the problem appears resolved/)).toBeVisible();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(page.getByRole("heading", { name: "TokTickIT Login" })).toBeVisible();
    expect((await page.request.get(`${api}/api/tickets/${ticket.id}`)).status()).toBe(401);
    await page.reload();
    await expect(page.getByRole("heading", { name: "TokTickIT Login" })).toBeVisible();
  });
  test("shows validation and empty/no-results states responsively", async ({ page }, testInfo) => {
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByText("Category is required.", { exact: true })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("requester-validation.png"), fullPage: true });
    await page.getByRole("button", { name: "My Tickets", exact: true }).click();
    await expect(page.getByText("No Tickets Yet", { exact: false })).toBeVisible();
    await page.getByLabel("Search Tickets").fill("no matching ticket");
    await expect(page.getByText("No Matching Tickets", { exact: true })).toBeVisible();
    await noOverflow(page);
  });
});
