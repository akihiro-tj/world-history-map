import { CachedFetcher } from '../lib/cached-fetcher';
import type { HistoricalYear } from '../types/historical-year';

export interface TilesManifest {
  version: string;
  files: Record<string, string>;
}

const DEV_MANIFEST: TilesManifest = {
  version: 'development',
  files: {},
};

function getTilesBaseUrl(): string {
  const url = import.meta.env.VITE_TILES_BASE_URL || '';
  // Remove trailing slash to avoid double slashes in URLs
  return url.replace(/\/+$/, '');
}

function isProductionTiles(): boolean {
  return !!import.meta.env.VITE_TILES_BASE_URL;
}

const tilesManifestFetcher = new CachedFetcher<TilesManifest>({
  async fetch() {
    if (!isProductionTiles()) {
      return DEV_MANIFEST;
    }

    const baseUrl = getTilesBaseUrl();
    const response = await fetch(`${baseUrl}/manifest.json`);

    if (!response.ok) {
      throw new Error(`Failed to load tiles manifest: ${response.status}`);
    }

    return (await response.json()) as TilesManifest;
  },
});

export async function loadTilesManifest(): Promise<TilesManifest> {
  return tilesManifestFetcher.load();
}

function getTilesFilename(year: HistoricalYear, manifest: TilesManifest): string | null {
  if (!isProductionTiles()) {
    return `world_${year}.pmtiles`;
  }

  const filename = manifest.files[String(year)];
  return filename || null;
}

export function getTilesUrl(year: HistoricalYear, manifest: TilesManifest): string | null {
  const filename = getTilesFilename(year, manifest);
  if (!filename) {
    return null;
  }

  const baseUrl = getTilesBaseUrl();
  if (baseUrl) {
    return `pmtiles://${baseUrl}/${filename}`;
  }

  return `pmtiles:///pmtiles/${filename}`;
}
