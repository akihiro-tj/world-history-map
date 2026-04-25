import { TilesManifest } from './manifest/tiles-manifest.ts';
import { manifest } from './manifest.ts';
import type { HistoricalYearString, Manifest } from './types.ts';

export type { Manifest };
export { manifest };

const tilesManifest = TilesManifest.fromRecord(manifest);

export const availableYears: readonly HistoricalYearString[] = tilesManifest.availableYears();

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getTilesUrl(year: string, baseUrl: string): string | null {
  const filename = (manifest as Record<string, string>)[year];
  if (!filename) return null;

  const base = stripTrailingSlashes(baseUrl);
  if (base) {
    return `pmtiles://${base}/${filename}`;
  }
  return `pmtiles:///pmtiles/${filename}`;
}
