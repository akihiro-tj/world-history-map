import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { asHashedFilename, type HashedFilename } from '@world-history-map/tiles';
import { computeRetainedHashes, runGc } from './src/gc.ts';
import { GitManifestHistoryRepository } from './src/manifest-history.ts';

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const DRY_RUN = process.env['DRY_RUN'] !== 'false';
const WINDOW_SIZE = Number(process.env['WINDOW_SIZE'] ?? '3');
const TARGET_ENV = process.env['TARGET_ENV'] ?? 'both';

const BUCKETS: Record<string, string[]> = {
  dev: ['world-history-map-tiles-dev'],
  prod: ['world-history-map-tiles-prod'],
  both: ['world-history-map-tiles-dev', 'world-history-map-tiles-prod'],
};

async function listBucketObjects(bucket: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'wrangler',
      ['r2', 'object', 'list', bucket, '--remote', '--json'],
      { cwd: REPO_ROOT },
    );
    const parsed = JSON.parse(stdout) as { key: string }[];
    return parsed.map((obj) => obj.key);
  } catch {
    console.warn(`Warning: could not list objects in ${bucket}. Skipping.`);
    return [];
  }
}

async function deleteObject(bucket: string, key: string): Promise<void> {
  await execFileAsync('wrangler', ['r2', 'object', 'delete', `${bucket}/${key}`, '--remote'], {
    cwd: REPO_ROOT,
  });
}

async function runGcForBucket(
  bucket: string,
  retained: ReadonlySet<HashedFilename>,
): Promise<void> {
  const keys = await listBucketObjects(bucket);
  const bucketObjects: HashedFilename[] = keys.map((key) => asHashedFilename(key));

  const summary = await runGc({
    retained,
    bucketObjects,
    dryRun: DRY_RUN,
    deleteObject: (key) => deleteObject(bucket, key),
  });

  console.log(`\nBucket: ${bucket}`);
  console.log(`  Retained: ${summary.retained} hashes referenced in window`);
  console.log(`  Candidates: ${summary.candidates.length}`);
  for (const key of summary.candidates) {
    console.log(`    ${DRY_RUN ? '[DRY RUN] would delete' : 'deleted'}: ${key}`);
  }
  if (!DRY_RUN) {
    console.log(`  Deleted: ${summary.deleted}`);
  }
}

async function main(): Promise<void> {
  const targets = BUCKETS[TARGET_ENV] ?? (BUCKETS['both'] as string[]);
  console.log(`Tiles GC — dry_run=${DRY_RUN}, window_size=${WINDOW_SIZE}, target=${TARGET_ENV}`);

  const historyRepo = new GitManifestHistoryRepository(REPO_ROOT);
  const snapshots = await historyRepo.recentSnapshots(WINDOW_SIZE);
  const retained = computeRetainedHashes(snapshots);
  console.log(`\nRetained hashes from last ${WINDOW_SIZE} manifest commits: ${retained.size}`);

  for (const bucket of targets) {
    await runGcForBucket(bucket, retained);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
