import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearColorSchemeCache, createMatchColorExpression, loadColorScheme } from './color-scheme';

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

  describe('loadColorScheme', () => {
    it('throws on fetch failure', async () => {
      clearColorSchemeCache();
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(loadColorScheme()).rejects.toThrow(
        'Failed to load color scheme: 500 Internal Server Error',
      );
    });

    it('returns cached data on second call without re-fetching', async () => {
      mockFetch.mockReset();

      const result = await loadColorScheme();

      expect(result).toEqual(colorSchemeJson);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('createMatchColorExpression without cache', () => {
    it('returns literal default color when cache is null', () => {
      clearColorSchemeCache();

      const expr = createMatchColorExpression();

      expect(expr).toEqual(['literal', '#cccccc']);
    });
  });
});
