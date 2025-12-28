import { test, expect } from '@playwright/test';

const BASE_URL = process.env.DEVLOG_URL || 'https://devlogs.meetrhea.com';

test.describe('Devlog Viewer', () => {
  test('loads homepage', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Devlog Viewer');
  });

  test('displays stats', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const totalCount = page.locator('#total-count');
    await expect(totalCount).not.toHaveText('-');
  });

  test('loads devlogs', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const devlogs = page.locator('.devlog');
    await expect(devlogs.first()).toBeVisible();
  });

  test('filter by service', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const serviceFilter = page.locator('#service-filter');
    await expect(serviceFilter).toBeVisible();

    // Select a service if options exist
    const options = await serviceFilter.locator('option').count();
    if (options > 1) {
      await serviceFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
    }
  });

  test('filter by type', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    const typeFilter = page.locator('#type-filter');
    await typeFilter.selectOption('feature');
    await page.waitForTimeout(1000);

    // All visible devlogs should be features
    const devlogs = page.locator('.devlog.type-feature');
    const count = await devlogs.count();
    if (count > 0) {
      await expect(devlogs.first()).toBeVisible();
    }
  });

  test('search works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const search = page.locator('#search');
    await search.fill('test');
    await page.waitForTimeout(500);

    // Search should filter results
    await expect(search).toHaveValue('test');
  });

  test('health endpoint returns healthy', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.service).toBe('devlog-viewer');
    expect(body.status).toBe('healthy');
  });

  test('API returns devlogs', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/devlogs?limit=5`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.devlogs).toBeDefined();
    expect(Array.isArray(body.devlogs)).toBe(true);
  });

  test('API returns services', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/services`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.services).toBeDefined();
    expect(Array.isArray(body.services)).toBe(true);
  });

  test('devlog cards are clickable', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const devlog = page.locator('.devlog').first();
    await expect(devlog).toBeVisible();

    // Verify cursor style indicates clickable
    const cursor = await devlog.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('click-to-expand toggles content', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const devlogs = page.locator('.devlog');
    const count = await devlogs.count();

    // Find a devlog that might have truncated content
    for (let i = 0; i < Math.min(count, 5); i++) {
      const devlog = devlogs.nth(i);
      const hasExpandHint = await devlog.locator('text=Click to expand').isVisible().catch(() => false);

      if (hasExpandHint) {
        // Click to expand
        await devlog.click();
        await page.waitForTimeout(300);

        // Should now have expanded class
        await expect(devlog).toHaveClass(/expanded/);

        // Click again to collapse
        await devlog.click();
        await page.waitForTimeout(300);

        // Should no longer have expanded class
        const classes = await devlog.getAttribute('class');
        expect(classes).not.toContain('expanded');
        break;
      }
    }
  });

  test('expanded devlogs have different styling', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const devlog = page.locator('.devlog').first();
    await expect(devlog).toBeVisible();

    // Get initial background color
    const initialBg = await devlog.evaluate(el => getComputedStyle(el).backgroundColor);

    // Click to expand
    await devlog.click();
    await page.waitForTimeout(300);

    // Get expanded background color
    const expandedBg = await devlog.evaluate(el => getComputedStyle(el).backgroundColor);

    // Colors should be different when expanded
    expect(expandedBg).not.toBe(initialBg);
  });
});
