import { describe, expect, it, vi } from 'vitest';
import { type BucketObject, computeDeletionCandidates, computeRetainedHashes } from './gc.ts';

// T048: 保持集合計算のテスト
describe('computeRetainedHashes', () => {
  it('returns union of hashed filenames from all manifest snapshots', () => {
    const snapshots = [
      { '1600': 'world_1600.aaa111.pmtiles', '1700': 'world_1700.bbb222.pmtiles' },
      { '1600': 'world_1600.ccc333.pmtiles', '1700': 'world_1700.bbb222.pmtiles' },
    ];
    const retained = computeRetainedHashes(snapshots);
    expect(retained).toContain('world_1600.aaa111.pmtiles');
    expect(retained).toContain('world_1600.ccc333.pmtiles');
    expect(retained).toContain('world_1700.bbb222.pmtiles');
    expect(retained.size).toBe(3);
  });

  it('returns empty set when no snapshots are provided', () => {
    expect(computeRetainedHashes([]).size).toBe(0);
  });

  it('handles a single snapshot', () => {
    const snapshots = [{ '1600': 'world_1600.abc123.pmtiles' }];
    const retained = computeRetainedHashes(snapshots);
    expect(retained).toContain('world_1600.abc123.pmtiles');
    expect(retained.size).toBe(1);
  });

  it('deduplicates the same filename across snapshots', () => {
    const snapshots = [
      { '1600': 'world_1600.same.pmtiles' },
      { '1600': 'world_1600.same.pmtiles' },
      { '1600': 'world_1600.same.pmtiles' },
    ];
    expect(computeRetainedHashes(snapshots).size).toBe(1);
  });
});

// T049: 削除候補計算のテスト
describe('computeDeletionCandidates', () => {
  it('returns objects not in the retained set', () => {
    const retained = new Set(['world_1600.aaa111.pmtiles', 'world_1700.bbb222.pmtiles']);
    const bucketObjects: BucketObject[] = [
      { key: 'world_1600.aaa111.pmtiles' },
      { key: 'world_1600.old000.pmtiles' },
      { key: 'world_1700.bbb222.pmtiles' },
      { key: 'world_1900.orphan.pmtiles' },
    ];
    const candidates = computeDeletionCandidates(retained, bucketObjects);
    expect(candidates).toContain('world_1600.old000.pmtiles');
    expect(candidates).toContain('world_1900.orphan.pmtiles');
    expect(candidates).not.toContain('world_1600.aaa111.pmtiles');
    expect(candidates).not.toContain('world_1700.bbb222.pmtiles');
  });

  it('returns empty array when all objects are retained', () => {
    const retained = new Set(['world_1600.aaa.pmtiles']);
    const bucketObjects: BucketObject[] = [{ key: 'world_1600.aaa.pmtiles' }];
    expect(computeDeletionCandidates(retained, bucketObjects)).toHaveLength(0);
  });

  it('returns all objects when retained set is empty', () => {
    const retained = new Set<string>();
    const bucketObjects: BucketObject[] = [
      { key: 'world_1600.aaa.pmtiles' },
      { key: 'world_1700.bbb.pmtiles' },
    ];
    expect(computeDeletionCandidates(retained, bucketObjects)).toHaveLength(2);
  });
});

// T050: dry-run では delete が呼ばれないことのテスト
describe('dry-run mode', () => {
  it('does not invoke the delete function in dry-run mode', async () => {
    const { runGc } = await import('./gc.ts');
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    await runGc({
      retained: new Set(['world_1600.current.pmtiles']),
      bucketObjects: [{ key: 'world_1600.orphan.pmtiles' }],
      dryRun: true,
      deleteObject: mockDelete,
    });

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('invokes the delete function in non-dry-run mode', async () => {
    const { runGc } = await import('./gc.ts');
    const mockDelete = vi.fn().mockResolvedValue(undefined);

    await runGc({
      retained: new Set(['world_1600.current.pmtiles']),
      bucketObjects: [{ key: 'world_1600.orphan.pmtiles' }],
      dryRun: false,
      deleteObject: mockDelete,
    });

    expect(mockDelete).toHaveBeenCalledWith('world_1600.orphan.pmtiles');
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});

// T051: N 境界値テスト
describe('window size boundary conditions', () => {
  it('N=1: retains only the single most recent manifest', () => {
    const snapshots = [{ '1600': 'world_1600.newest.pmtiles' }];
    const retained = computeRetainedHashes(snapshots);
    expect(retained).toContain('world_1600.newest.pmtiles');
    expect(retained.size).toBe(1);
  });

  it('N=3: retains hashes from exactly 3 snapshots', () => {
    const snapshots = [
      { '1600': 'world_1600.v3.pmtiles' },
      { '1600': 'world_1600.v2.pmtiles' },
      { '1600': 'world_1600.v1.pmtiles' },
    ];
    const retained = computeRetainedHashes(snapshots);
    expect(retained.size).toBe(3);
    expect(retained).toContain('world_1600.v1.pmtiles');
    expect(retained).toContain('world_1600.v3.pmtiles');
  });

  it('N=10: retains hashes from 10 snapshots without duplication issues', () => {
    const snapshots = Array.from({ length: 10 }, (_, i) => ({
      '1600': `world_1600.v${i.toString().padStart(2, '0')}.pmtiles`,
    }));
    const retained = computeRetainedHashes(snapshots);
    expect(retained.size).toBe(10);
  });

  it('N exceeds history: returns all available snapshots without error', () => {
    const snapshots = [{ '1600': 'world_1600.only.pmtiles' }];
    const retained = computeRetainedHashes(snapshots);
    expect(retained.size).toBe(1);
  });
});
