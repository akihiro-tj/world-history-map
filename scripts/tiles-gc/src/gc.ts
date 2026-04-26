import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { HashedFilename, TilesManifest } from '@world-history-map/tiles';
import { DeletionPlan } from './deletion-plan.ts';

const execFileAsync = promisify(execFile);

export type ManifestSnapshot = Record<string, string>;

export interface RunGcOptions {
  readonly retained: ReadonlySet<HashedFilename>;
  readonly bucketObjects: readonly HashedFilename[];
  readonly dryRun: boolean;
  readonly deleteObject: (key: HashedFilename) => Promise<void>;
}

export interface GcSummary {
  readonly retained: number;
  readonly deleted: number;
  readonly candidates: readonly HashedFilename[];
}

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

export async function runGc(options: RunGcOptions): Promise<GcSummary> {
  const { retained, bucketObjects, dryRun, deleteObject } = options;
  const plan = computeDeletionCandidates(retained, bucketObjects);

  if (!dryRun) {
    for (const key of plan.candidates()) {
      await deleteObject(key);
    }
  }

  return {
    retained: retained.size,
    deleted: dryRun ? 0 : plan.size,
    candidates: plan.candidates(),
  };
}

export async function parseManifestSnapshot(
  commitHash: string,
  repoRoot: string,
): Promise<ManifestSnapshot> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['show', `${commitHash}:packages/tiles/src/manifest.ts`],
      { cwd: repoRoot },
    );
    const matches = [...stdout.matchAll(/'([^']+)':\s*'(world_[^']+\.pmtiles)'/g)];
    return Object.fromEntries(matches.map(([, year, filename]) => [year, filename]));
  } catch {
    return {};
  }
}

export async function collectManifestSnapshots(
  windowSize: number,
  repoRoot: string,
): Promise<ManifestSnapshot[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['log', `-n`, String(windowSize), '--format=%H', '--', 'packages/tiles/src/manifest.ts'],
    { cwd: repoRoot },
  );
  const commits = stdout.trim().split('\n').filter(Boolean);
  return Promise.all(commits.map((hash) => parseManifestSnapshot(hash, repoRoot)));
}
