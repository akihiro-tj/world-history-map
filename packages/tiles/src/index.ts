import { manifest } from './manifest.ts';
import type { HistoricalYearString, Manifest } from './types.ts';

export type { Manifest };
export { manifest };

export const availableYears: readonly HistoricalYearString[] = (
  Object.keys(manifest) as HistoricalYearString[]
).sort((a, b) => Number(a) - Number(b));

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getTilesUrl(year: HistoricalYearString, baseUrl: string): string | null {
  const filename = (manifest as Record<string, string>)[year];
  if (!filename) return null;

  const base = stripTrailingSlashes(baseUrl);
  if (base) {
    return `pmtiles://${base}/${filename}`;
  }
  return `pmtiles:///pmtiles/${filename}`;
}
