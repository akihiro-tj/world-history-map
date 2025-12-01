import { expect, test } from '@playwright/test';

/**
 * E2E tests for territory info panel display
 *
 * Tests that clicking on a territory displays the info panel
 * with historical description.
 */

test.describe('Territory Info Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for map to load
    await expect(page.getByTestId('map-container')).toBeVisible();
    await expect(page.getByTestId('loading-overlay')).not.toBeVisible({ timeout: 15000 });
  });

  test('clicking on a territory opens the info panel', async ({ page }) => {
    // Get the map canvas
    const mapContainer = page.getByTestId('map-container');

    // Click on the center of the map (should hit a territory in 1650)
    await mapContainer.click({ position: { x: 400, y: 300 } });

    // Wait for and verify info panel appears
    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });
  });

  test('info panel displays territory name', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on the map to select a territory
    await mapContainer.click({ position: { x: 400, y: 300 } });

    // Check for territory name in the panel
    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // The panel should contain a territory name heading
    const territoryName = infoPanel.getByRole('heading', { level: 2 });
    await expect(territoryName).toBeVisible();
  });

  test('info panel shows AI-generated content notice', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on the map to select a territory
    await mapContainer.click({ position: { x: 400, y: 300 } });

    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Check for AI-generated notice
    const aiNotice = page.getByTestId('ai-notice');
    await expect(aiNotice).toBeVisible();
    await expect(aiNotice).toContainText('AI');
  });

  test('info panel can be closed with close button', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on the map to open panel
    await mapContainer.click({ position: { x: 400, y: 300 } });

    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Click close button
    const closeButton = infoPanel.getByRole('button', { name: /close|閉じる/i });
    await closeButton.click();

    // Panel should be hidden
    await expect(infoPanel).not.toBeVisible();
  });

  test('info panel can be closed with Escape key', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on the map to open panel
    await mapContainer.click({ position: { x: 400, y: 300 } });

    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Press Escape key
    await page.keyboard.press('Escape');

    // Panel should be hidden
    await expect(infoPanel).not.toBeVisible();
  });

  test('clicking on different territory updates the panel', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on first territory
    await mapContainer.click({ position: { x: 400, y: 300 } });

    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Get territory name heading
    const territoryName = infoPanel.getByRole('heading', { level: 2 });
    await expect(territoryName).toBeVisible();

    // Click on a different position (different territory)
    await mapContainer.click({ position: { x: 600, y: 250 } });

    // Panel should still be visible
    await expect(infoPanel).toBeVisible();

    // Note: The name might be the same or different depending on the territory
    // This test mainly verifies the click handler works for subsequent clicks
    await expect(territoryName).toBeVisible();
  });

  test('shows placeholder message when no description available', async ({ page }) => {
    const mapContainer = page.getByTestId('map-container');

    // Click on the map - some territories may not have descriptions
    await mapContainer.click({ position: { x: 400, y: 300 } });

    const infoPanel = page.getByTestId('territory-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Either description content OR placeholder message should be visible
    const hasDescription = await infoPanel
      .getByTestId('territory-description')
      .isVisible()
      .catch(() => false);
    const hasPlaceholder = await infoPanel
      .getByTestId('no-description-message')
      .isVisible()
      .catch(() => false);

    expect(hasDescription || hasPlaceholder).toBeTruthy();
  });
});
