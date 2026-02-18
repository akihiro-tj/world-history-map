import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearColorSchemeCache,
  createMatchColorExpression,
  getColorForSubjecto,
  loadColorScheme,
} from './color-scheme';

const colorSchemeJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../public/data/color-scheme.json'), 'utf8'),
) as Record<string, string>;

const mockFetch = vi.fn();

beforeAll(() => {
  global.fetch = mockFetch;
});

function mockFetchColorScheme() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(colorSchemeJson),
  });
}

describe('color-scheme', () => {
  beforeEach(async () => {
    clearColorSchemeCache();
    mockFetchColorScheme();
    await loadColorScheme();
  });

  afterEach(() => {
    clearColorSchemeCache();
    mockFetch.mockReset();
  });

  describe('getColorForSubjecto', () => {
    it('should return predefined color for major powers', () => {
      expect(getColorForSubjecto('France')).toBe('#377eb8');
      expect(getColorForSubjecto('England')).toBe('#e41a1c');
      expect(getColorForSubjecto('Spanish Habsburg')).toBe('#e6c74c');
      expect(getColorForSubjecto('Ottoman Empire')).toBe('#b22222');
    });

    it('should return hash-based color for other territories', () => {
      const color = getColorForSubjecto('Cree');
      expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });

    it('should return consistent color for same SUBJECTO', () => {
      const color1 = getColorForSubjecto('Cree');
      const color2 = getColorForSubjecto('Cree');
      expect(color1).toBe(color2);
    });

    it('should return default color for unknown SUBJECTO', () => {
      const color = getColorForSubjecto('NonExistentTerritory12345');
      expect(color).toBe('#cccccc');
    });
  });

  describe('createMatchColorExpression', () => {
    it('should return a valid MapLibre match expression', () => {
      const expr = createMatchColorExpression();

      expect(Array.isArray(expr)).toBe(true);
      expect(expr[0]).toBe('match');
      // Falls back to NAME when SUBJECTO is empty
      expect(expr[1]).toEqual([
        'case',
        ['==', ['get', 'SUBJECTO'], ''],
        ['get', 'NAME'],
        ['get', 'SUBJECTO'],
      ]);
    });

    it('should include major powers in the expression', () => {
      const expr = createMatchColorExpression();
      const exprString = JSON.stringify(expr);

      expect(exprString).toContain('France');
      expect(exprString).toContain('England');
      expect(exprString).toContain('Spanish Habsburg');
    });

    it('should have default color as last element', () => {
      const expr = createMatchColorExpression();
      const lastElement = expr[expr.length - 1];

      expect(lastElement).toBe('#cccccc');
    });
  });
});
