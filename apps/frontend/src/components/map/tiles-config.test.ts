import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistoricalYear } from '../../domain/year/historical-year';

vi.mock('@world-history-map/tiles', () => ({
  getTilesUrl: vi.fn((year: string, baseUrl: string): string | null => {
    if (year === '1700')
      return baseUrl
        ? `pmtiles://${baseUrl}/world_1700.abc123def456.pmtiles`
        : 'pmtiles:///pmtiles/world_1700.abc123def456.pmtiles';
    return null;
  }),
  manifest: { '1700': 'world_1700.abc123def456.pmtiles' } as const,
  availableYears: ['1700'],
}));

const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  vi.stubEnv('VITE_TILES_BASE_URL', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  mockFetch.mockReset();
});

async function importFresh() {
  return import('./tiles-config') as Promise<typeof import('./tiles-config')>;
}

describe('tiles-config', () => {
  describe('getTilesUrl', () => {
    it('returns a pmtiles URL for a known year in production mode', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com');
      const { getTilesUrl } = await importFresh();

      const url = getTilesUrl(createHistoricalYear(1700));

      expect(url).toBe('pmtiles://https://tiles.example.com/world_1700.abc123def456.pmtiles');
    });

    it('returns a /pmtiles/ relative URL in dev mode (empty base URL)', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', '');
      const { getTilesUrl } = await importFresh();

      const url = getTilesUrl(createHistoricalYear(1700));

      expect(url).toBe('pmtiles:///pmtiles/world_1700.abc123def456.pmtiles');
    });

    it('returns null for a year not present in the manifest', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com');
      const { getTilesUrl } = await importFresh();

      expect(getTilesUrl(createHistoricalYear(9999))).toBeNull();
    });

    it('normalizes trailing slashes in the base URL', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com///');
      const { getTilesUrl } = await importFresh();

      const url = getTilesUrl(createHistoricalYear(1700));

      expect(url).toBe('pmtiles://https://tiles.example.com/world_1700.abc123def456.pmtiles');
    });

    it('does not fetch manifest.json at runtime', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com');
      const { getTilesUrl } = await importFresh();

      getTilesUrl(createHistoricalYear(1700));

      const manifestFetches = mockFetch.mock.calls.filter(
        ([url]: [string]) => typeof url === 'string' && url.includes('manifest.json'),
      );
      expect(manifestFetches).toHaveLength(0);
    });

    it('delegates to the tiles package getTilesUrl with the year string and base URL', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com');
      const { getTilesUrl } = await importFresh();
      const { getTilesUrl: packageGetTilesUrl } = await import('@world-history-map/tiles');

      getTilesUrl(createHistoricalYear(1700));

      expect(packageGetTilesUrl).toHaveBeenCalledWith('1700', 'https://tiles.example.com');
    });
  });
});
