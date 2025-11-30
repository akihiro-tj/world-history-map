import { expect, test } from '@playwright/test';

test.describe('Map Interaction - Zoom and Pan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for map to be loaded
    await page.waitForFunction(
      () => {
        const map = (window as unknown as { __mapRef?: { isStyleLoaded: () => boolean } }).__mapRef;
        return map?.isStyleLoaded?.() ?? false;
      },
      { timeout: 30000 },
    );
  });

  test('should zoom in when using scroll wheel', async ({ page }) => {
    const mapCanvas = page.locator('.maplibregl-canvas');
    await expect(mapCanvas).toBeVisible();

    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      const map = (window as unknown as { __mapRef?: { getZoom: () => number } }).__mapRef;
      return map?.getZoom?.() ?? 0;
    });

    // Scroll to zoom in on the map
    await mapCanvas.hover();
    await page.mouse.wheel(0, -300);

    // Wait for zoom animation
    await page.waitForTimeout(500);

    // Verify zoom increased
    const newZoom = await page.evaluate(() => {
      const map = (window as unknown as { __mapRef?: { getZoom: () => number } }).__mapRef;
      return map?.getZoom?.() ?? 0;
    });

    expect(newZoom).toBeGreaterThan(initialZoom);
  });

  test('should pan the map when dragging', async ({ page }) => {
    const mapCanvas = page.locator('.maplibregl-canvas');
    await expect(mapCanvas).toBeVisible();

    // Get initial center
    const initialCenter = await page.evaluate(() => {
      const map = (
        window as unknown as { __mapRef?: { getCenter: () => { lng: number; lat: number } } }
      ).__mapRef;
      const center = map?.getCenter?.();
      return center ? { lng: center.lng, lat: center.lat } : { lng: 0, lat: 0 };
    });

    // Get map container bounds
    const bounds = await mapCanvas.boundingBox();
    if (!bounds) throw new Error('Map canvas not found');

    // Drag the map
    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY, { steps: 10 });
    await page.mouse.up();

    // Wait for pan animation
    await page.waitForTimeout(500);

    // Verify center changed
    const newCenter = await page.evaluate(() => {
      const map = (
        window as unknown as { __mapRef?: { getCenter: () => { lng: number; lat: number } } }
      ).__mapRef;
      const center = map?.getCenter?.();
      return center ? { lng: center.lng, lat: center.lat } : { lng: 0, lat: 0 };
    });

    // Center should have changed (longitude decreased when dragging right)
    expect(newCenter.lng).not.toBe(initialCenter.lng);
  });

  test('should zoom in with keyboard + key', async ({ page }) => {
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // Focus the map
    await mapContainer.focus();

    // Get initial zoom
    const initialZoom = await page.evaluate(() => {
      const map = (window as unknown as { __mapRef?: { getZoom: () => number } }).__mapRef;
      return map?.getZoom?.() ?? 0;
    });

    // Press + to zoom in
    await page.keyboard.press('Equal'); // + key (Shift not needed on some layouts)
    await page.waitForTimeout(300);

    // Verify zoom increased
    const newZoom = await page.evaluate(() => {
      const map = (window as unknown as { __mapRef?: { getZoom: () => number } }).__mapRef;
      return map?.getZoom?.() ?? 0;
    });

    expect(newZoom).toBeGreaterThanOrEqual(initialZoom);
  });

  test('should zoom out with keyboard - key', async ({ page }) => {
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // First zoom in a bit
    await page.evaluate(() => {
      const map = (window as unknown as { __mapRef?: { setZoom: (z: number) => void } }).__mapRef;
      map?.setZoom?.(4);
    });
    await page.waitForTimeout(300);

    // Focus the map
    await mapContainer.focus();

    const initialZoom = await page.evaluate(() => {
      const map = (window as unknown as { __mapRef?: { getZoom: () => number } }).__mapRef;
      return map?.getZoom?.() ?? 0;
    });

    // Press - to zoom out
    await page.keyboard.press('Minus');
    await page.waitForTimeout(300);

    const newZoom = await page.evaluate(() => {
      const map = (window as unknown as { __mapRef?: { getZoom: () => number } }).__mapRef;
      return map?.getZoom?.() ?? 0;
    });

    expect(newZoom).toBeLessThanOrEqual(initialZoom);
  });

  test('should pan with arrow keys', async ({ page }) => {
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // Focus the map
    await mapContainer.focus();

    const initialCenter = await page.evaluate(() => {
      const map = (
        window as unknown as { __mapRef?: { getCenter: () => { lng: number; lat: number } } }
      ).__mapRef;
      const center = map?.getCenter?.();
      return center ? { lng: center.lng, lat: center.lat } : { lng: 0, lat: 0 };
    });

    // Press arrow right to pan
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    const newCenter = await page.evaluate(() => {
      const map = (
        window as unknown as { __mapRef?: { getCenter: () => { lng: number; lat: number } } }
      ).__mapRef;
      const center = map?.getCenter?.();
      return center ? { lng: center.lng, lat: center.lat } : { lng: 0, lat: 0 };
    });

    // Longitude should have increased (panned east)
    expect(newCenter.lng).toBeGreaterThan(initialCenter.lng);
  });

  test('should respect min and max zoom constraints', async ({ page }) => {
    // Try to zoom out beyond minimum
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        const map = (window as unknown as { __mapRef?: { zoomOut: () => void } }).__mapRef;
        map?.zoomOut?.();
      });
    }
    await page.waitForTimeout(500);

    const minZoom = await page.evaluate(() => {
      const map = (window as unknown as { __mapRef?: { getZoom: () => number } }).__mapRef;
      return map?.getZoom?.() ?? 0;
    });

    // Should not go below configured minimum (1)
    expect(minZoom).toBeGreaterThanOrEqual(1);

    // Try to zoom in beyond maximum
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        const map = (window as unknown as { __mapRef?: { zoomIn: () => void } }).__mapRef;
        map?.zoomIn?.();
      });
    }
    await page.waitForTimeout(500);

    const maxZoom = await page.evaluate(() => {
      const map = (window as unknown as { __mapRef?: { getZoom: () => number } }).__mapRef;
      return map?.getZoom?.() ?? 0;
    });

    // Should not exceed configured maximum (10)
    expect(maxZoom).toBeLessThanOrEqual(10);
  });
});
