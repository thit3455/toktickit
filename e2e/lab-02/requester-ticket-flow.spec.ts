import { test, expect } from "@playwright/test";

test.describe("Lab 2 Requester Ticket Flow", () => {
  test(
    "Requester can create ticket and view it in My Tickets",
    async ({ page }) => {
      const ticketSummary = `Playwright Test Ticket ${Date.now()}`;

      await page.goto("/");

      // Select Development Requester
      await page
        .locator("#development-requester")
        .selectOption({ index: 1 });

      await page
        .getByRole("button", {
          name: "Continue",
        })
        .click();

      // Verify Create Ticket page
      await expect(
        page.getByRole("heading", {
          name: "Create Ticket",
        })
      ).toBeVisible();

      // Fill Create Ticket form
      await page
        .locator("#category")
        .selectOption({ index: 1 });

      await page
        .locator("#related-system")
        .selectOption({ index: 1 });

      await page
        .locator("#ticket-summary")
        .fill(ticketSummary);

      await page
        .locator("#requested-priority")
        .selectOption("HIGH");

      await page
        .locator("#description")
        .fill(
          "This ticket is created during Lab 2 end to end testing."
        );

      // Submit ticket
      await page
        .getByRole("button", {
          name: "Submit Ticket",
        })
        .click();

      // Verify ticket creation success
      await expect(
        page.getByText(
          "Ticket created successfully"
        )
      ).toBeVisible({
        timeout: 10000,
      });

      // Open My Tickets
      await page
        .getByRole("button", {
          name: "My Tickets",
        })
        .click();

      // Verify My Tickets page
      await expect(
        page.getByRole("heading", {
          name: "My Tickets",
        })
      ).toBeVisible();

      // Verify created ticket appears
      await expect(
        page.getByRole("cell", {
          name: ticketSummary,
        })
      ).toBeVisible({
        timeout: 10000,
      });
    }
  );

  test(
    "Responsive screenshots",
    async ({ page }, testInfo) => {
      await page.goto("/");

      await page.screenshot({
        path: `artifacts/lab-02/screenshots/create-ticket/home-${testInfo.project.name}.png`,
        fullPage: true,
      });
    }
  );
});