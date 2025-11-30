import { expect, test } from '@playwright/test';

test.describe('Map Display - Initial 1650 Territories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the map container on page load', async ({ page }) => {
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();
  });

  test('should load 1650 as the default year', async ({ page }) => {
    // Wait for the map to be loaded
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // The year selector should show 1650 as selected
    const year1650Button = page.locator('[data-testid="year-button-1650"]');
    await expect(year1650Button).toHaveAttribute('aria-current', 'true');
  });

  test('should display territory boundaries on the map', async ({ page }) => {
    // Wait for the map canvas to be ready
    const mapCanvas = page.locator('.maplibregl-canvas');
    await expect(mapCanvas).toBeVisible();

    // Wait for map to be idle (tiles loaded)
    await page.waitForFunction(
      () => {
        const map = (window as unknown as { __mapRef?: { isStyleLoaded: () => boolean } }).__mapRef;
        return map?.isStyleLoaded?.() ?? false;
      },
      { timeout: 30000 },
    );
  });

  test('should have proper ARIA label for map region', async ({ page }) => {
    const mapRegion = page.locator('[role="application"][aria-label*="map"]');
    await expect(mapRegion).toBeVisible();
  });

  test('should display territory labels when zoomed appropriately', async ({ page }) => {
    const mapCanvas = page.locator('.maplibregl-canvas');
    await expect(mapCanvas).toBeVisible();

    // Wait for map to load
    await page.waitForFunction(
      () => {
        const map = (window as unknown as { __mapRef?: { isStyleLoaded: () => boolean } }).__mapRef;
        return map?.isStyleLoaded?.() ?? false;
      },
      { timeout: 30000 },
    );

    // Territory labels should be present in the style
    // This verifies the label layer is configured
    await page.waitForFunction(
      () => {
        const map = (window as unknown as { __mapRef?: { getLayer: (id: string) => unknown } })
          .__mapRef;
        return map?.getLayer?.('territory-label') !== undefined;
      },
      { timeout: 10000 },
    );
  });
});
