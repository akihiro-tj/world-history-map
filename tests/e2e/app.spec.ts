import { expect, test } from '@playwright/test';

test.describe('App', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/World History Atlas/i);
  });

  test('should display the main content', async ({ page }) => {
    await page.goto('/');
    // Verify the page has loaded by checking for any visible content
    await expect(page.locator('body')).toBeVisible();
  });
});
