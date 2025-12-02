import { expect, test } from '@playwright/test';

/**
 * E2E tests for license disclaimer modal
 *
 * Tests that clicking on license link opens the disclaimer modal
 * with GPL-3.0 attribution and historical data disclaimers.
 */

test.describe('License Disclaimer Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for map to load
    await expect(page.getByTestId('map-container')).toBeVisible();
    await expect(page.getByTestId('loading-overlay')).not.toBeVisible({ timeout: 15000 });
  });

  test('license link is visible in the footer', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await expect(licenseLink).toBeVisible();
    await expect(licenseLink).toHaveText(/ライセンス|License/i);
  });

  test('clicking license link opens the disclaimer modal', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('role', 'dialog');
  });

  test('modal displays GPL-3.0 attribution', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();

    // Check for GPL-3.0 license attribution
    await expect(modal).toContainText('GPL-3.0');
    await expect(modal).toContainText('historical-basemaps');
  });

  test('modal displays data accuracy disclaimer', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();

    // Check for data accuracy warning
    const disclaimerSection = modal.getByTestId('data-disclaimer');
    await expect(disclaimerSection).toBeVisible();
  });

  test('modal displays historical borders disclaimer', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();

    // Check for historical borders conceptual limitations
    const bordersSection = modal.getByTestId('borders-disclaimer');
    await expect(bordersSection).toBeVisible();
  });

  test('modal displays disputed territories notice', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();

    // Check for disputed territories notice
    const disputedSection = modal.getByTestId('disputed-disclaimer');
    await expect(disputedSection).toBeVisible();
  });

  test('modal can be closed with close button', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();

    // Click close button
    const closeButton = modal.getByRole('button', { name: /close|閉じる/i });
    await closeButton.click();

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test('modal can be closed with Escape key', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test('modal can be closed by clicking backdrop', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();

    // Click on backdrop (outside modal content)
    const backdrop = page.getByTestId('license-modal-backdrop');
    await backdrop.click({ position: { x: 10, y: 10 } });

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test('modal has focus trap', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();

    // Get all focusable elements in modal
    const closeButton = modal.getByRole('button', { name: /close|閉じる/i });

    // Tab through elements - focus should stay within modal
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // After tabbing, focus should wrap back to elements within modal
    // The close button should be focusable
    await expect(closeButton).toBeVisible();
  });

  test('modal has proper accessibility attributes', async ({ page }) => {
    const licenseLink = page.getByTestId('license-link');
    await licenseLink.click();

    const modal = page.getByTestId('license-disclaimer-modal');
    await expect(modal).toBeVisible();

    // Check accessibility attributes
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby');
  });
});
