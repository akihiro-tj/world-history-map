import {
  type HashedFilename,
  HashedTileFilename,
  type TilesManifest,
} from '@world-history-map/tiles';
import { DeletionPlan } from './deletion-plan.ts';

export function computeRetainedHashes(
  snapshots: readonly TilesManifest[],
): ReadonlySet<HashedFilename> {
  const retained = new Set<HashedFilename>();
  for (const manifest of snapshots) {
    for (const year of manifest.availableYears()) {
      const filename = manifest.filenameFor(year);
      if (filename) {
        retained.add(filename);
      }
    }
  }
  return retained;
}

export function computeDeletionCandidates(
  retained: ReadonlySet<HashedFilename>,
  bucketObjects: readonly HashedFilename[],
): DeletionPlan {
  const candidates = bucketObjects.filter((key) => !retained.has(key));
  return DeletionPlan.fromCandidates(candidates);
}

export function extractHashedTileFilenames(keys: readonly string[]): readonly HashedFilename[] {
  return HashedTileFilename.parseAll(keys).map((tile) => tile.toString());
}
