import { test, expect } from '@playwright/test';

const BASE = process.env.DEPLOY_URL;

// Skip entire suite when no deploy URL provided (local dev without server)
test.beforeEach(async ({}, testInfo) => {
  if (!BASE) testInfo.skip(true, 'DEPLOY_URL not set — skipping smoke tests');
});

test('page loads and shows dashboard title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/QA/i);
  await expect(page.getByText('QA Dashboard', { exact: false })).toBeVisible({ timeout: 15000 });
});

test('summary cards render with metric labels', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('CI Pass Rate', { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Open Bugs',    { exact: false })).toBeVisible({ timeout: 15000 });
});

test('navigation tabs are present', async ({ page }) => {
  await page.goto('/');
  for (const label of ['Overview', 'Heat Map', 'CI Pipeline', 'Jira Board', 'Self-Healing']) {
    await expect(page.getByText(label, { exact: false })).toBeVisible({ timeout: 10000 });
  }
});

test('self-healing section loads repo tabs', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Self-Healing', { exact: false }).first().click();
  await expect(page.getByText('QA Dashboard (This App)', { exact: false })).toBeVisible({ timeout: 20000 });
});

test('jira board filters render', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Jira Board', { exact: false }).first().click();
  await expect(page.getByText('JIRA Board', { exact: false })).toBeVisible({ timeout: 15000 });
  // At least one filter select should be present
  const selects = page.locator('select');
  await expect(selects.first()).toBeVisible({ timeout: 10000 });
});

test('heatmap section renders repo rows', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Heat Map', { exact: false }).first().click();
  // Heatmap should show at least one repo
  await expect(page.locator('body')).not.toContainText('Loading', { timeout: 20000 });
});
