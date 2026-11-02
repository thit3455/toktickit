import { test, expect, type Lab4Case } from "../lab-04/workflow-fixtures";
test.use({ baseURL: "http://localhost:5174", trace: "retain-on-failure", screenshot: "only-on-failure" });
// Real APIs in an invocation-owned schema; never load server/.env or delete persistent fixtures.
test("real Staff workflow persists ownership, priority, status, public comment and internal note", async ({ page, harness }) => {
  test.setTimeout(90000);
  const data = { ...await harness.request("fixture", { unassigned: true }) as Lab4Case, apiUrl: harness.apiUrl };
  const [staff, assignee] = data.users, number = data.ticketNumber;
  const comment = "We are investigating the Wi-Fi connection and will update you shortly.";
  const note = "Check the wireless driver and access point logs before replacing hardware.";
  async function searchQueue() {
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue", exact: true })).toBeVisible();
    await page.getByLabel("Search tickets").fill(number); await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("button", { name: "Open " + number, exact: true })).toBeVisible();
  }
  const area = page.getByRole("region", { name: "Ticket Workflow", exact: true });
  await page.goto("/"); await page.getByLabel("Email", { exact: true }).fill(staff.email);
  await page.getByLabel("Password", { exact: true }).fill(data.password); await page.getByRole("button", { name: "Login", exact: true }).click();
  await searchQueue(); await expect(page.locator(".staff-queue-table").getByText("Unassigned", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open " + number, exact: true }).click();
  await area.getByRole("button", { name: "Claim Ticket", exact: true }).click();
  await expect(area.getByText("Ticket claimed successfully.", { exact: true })).toBeVisible();
  await expect(area.getByText(/Ticket Owner:/)).toContainText(staff.name);
  await expect(area.getByRole("button", { name: "Claim Ticket", exact: true })).toHaveCount(0);
  await area.getByRole("button", { name: "Reassign Ticket", exact: true }).click();
  await area.getByLabel("Reassign to *", { exact: true }).selectOption(String(assignee.id));
  await area.getByRole("button", { name: "Save Ticket change", exact: true }).click();
  await expect(area.getByText("Ticket reassigned successfully.", { exact: true })).toBeVisible();
  await area.getByRole("button", { name: "Update IT Priority", exact: true }).click();
  await area.getByLabel("IT Priority *", { exact: true }).selectOption("HIGH");
  await area.getByRole("button", { name: "Save Ticket change", exact: true }).click();
  await expect(area.getByText("IT priority updated successfully.", { exact: true })).toBeVisible();
  for (const destination of ["OPEN", "IN_PROGRESS"]) {
    await area.getByRole("button", { name: "Update Status", exact: true }).click();
    await area.getByLabel("Status *", { exact: true }).selectOption(destination);
    await area.getByRole("button", { name: "Save Ticket change", exact: true }).click();
    await expect(area.getByRole("form", { name: "Ticket workflow editor" })).toHaveCount(0);
    await expect(area.getByText(/Current Ticket status:/)).toContainText(destination.replaceAll("_", " "));
  }
  await page.getByLabel("New public comment").fill(comment); await page.getByRole("button", { name: "Add Public Comment", exact: true }).click();
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
  await page.getByLabel("New internal note").fill(note); await page.getByRole("button", { name: "Add Internal Note", exact: true }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await page.reload(); await searchQueue(); await expect(page.locator(".staff-queue-table").getByText(assignee.name, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open " + number, exact: true }).click();
  await expect(area.getByText(/Ticket Owner:/)).toContainText(assignee.name); await expect(area.getByText(/Ticket Owner:/)).toContainText("HIGH");
  await expect(area.getByText(/Current Ticket status:/)).toContainText("IN PROGRESS");
  await expect(page.getByText(comment, { exact: true })).toBeVisible(); await expect(page.getByText(note, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const response = await page.request.get(data.apiUrl + "/api/tickets/" + data.ticketId);
  expect(response.status()).toBe(200); expect((await response.json()).data).toMatchObject({ requesterId: data.users[4].id, assignedStaffId: assignee.id, itPriority: "HIGH", currentStatus: "IN_PROGRESS", version: 5 });
  for (const [path, message] of [["comments", comment], ["internal-notes", note]]) {
    const result = await page.request.get(data.apiUrl + "/api/tickets/" + data.ticketId + "/" + path); expect(result.status()).toBe(200);
    const entries = (await result.json()).data; expect(entries).toHaveLength(1); expect(entries[0]).toMatchObject({ message, user: { name: staff.name } }); expect(Number.isNaN(Date.parse(entries[0].createdAt))).toBe(false);
  }
});
