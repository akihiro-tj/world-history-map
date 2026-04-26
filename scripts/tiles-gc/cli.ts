import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HashedFilename } from '@world-history-map/tiles';
import type { BucketName } from './src/bucket-name.ts';
import { computeDeletionCandidates, computeRetainedHashes } from './src/gc.ts';
import { type GcExecution, gcExecutionFor } from './src/gc-execution.ts';
import { GitManifestHistoryRepository } from './src/manifest-history.ts';
import { type R2BucketRepository, WranglerR2BucketRepository } from './src/r2-bucket.ts';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const DRY_RUN = process.env['DRY_RUN'] !== 'false';
const WINDOW_SIZE = Number(process.env['WINDOW_SIZE'] ?? '3');
const TARGET_ENV = process.env['TARGET_ENV'] ?? 'both';

const BUCKETS: Record<string, string[]> = {
  dev: ['world-history-map-tiles-dev'],
  prod: ['world-history-map-tiles-prod'],
  both: ['world-history-map-tiles-dev', 'world-history-map-tiles-prod'],
};

async function runGcForBucket(
  bucket: BucketName,
  retained: ReadonlySet<HashedFilename>,
  r2Repo: R2BucketRepository,
  gcExecution: GcExecution,
): Promise<void> {
  const bucketObjects = await r2Repo.listObjects(bucket);
  const plan = computeDeletionCandidates(retained, bucketObjects);
  const result = await gcExecution.execute(bucket, plan);

  console.log(`\nBucket: ${bucket}`);
  console.log(`  Retained: ${retained.size} hashes referenced in window`);
  console.log(`  Candidates: ${plan.size}`);
  for (const key of plan.candidates()) {
    console.log(`    ${result.mode === 'dry-run' ? '[DRY RUN] would delete' : 'deleted'}: ${key}`);
  }
  if (result.mode === 'live') {
    console.log(`  Deleted: ${result.deleted}`);
  }
}

async function main(): Promise<void> {
  const targets = BUCKETS[TARGET_ENV] ?? (BUCKETS['both'] as string[]);
  console.log(`Tiles GC — dry_run=${DRY_RUN}, window_size=${WINDOW_SIZE}, target=${TARGET_ENV}`);

  const historyRepo = new GitManifestHistoryRepository(REPO_ROOT);
  const r2Repo = new WranglerR2BucketRepository(REPO_ROOT);
  const snapshots = await historyRepo.recentSnapshots(WINDOW_SIZE);
  const retained = computeRetainedHashes(snapshots);
  console.log(`\nRetained hashes from last ${WINDOW_SIZE} manifest commits: ${retained.size}`);

  const gcExecution = gcExecutionFor(DRY_RUN, r2Repo);
  for (const bucket of targets) {
    await runGcForBucket(bucket as BucketName, retained, r2Repo, gcExecution);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
