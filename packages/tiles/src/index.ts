import { TilesManifest } from './manifest/tiles-manifest.ts';
import { manifest } from './manifest.ts';
import { asHistoricalYearString, type HistoricalYearString, type Manifest } from './types.ts';
import { resolverFor } from './url/tiles-url-resolver.ts';

export type { Manifest };
export { manifest };

const tilesManifest = TilesManifest.fromRecord(manifest);

export const availableYears: readonly HistoricalYearString[] = tilesManifest.availableYears();

export function getTilesUrl(year: string, baseUrl: string): string | null {
  const filename = tilesManifest.filenameFor(asHistoricalYearString(year));
  if (!filename) return null;
  return resolverFor(baseUrl).resolve(filename);
}
