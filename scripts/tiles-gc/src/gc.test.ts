import { asHashedFilename, type HashedFilename, TilesManifest } from '@world-history-map/tiles';
import { describe, expect, it, vi } from 'vitest';
import { DEV_BUCKET } from './bucket-name.ts';
import { DeletionPlan } from './deletion-plan.ts';
import {
  computeDeletionCandidates,
  computeRetainedHashes,
  extractHashedTileFilenames,
} from './gc.ts';
import { DryRunGcExecution, LiveGcExecution } from './gc-execution.ts';
import type { R2ObjectDeleter } from './r2-object-deleter.ts';

describe('computeRetainedHashes', () => {
  it('returns union of hashed filenames from all manifest snapshots', () => {
    const snapshots = [
      TilesManifest.fromRecord({
        '1600': 'world_1600.aaa111.pmtiles',
        '1700': 'world_1700.bbb222.pmtiles',
      }),
      TilesManifest.fromRecord({
        '1600': 'world_1600.ccc333.pmtiles',
        '1700': 'world_1700.bbb222.pmtiles',
      }),
    ];
    const retained = computeRetainedHashes(snapshots);
    expect(retained.has(asHashedFilename('world_1600.aaa111.pmtiles'))).toBe(true);
    expect(retained.has(asHashedFilename('world_1600.ccc333.pmtiles'))).toBe(true);
    expect(retained.has(asHashedFilename('world_1700.bbb222.pmtiles'))).toBe(true);
    expect(retained.size).toBe(3);
  });

  it('returns empty set when no snapshots are provided', () => {
    expect(computeRetainedHashes([]).size).toBe(0);
  });

  it('handles a single snapshot', () => {
    const snapshots = [TilesManifest.fromRecord({ '1600': 'world_1600.abc123.pmtiles' })];
    const retained = computeRetainedHashes(snapshots);
    expect(retained.has(asHashedFilename('world_1600.abc123.pmtiles'))).toBe(true);
    expect(retained.size).toBe(1);
  });

  it('deduplicates the same filename across snapshots', () => {
    const snapshots = [
      TilesManifest.fromRecord({ '1600': 'world_1600.same.pmtiles' }),
      TilesManifest.fromRecord({ '1600': 'world_1600.same.pmtiles' }),
      TilesManifest.fromRecord({ '1600': 'world_1600.same.pmtiles' }),
    ];
    expect(computeRetainedHashes(snapshots).size).toBe(1);
  });
});

describe('computeDeletionCandidates', () => {
  it('returns objects not in the retained set', () => {
    const retained = new Set([
      asHashedFilename('world_1600.aaa111.pmtiles'),
      asHashedFilename('world_1700.bbb222.pmtiles'),
    ]);
    const bucketObjects: HashedFilename[] = [
      asHashedFilename('world_1600.aaa111.pmtiles'),
      asHashedFilename('world_1600.old000.pmtiles'),
      asHashedFilename('world_1700.bbb222.pmtiles'),
      asHashedFilename('world_1900.orphan.pmtiles'),
    ];
    const plan = computeDeletionCandidates(retained, bucketObjects);
    const candidates = plan.candidates();
    expect(candidates).toContain(asHashedFilename('world_1600.old000.pmtiles'));
    expect(candidates).toContain(asHashedFilename('world_1900.orphan.pmtiles'));
    expect(candidates).not.toContain(asHashedFilename('world_1600.aaa111.pmtiles'));
    expect(candidates).not.toContain(asHashedFilename('world_1700.bbb222.pmtiles'));
  });

  it('returns empty plan when all objects are retained', () => {
    const retained = new Set([asHashedFilename('world_1600.aaa.pmtiles')]);
    const bucketObjects: HashedFilename[] = [asHashedFilename('world_1600.aaa.pmtiles')];
    expect(computeDeletionCandidates(retained, bucketObjects).size).toBe(0);
  });

  it('returns all objects when retained set is empty', () => {
    const retained = new Set<HashedFilename>();
    const bucketObjects: HashedFilename[] = [
      asHashedFilename('world_1600.aaa.pmtiles'),
      asHashedFilename('world_1700.bbb.pmtiles'),
    ];
    expect(computeDeletionCandidates(retained, bucketObjects).size).toBe(2);
  });
});

