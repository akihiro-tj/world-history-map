import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type ManifestSnapshot = Record<string, string>;

export interface BucketObject {
  readonly key: string;
}

export interface RunGcOptions {
  readonly retained: ReadonlySet<string>;
  readonly bucketObjects: readonly BucketObject[];
  readonly dryRun: boolean;
  readonly deleteObject: (key: string) => Promise<void>;
}

export interface GcSummary {
  readonly retained: number;
  readonly deleted: number;
  readonly candidates: readonly string[];
}

export function computeRetainedHashes(snapshots: readonly ManifestSnapshot[]): Set<string> {
  const retained = new Set<string>();
  for (const snapshot of snapshots) {
    for (const filename of Object.values(snapshot)) {
      retained.add(filename);
    }
  }
  return retained;
}

export function computeDeletionCandidates(
  retained: ReadonlySet<string>,
  bucketObjects: readonly BucketObject[],
): string[] {
  return bucketObjects.filter((obj) => !retained.has(obj.key)).map((obj) => obj.key);
}

export async function runGc(options: RunGcOptions): Promise<GcSummary> {
  const { retained, bucketObjects, dryRun, deleteObject } = options;
  const candidates = computeDeletionCandidates(retained, bucketObjects);

  if (!dryRun) {
    for (const key of candidates) {
      await deleteObject(key);
    }
  }

  return {
    retained: retained.size,
    deleted: dryRun ? 0 : candidates.length,
    candidates,
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
