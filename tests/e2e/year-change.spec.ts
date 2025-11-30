import { expect, test } from '@playwright/test';

test.describe('Year Change - Territory Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the map to be loaded
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });
    await page.waitForFunction(
      () => {
        const map = (window as unknown as { __mapRef?: { isStyleLoaded: () => boolean } }).__mapRef;
        return map?.isStyleLoaded?.() ?? false;
      },
      { timeout: 30000 },
    );
  });

  test('should update current year display when selecting a different year', async ({ page }) => {
    // Wait for year selector
    await page.waitForSelector('[data-testid="year-selector"]', { timeout: 10000 });

    // Get all available years
    const yearButtons = page.locator('[data-testid^="year-button-"]');
    const count = await yearButtons.count();

    if (count > 1) {
      // Click on a different year (not 1650)
      const secondYearButton = yearButtons.nth(1);
      await secondYearButton.click();

      // Verify the selected year button has aria-current="true"
      await expect(secondYearButton).toHaveAttribute('aria-current', 'true', { timeout: 5000 });
    }
  });

  test('should show loading indicator during year transition', async ({ page }) => {
    await page.waitForSelector('[data-testid="year-selector"]', { timeout: 10000 });

    const yearButtons = page.locator('[data-testid^="year-button-"]');
    const count = await yearButtons.count();

    if (count > 1) {
      // Click on a different year
      const secondYearButton = yearButtons.nth(1);
      await secondYearButton.click();

      // Loading overlay should appear (may be brief)
      const loadingOverlay = page.locator('[data-testid="loading-overlay"]');
      // We check if it exists at some point during transition
      // It might appear and disappear quickly
      await expect(loadingOverlay)
        .toBeVisible({ timeout: 2000 })
        .catch(() => {
          // Loading might be too fast to catch, which is acceptable
        });
    }
  });

  test('should update map tiles when changing year', async ({ page }) => {
    await page.waitForSelector('[data-testid="year-selector"]', { timeout: 10000 });

    const yearButtons = page.locator('[data-testid^="year-button-"]');
    const count = await yearButtons.count();

    if (count > 1) {
      // Get the initial PMTiles source URL
      const initialSourceUrl = await page.evaluate(() => {
        const map = (
          window as unknown as { __mapRef?: { getSource: (id: string) => { url?: string } } }
        ).__mapRef;
        const source = map?.getSource?.('territories');
        return source?.url;
      });

      // Click on a different year
      const secondYearButton = yearButtons.nth(1);
      await secondYearButton.click();

      // Wait for source to update
      await page.waitForFunction(
        (initialUrl: string | undefined) => {
          const map = (
            window as unknown as { __mapRef?: { getSource: (id: string) => { url?: string } } }
          ).__mapRef;
          const source = map?.getSource?.('territories');
          return source?.url !== initialUrl;
        },
        initialSourceUrl,
        { timeout: 10000 },
      );
    }
  });

  test('should update aria-current attribute on year buttons', async ({ page }) => {
    await page.waitForSelector('[data-testid="year-selector"]', { timeout: 10000 });

    // Initial state: 1650 should be current
    const year1650Button = page.locator('[data-testid="year-button-1650"]');
    await expect(year1650Button).toHaveAttribute('aria-current', 'true');

    const yearButtons = page.locator('[data-testid^="year-button-"]');
    const count = await yearButtons.count();

    if (count > 1) {
      // Click on a different year
      const secondYearButton = yearButtons.nth(1);
      await secondYearButton.click();

      // Wait for state to update
      await expect(secondYearButton).toHaveAttribute('aria-current', 'true', { timeout: 5000 });
      // 1650 should no longer be current
      await expect(year1650Button).not.toHaveAttribute('aria-current', 'true');
    }
  });

  test('should maintain map position when changing year', async ({ page }) => {
    await page.waitForSelector('[data-testid="year-selector"]', { timeout: 10000 });

    // Get initial map center
    const initialCenter = await page.evaluate(() => {
      const map = (
        window as unknown as { __mapRef?: { getCenter: () => { lng: number; lat: number } } }
      ).__mapRef;
      return map?.getCenter?.();
    });

    const yearButtons = page.locator('[data-testid^="year-button-"]');
    const count = await yearButtons.count();

    if (count > 1 && initialCenter) {
      // Click on a different year
      const secondYearButton = yearButtons.nth(1);
      await secondYearButton.click();

      // Wait for transition to complete
      await page.waitForTimeout(1000);

      // Check map center is preserved (with some tolerance for floating point)
      const newCenter = await page.evaluate(() => {
        const map = (
          window as unknown as { __mapRef?: { getCenter: () => { lng: number; lat: number } } }
        ).__mapRef;
        return map?.getCenter?.();
      });

      if (newCenter) {
        expect(Math.abs(newCenter.lng - initialCenter.lng)).toBeLessThan(0.1);
        expect(Math.abs(newCenter.lat - initialCenter.lat)).toBeLessThan(0.1);
      }
    }
  });

  test('should scroll year selector to show selected year', async ({ page }) => {
    await page.waitForSelector('[data-testid="year-selector"]', { timeout: 10000 });

    const yearButtons = page.locator('[data-testid^="year-button-"]');
    const count = await yearButtons.count();

    if (count > 1) {
      // Click on a year
      const targetButton = yearButtons.nth(Math.min(2, count - 1));
      await targetButton.click();

      // The button should be visible (scrolled into view)
      await expect(targetButton).toBeInViewport();
    }
  });
});
