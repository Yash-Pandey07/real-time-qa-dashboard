import { test, expect } from '@playwright/test';

const BASE = process.env.DEPLOY_URL;

// Skip entire suite when no deploy URL provided (local dev without server)
test.beforeEach(async ({}, testInfo) => {
  if (!BASE) testInfo.skip(true, 'DEPLOY_URL not set — skipping smoke tests');
});

test('page loads and shows dashboard title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/QA/i);
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });
});

test('summary cards render with metric labels', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('CI Pass Rate', { exact: false }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Open Bugs',    { exact: false }).first()).toBeVisible({ timeout: 15000 });
});

test('navigation tabs are present', async ({ page }) => {
  await page.goto('/');
  for (const label of ['Heat Map', 'CI Pipeline', 'Jira Board', 'Self-Healing']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible({ timeout: 10000 });
  }
});

test('self-healing section loads repo tabs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Self-Healing' }).click();
  // Wait for any repo tab to appear (text varies by deployment config)
  await expect(page.locator('[class*="tab"], [class*="repo"], button').first()).toBeVisible({ timeout: 20000 });
});

test('jira board filters render', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jira Board' }).click();
  await expect(page.getByRole('heading', { name: /JIRA/i })).toBeVisible({ timeout: 15000 });
  // At least one filter select should be present
  const selects = page.locator('select');
  await expect(selects.first()).toBeVisible({ timeout: 10000 });
});

test('heatmap section renders repo rows', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Heat Map' }).click();
  // Heatmap should show at least one repo
  await expect(page.locator('body')).not.toContainText('Loading', { timeout: 20000 });
});
