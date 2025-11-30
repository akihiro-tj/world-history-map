import { expect, test } from '@playwright/test';

test.describe('Year Selector - Available Years Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the map and year selector to be loaded
    await page.waitForSelector('[data-testid="year-selector"]', { timeout: 10000 });
  });

  test('should display the year selector component', async ({ page }) => {
    const yearSelector = page.locator('[data-testid="year-selector"]');
    await expect(yearSelector).toBeVisible();
  });

  test('should display available years from index.json', async ({ page }) => {
    const yearSelector = page.locator('[data-testid="year-selector"]');
    await expect(yearSelector).toBeVisible();

    // At minimum, 1650 should be available (MVP default)
    const year1650Button = page.locator('[data-testid="year-button-1650"]');
    await expect(year1650Button).toBeVisible();
  });

  test('should highlight the currently selected year', async ({ page }) => {
    // Default selected year is 1650
    const year1650Button = page.locator('[data-testid="year-button-1650"]');
    await expect(year1650Button).toHaveAttribute('aria-current', 'true');
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    const yearSelector = page.locator('[data-testid="year-selector"]');
    await expect(yearSelector).toHaveAttribute('aria-label');

    // Year buttons should be accessible (button role is implicit for <button> elements)
    const yearButton = page.locator('[data-testid="year-button-1650"]');
    await expect(yearButton).toHaveAttribute('aria-label');
  });

  test('should display years in chronological order', async ({ page }) => {
    // Get all year buttons
    const yearButtons = page.locator('[data-testid^="year-button-"]');
    const count = await yearButtons.count();

    if (count > 1) {
      // Extract years and verify they are sorted
      const years: number[] = [];
      for (let i = 0; i < count; i++) {
        const testId = await yearButtons.nth(i).getAttribute('data-testid');
        const yearStr = testId?.replace('year-button-', '') ?? '0';
        const year = Number.parseInt(yearStr, 10);
        years.push(year);
      }

      // Verify ascending order
      for (let i = 1; i < years.length; i++) {
        const currentYear = years[i];
        const previousYear = years[i - 1];
        if (currentYear !== undefined && previousYear !== undefined) {
          expect(currentYear).toBeGreaterThan(previousYear);
        }
      }
    }
  });

  test('should support keyboard navigation within year selector', async ({ page }) => {
    const yearSelector = page.locator('[data-testid="year-selector"]');
    await yearSelector.focus();

    // Tab should move focus to year buttons
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('data-testid', /year-button-/);
  });

  test('should navigate years with arrow keys', async ({ page }) => {
    const year1650Button = page.locator('[data-testid="year-button-1650"]');
    await year1650Button.focus();

    // Get all year buttons to check navigation
    const yearButtons = page.locator('[data-testid^="year-button-"]');
    const count = await yearButtons.count();

    if (count > 1) {
      // Press right arrow to move to next year
      await page.keyboard.press('ArrowRight');
      const focusedElement = page.locator(':focus');
      // Should have moved to a different year button
      const focusedTestId = await focusedElement.getAttribute('data-testid');
      expect(focusedTestId).toMatch(/year-button-/);
      expect(focusedTestId).not.toBe('year-button-1650');
    }
  });
});
