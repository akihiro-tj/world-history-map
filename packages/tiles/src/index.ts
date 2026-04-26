import { HashedTileFilename } from './manifest/hashed-tile-filename.ts';
import { TilesManifest } from './manifest/tiles-manifest.ts';
import { manifest } from './manifest.ts';
import {
  asHashedFilename,
  asHistoricalYearString,
  type HashedFilename,
  type HistoricalYearString,
  type Manifest,
} from './types.ts';
import { resolverFor } from './url/tiles-url-resolver.ts';

export type { HashedFilename, HistoricalYearString, Manifest };
export { asHashedFilename, asHistoricalYearString, HashedTileFilename, manifest, TilesManifest };

const tilesManifest = TilesManifest.fromRecord(manifest);

export const availableYears: readonly HistoricalYearString[] = tilesManifest.availableYears();

export function getTilesUrl(year: string, baseUrl: string): string | null {
  const filename = tilesManifest.filenameFor(asHistoricalYearString(year));
  if (!filename) return null;
  return resolverFor(baseUrl).resolve(filename);
}