describe('extractHashedTileFilenames', () => {
  it('returns only keys that match the hashed tile pattern', () => {
    const keys = [
      'world_1600.fedcba987654.pmtiles',
      'readme.txt',
      'world_1700.pmtiles',
      'world_1800.aabbcc112233.pmtiles',
    ];
    const result = extractHashedTileFilenames(keys);
    expect(result).toHaveLength(2);
    expect(result).toContain('world_1600.fedcba987654.pmtiles');
    expect(result).toContain('world_1800.aabbcc112233.pmtiles');
  });

  it('returns empty array when no keys match', () => {
    expect(extractHashedTileFilenames(['readme.txt', 'world_1600.pmtiles'])).toHaveLength(0);
  });
});

describe('DryRunGcExecution', () => {
  it('returns deleted=0 and mode=dry-run without deleting', async () => {
    const execution = new DryRunGcExecution();
    const plan = DeletionPlan.fromCandidates([asHashedFilename('world_1600.orphan.pmtiles')]);

    const result = await execution.execute(DEV_BUCKET, plan);

    expect(result.deleted).toBe(0);
    expect(result.mode).toBe('dry-run');
  });
});

describe('LiveGcExecution', () => {
  it('calls delete for each candidate and returns deleted count', async () => {
    const mockObjectDeleter: R2ObjectDeleter = {
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const execution = new LiveGcExecution(mockObjectDeleter);
    const orphanKey = asHashedFilename('world_1600.orphan.pmtiles');
    const plan = DeletionPlan.fromCandidates([orphanKey]);

    const result = await execution.execute(DEV_BUCKET, plan);

    expect(mockObjectDeleter.delete).toHaveBeenCalledWith(DEV_BUCKET, orphanKey);
    expect(mockObjectDeleter.delete).toHaveBeenCalledTimes(1);
    expect(result.deleted).toBe(1);
    expect(result.mode).toBe('live');
  });
});

describe('window size boundary conditions', () => {
  it('N=1: retains only the single most recent manifest', () => {
    const snapshots = [TilesManifest.fromRecord({ '1600': 'world_1600.newest.pmtiles' })];
    const retained = computeRetainedHashes(snapshots);
    expect(retained.has(asHashedFilename('world_1600.newest.pmtiles'))).toBe(true);
    expect(retained.size).toBe(1);
  });

  it('N=3: retains hashes from exactly 3 snapshots', () => {
    const snapshots = [
      TilesManifest.fromRecord({ '1600': 'world_1600.v3.pmtiles' }),
      TilesManifest.fromRecord({ '1600': 'world_1600.v2.pmtiles' }),
      TilesManifest.fromRecord({ '1600': 'world_1600.v1.pmtiles' }),
    ];
    const retained = computeRetainedHashes(snapshots);
    expect(retained.size).toBe(3);
    expect(retained.has(asHashedFilename('world_1600.v1.pmtiles'))).toBe(true);
    expect(retained.has(asHashedFilename('world_1600.v3.pmtiles'))).toBe(true);
  });

  it('N=10: retains hashes from 10 snapshots without duplication issues', () => {
    const snapshots = Array.from({ length: 10 }, (_, i) =>
      TilesManifest.fromRecord({ '1600': `world_1600.v${i.toString().padStart(2, '0')}.pmtiles` }),
    );
    const retained = computeRetainedHashes(snapshots);
    expect(retained.size).toBe(10);
  });

  it('N exceeds history: returns all available snapshots without error', () => {
    const snapshots = [TilesManifest.fromRecord({ '1600': 'world_1600.only.pmtiles' })];
    const retained = computeRetainedHashes(snapshots);
    expect(retained.size).toBe(1);
  });
});
