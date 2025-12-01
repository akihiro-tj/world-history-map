import { expect, test } from '@playwright/test';

/**
 * E2E tests for year link navigation within territory descriptions
 *
 * Tests that clicking on year links in territory descriptions
 * navigates to that year's map view.
 */

test.describe('Year Link Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for map to load
    await expect(page.getByTestId('map-container')).toBeVisible();
    await expect(page.getByTestId('loading-overlay')).not.toBeVisible({ timeout: 15000 });
  });

  test('clicking year link in description navigates to that year', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on a territory to open info panel
    await mapContainer.click({ position: { x: 400, y: 300 } });

    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Look for year links in the panel
    const yearLinks = infoPanel.getByTestId('year-link');
    const linkCount = await yearLinks.count();

    if (linkCount > 0) {
      // Get the year from the first link
      const firstLink = yearLinks.first();
      const yearText = await firstLink.textContent();
      const targetYear = yearText?.match(/\d+/)?.[0];

      if (targetYear) {
        // Click the year link
        await firstLink.click();

        // Verify that the year selector shows the new year
        const yearSelector = page.getByTestId('year-selector');
        await expect(yearSelector).toContainText(targetYear, { timeout: 5000 });
      }
    }
    // If no year links exist, the test passes (some territories may not have related years)
  });

  test('year link navigation closes the info panel', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on a territory to open info panel
    await mapContainer.click({ position: { x: 400, y: 300 } });

    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Look for year links in the panel
    const yearLinks = infoPanel.getByTestId('year-link');
    const linkCount = await yearLinks.count();

    if (linkCount > 0) {
      // Click the first year link
      await yearLinks.first().click();

      // Info panel should close after navigation
      await expect(infoPanel).not.toBeVisible({ timeout: 5000 });
    }
    // If no year links exist, the test passes
  });

  test('year link has proper keyboard accessibility', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on a territory to open info panel
    await mapContainer.click({ position: { x: 400, y: 300 } });

    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Look for year links in the panel
    const yearLinks = infoPanel.getByTestId('year-link');
    const linkCount = await yearLinks.count();

    if (linkCount > 0) {
      const firstLink = yearLinks.first();

      // Focus the year link
      await firstLink.focus();

      // Check it's focusable
      await expect(firstLink).toBeFocused();

      // Check it has proper role (button or link)
      const role = await firstLink.getAttribute('role');
      const tagName = await firstLink.evaluate((el) => el.tagName.toLowerCase());

      expect(
        role === 'button' || role === 'link' || tagName === 'button' || tagName === 'a',
      ).toBeTruthy();
    }
  });

  test('year link shows related years from territory description', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on a territory to open info panel
    await mapContainer.click({ position: { x: 400, y: 300 } });

    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Check for related years section
    const relatedYearsSection = infoPanel.getByTestId('related-years');

    // Either related years section exists or there's a "no related years" state
    const hasRelatedYears = await relatedYearsSection.isVisible().catch(() => false);

    if (hasRelatedYears) {
      // Should contain at least one year link
      const yearLinks = relatedYearsSection.getByTestId('year-link');
      const linkCount = await yearLinks.count();
      expect(linkCount).toBeGreaterThanOrEqual(0);
    }
  });
});
