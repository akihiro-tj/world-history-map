import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for map to load
    await page.waitForSelector("[data-testid='map-container']");
  });

  test('should not have any automatically detectable accessibility issues on initial load', async ({
    page,
  }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues with year selector open', async ({ page }) => {
    // Focus on year selector
    const yearSelector = page.locator("[data-testid='year-selector']");
    await yearSelector.focus();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues with territory info panel open', async ({ page }) => {
    // Click on territory to open info panel
    const mapContainer = page.locator("[data-testid='map-container']");
    await mapContainer.click({ position: { x: 400, y: 300 } });

    // Wait for potential panel to appear
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues with license modal open', async ({ page }) => {
    // Click license button to open modal
    const licenseButton = page.getByRole('button', { name: /ライセンス/i });
    if (await licenseButton.isVisible()) {
      await licenseButton.click();

      // Wait for modal to appear
      await page.waitForSelector("[data-testid='license-modal']", {
        timeout: 5000,
      });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    // Continue tabbing and verify focus is visible
    await page.keyboard.press('Tab');
    const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(secondFocused).toBeTruthy();
  });
});
