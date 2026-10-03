import { test, expect } from '@playwright/test';

// Controlled API fixtures verify actual browser layout and API query wiring;
// PostgreSQL/authentication behavior is covered by the server integration suite.
const ticket = {
  id: 101, ticketNumber: 'QUEUE-101', summary: 'Investigate a very long network connection problem '.repeat(5),
  requestedPriority: 'HIGH', itPriority: 'URGENT', currentStatus: 'WAITING_FOR_REQUESTER',
  createdAt: '2026-09-01T09:00:00Z', updatedAt: '2026-09-02T09:00:00Z',
  category: { id: 1, name: 'Network and access' }, relatedSystem: { id: 1, name: 'Office' },
  requester: { id: 3, name: 'Requester', email: 'owner@example.test' }, assignedStaff: null,
  description: 'Ticket details',
};
test('queue is usable without horizontal overflow and opens staff detail', async ({ page }, testInfo) => {
  const queries: URLSearchParams[] = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') { await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Authentication required.' } }) }); return; }
    let body: unknown = { data: [] };
    if (url.pathname === '/api/auth/login') body = { data: { user: { id: 2, name: 'Zig', email: 'staff@example.test', role: 'IT_STAFF', mustChangePassword: false } } };
    else if (url.pathname === '/api/staff/tickets') {
      queries.push(url.searchParams);
      const current = Number(url.searchParams.get('page') || 1);
      body = { data: [ticket], pagination: { page: current, limit: 10, total: 12, totalPages: 2 } };
    } else if (url.pathname === '/api/staff/tickets/101') body = { data: ticket };
    else if (url.pathname === '/api/categories') body = [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open QUEUE-101' })).toBeVisible();
  await expect(page.locator('.staff-queue-table').getByText('Unassigned', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const width = page.viewportSize()!.width;
  const display = await page.locator('.staff-queue-table tbody tr').evaluate(element => getComputedStyle(element).display);
  expect(display).toBe(width < 1200 ? 'block' : 'table-row');
  await page.getByLabel('Search tickets').fill('Network');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get('search')).toBe('Network');
  await page.getByLabel('IT Priority', { exact: true }).selectOption('URGENT');
  await expect.poll(() => queries.at(-1)?.get('itPriority')).toBe('URGENT');
  await page.getByLabel('Sort by').selectOption('updatedAt');
  await expect.poll(() => queries.at(-1)?.get('sort')).toBe('updatedAt');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  expect(queries.at(-1)?.get('itPriority')).toBe('URGENT');
  await page.screenshot({ path: testInfo.outputPath('queue.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open QUEUE-101' }).click();
  await expect(page.getByRole('heading', { name: 'Ticket Detail', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Claim Ticket' })).toBeVisible();
});
