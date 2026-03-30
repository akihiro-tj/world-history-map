import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistoricalYear } from '../../domain/year/historical-year';
import type { TilesManifest } from './tiles-config';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubEnv('VITE_TILES_BASE_URL', '');
  global.fetch = mockFetch;
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
  describe('loadTilesManifest', () => {
    it('returns dev manifest when VITE_TILES_BASE_URL is not set', async () => {
      const { loadTilesManifest } = await importFresh();

      const manifest = await loadTilesManifest();

      expect(manifest.version).toBe('development');
      expect(manifest.files).toEqual({});
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fetches manifest from production URL', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: '1.0.0',
            files: { '1700': 'world_1700_abc123.pmtiles' },
          }),
      });

      const { loadTilesManifest } = await importFresh();
      const manifest = await loadTilesManifest();

      expect(mockFetch).toHaveBeenCalledWith('https://tiles.example.com/manifest.json');
      expect(manifest.version).toBe('1.0.0');
    });

    it('throws on fetch failure', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com');
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const { loadTilesManifest } = await importFresh();

      await expect(loadTilesManifest()).rejects.toThrow('Failed to load tiles manifest: 404');
    });

    it('returns cached manifest on second call', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '1.0.0', files: {} }),
      });

      const { loadTilesManifest } = await importFresh();
      await loadTilesManifest();
      await loadTilesManifest();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('strips trailing slashes from base URL', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com///');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '1.0.0', files: {} }),
      });

      const { loadTilesManifest } = await importFresh();
      await loadTilesManifest();

      expect(mockFetch).toHaveBeenCalledWith('https://tiles.example.com/manifest.json');
    });
  });

  describe('getTilesUrl', () => {
    it('returns local pmtiles path in dev mode', async () => {
      const { getTilesUrl } = await importFresh();
      const manifest: TilesManifest = { version: 'development', files: {} };

      const url = getTilesUrl(createHistoricalYear(1700), manifest);

      expect(url).toBe('pmtiles:///pmtiles/world_1700.pmtiles');
    });

    it('returns production URL with hashed filename', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com');
      const { getTilesUrl } = await importFresh();
      const manifest: TilesManifest = {
        version: '1.0.0',
        files: { '1700': 'world_1700_abc123.pmtiles' },
      };

      const url = getTilesUrl(createHistoricalYear(1700), manifest);

      expect(url).toBe('pmtiles://https://tiles.example.com/world_1700_abc123.pmtiles');
    });

    it('returns null when year is not in manifest', async () => {
      vi.stubEnv('VITE_TILES_BASE_URL', 'https://tiles.example.com');
      const { getTilesUrl } = await importFresh();
      const manifest: TilesManifest = { version: '1.0.0', files: {} };

      const url = getTilesUrl(createHistoricalYear(9999), manifest);

      expect(url).toBeNull();
    });
  });
});
