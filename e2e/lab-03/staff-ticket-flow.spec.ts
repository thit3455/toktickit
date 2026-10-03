import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client";
import bcrypt from "../../server/node_modules/bcrypt";
import { randomUUID } from "node:crypto";

// Follow the existing real-API suites' disposable database-fixture convention.
// All workflow actions below go through browser controls; no request interception.
process.loadEnvFile("server/.env");
const prisma = new PrismaClient();
const api = process.env.E2E_API_URL ?? "http://localhost:3001";
const password = "StaffBrowser123!";
let users: { id: number; name: string; email: string }[] = [];
let ticketId: number | undefined;
let categoryId: number | undefined;
let systemId: number | undefined;
let number: string;

test.beforeEach(async () => {
  users = []; ticketId = categoryId = systemId = undefined;
  const stamp = randomUUID();
  number = `STAFF-E2E-${stamp}`;
  const passwordHash = await bcrypt.hash(password, 4);
  for (const [index, role] of (["IT_STAFF", "IT_STAFF", "REQUESTER"] as const).entries()) {
    users.push(await prisma.user.create({ data: { name: `Flow User ${index} ${stamp.slice(0, 8)}`, email: `flow-${index}-${stamp}@example.test`, role, passwordHash, mustChangePassword: false } }));
  }
  categoryId = (await prisma.category.create({ data: { name: `Flow hardware ${stamp}` } })).id;
  systemId = (await prisma.relatedSystem.create({ data: { name: `Flow office ${stamp}` } })).id;
  ticketId = (await prisma.ticket.create({ data: { ticketNumber: number, requesterId: users[2].id, categoryId, relatedSystemId: systemId, summary: "Office laptop cannot connect to Wi-Fi", description: "Connection drops after waking from sleep.", requestedPriority: "MEDIUM", currentStatus: "NEW", assignedStaffId: null } })).id;
});
test.afterEach(async () => {
  // Deleting only this test ticket cascades its comments/notes before user cleanup.
  if (ticketId) await prisma.ticket.deleteMany({ where: { id: ticketId } });
  const ids = users.map(user => user.id);
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
  if (systemId) await prisma.relatedSystem.deleteMany({ where: { id: systemId } });
});
test.afterAll(async () => prisma.$disconnect());

test("real Staff workflow persists ownership, priority, status, public comment and internal note", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const comment = "We are investigating the Wi-Fi connection and will update you shortly.";
  const note = "Check the wireless driver and access point logs before replacing hardware.";
  async function searchQueue() {
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue", exact: true })).toBeVisible();
    await page.getByLabel("Search tickets").fill(number);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("button", { name: `Open ${number}`, exact: true })).toBeVisible();
  }
  async function noOverflow() {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await searchQueue();
  await expect(page.locator(".staff-queue-table").getByText("Unassigned", { exact: true })).toBeVisible();
  await noOverflow();
  await page.screenshot({ path: testInfo.outputPath("staff-queue.png"), fullPage: true });
  await page.getByRole("button", { name: `Open ${number}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ticket Detail", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Claim Ticket", exact: true }).click();
  await expect(page.getByText("Ticket claimed successfully.", { exact: true })).toBeVisible();
  await expect(page.getByText(`Assigned Staff: ${users[0].name}`, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim Ticket", exact: true })).toHaveCount(0);
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).assignedStaffId).toBe(users[0].id);
  await page.getByLabel("Reassign to", { exact: true }).selectOption(String(users[1].id));
  await page.getByRole("button", { name: "Reassign Ticket", exact: true }).click();
  await expect(page.getByText(`Ticket reassigned to ${users[1].name} successfully.`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Assigned Staff: ${users[1].name}`, { exact: true })).toBeVisible();
  await page.getByLabel("IT Priority", { exact: true }).selectOption("HIGH");
  await page.getByRole("button", { name: "Update IT Priority", exact: true }).click();
  await expect(page.getByText("IT priority updated successfully.", { exact: true })).toBeVisible();
  await page.getByLabel("Status", { exact: true }).selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Update Status", exact: true }).click();
  await expect(page.getByText("Ticket status updated successfully.", { exact: true })).toBeVisible();
  await page.getByLabel("New public comment").fill(comment);
  await page.getByRole("button", { name: "Add Public Comment", exact: true }).click();
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
  await page.getByLabel("New internal note").fill(note);
  await page.getByRole("button", { name: "Add Internal Note", exact: true }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await noOverflow();
  await page.reload();
  // The application restores its queue on reload; reopen the persisted ticket.
  await searchQueue();
  await expect(page.locator(".staff-queue-table").getByText(users[1].name, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Open ${number}`, exact: true }).click();
  await expect(page.getByText(`Assigned Staff: ${users[1].name}`, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim Ticket", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("IT Priority", { exact: true })).toHaveValue("HIGH");
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue("IN_PROGRESS");
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await noOverflow();
  await page.screenshot({ path: testInfo.outputPath("staff-ticket-detail.png"), fullPage: true });
  expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).toMatchObject({ requesterId: users[2].id, assignedStaffId: users[1].id, itPriority: "HIGH", currentStatus: "IN_PROGRESS" });
  for (const [path, message] of [["comments", comment], ["internal-notes", note]]) {
    const response = await page.request.get(`${api}/api/tickets/${ticketId}/${path}`);
    expect(response.status()).toBe(200);
    const entries = (await response.json()).data;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ message, user: { name: users[0].name } });
    expect(Number.isNaN(Date.parse(entries[0].createdAt))).toBe(false);
  }
});
