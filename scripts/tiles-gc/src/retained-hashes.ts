import type { HashedFilename, TilesManifest } from '@world-history-map/tiles';
import { DeletionPlan } from './deletion-plan.ts';

export class RetainedHashes {
  readonly #hashes: ReadonlySet<HashedFilename>;

  private constructor(hashes: ReadonlySet<HashedFilename>) {
    this.#hashes = hashes;
  }

  static fromSnapshots(snapshots: readonly TilesManifest[]): RetainedHashes {
    const hashes = new Set<HashedFilename>();
    for (const manifest of snapshots) {
      for (const year of manifest.availableYears()) {
        const filename = manifest.filenameFor(year);
        if (filename) hashes.add(filename);
      }
    }
    return new RetainedHashes(hashes);
  }

  get size(): number {
    return this.#hashes.size;
  }

  has(hash: HashedFilename): boolean {
    return this.#hashes.has(hash);
  }

  difference(candidates: readonly HashedFilename[]): DeletionPlan {
    const orphans = candidates.filter((key) => !this.#hashes.has(key));
    return DeletionPlan.fromCandidates(orphans);
  }
}
