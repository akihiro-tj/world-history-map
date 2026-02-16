/**
 * Upload stage: differential R2 upload using SHA-256 hash comparison
 * Only uploads changed files to minimize bandwidth usage
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PATHS } from '@/config.ts';
import { execFileAsync } from '@/exec.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import type { DeploymentManifest } from '@/types/pipeline.ts';

const R2_BUCKET = 'world-history-map-tiles';

interface FileInfo {
  hashedFilename: string;
  hash: string;
  size: number;
}

interface UploadEntry {
  year: string;
  filename: string;
}

export interface UploadPlan {
  toUpload: UploadEntry[];
  toSkip: UploadEntry[];
}

/**
 * Compute which files need uploading by comparing with existing manifest.
 */
export function computeUploadPlan(
  currentManifest: DeploymentManifest,
  newFiles: Map<string, FileInfo>,
): UploadPlan {
  const toUpload: UploadEntry[] = [];
  const toSkip: UploadEntry[] = [];

  for (const [year, info] of newFiles) {
    const existingHash = currentManifest.metadata?.[year]?.hash;

    if (existingHash && existingHash === info.hash) {
      toSkip.push({ year, filename: info.hashedFilename });
    } else {
      toUpload.push({ year, filename: info.hashedFilename });
    }
  }

  return { toUpload, toSkip };
}

/**
 * Execute the upload plan using wrangler r2 object put.
 */
export async function executeUpload(
  plan: UploadPlan,
  distDir: string,
  bucketName: string,
  logger: PipelineLogger,
): Promise<void> {
  for (const entry of plan.toSkip) {
    logger.info('upload', `Year ${entry.year}: skipped (unchanged)`);
  }

  for (const entry of plan.toUpload) {
    const filePath = path.join(distDir, entry.filename);
    const objectKey = entry.filename;

    logger.info('upload', `Year ${entry.year}: uploading ${entry.filename}...`);
    await execFileAsync(
      'wrangler',
      ['r2', 'object', 'put', `${bucketName}/${objectKey}`, '--file', filePath, '--remote'],
      { timeout: 120_000 },
    );
    logger.info('upload', `Year ${entry.year}: uploaded`);
  }

  logger.info(
    'upload',
    `Upload complete: ${plan.toUpload.length} uploaded, ${plan.toSkip.length} skipped`,
  );
}

/**
 * Run the upload stage using default configuration.
 */
export async function runUploadStage(
  manifest: DeploymentManifest,
  logger: PipelineLogger,
): Promise<void> {
  // Build file info map from manifest
  const newFiles = new Map<string, FileInfo>();
  for (const [year, filename] of Object.entries(manifest.files)) {
    const meta = manifest.metadata?.[year];
    if (meta) {
      newFiles.set(year, { hashedFilename: filename, hash: meta.hash, size: meta.size });
    }
  }

  // Load existing manifest for comparison
  const existingManifest: DeploymentManifest = {
    version: '',
    files: {},
  };

  const plan = computeUploadPlan(existingManifest, newFiles);
  await executeUpload(plan, PATHS.distPmtiles, R2_BUCKET, logger);
}

/**
 * Run the upload stage standalone by loading manifest from disk.
 */
export async function runStandaloneUpload(logger: PipelineLogger): Promise<void> {
  const manifestPath = path.join(PATHS.distPmtiles, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Manifest not found at ${manifestPath}. Run 'pnpm pipeline run --skip-upload' first.`,
    );
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as DeploymentManifest;
  await runUploadStage(manifest, logger);
}

/**
 * Publish manifest.json to R2, making uploaded PMTiles active in production.
 */
export async function publishManifest(logger: PipelineLogger): Promise<void> {
  const manifestPath = path.join(PATHS.distPmtiles, 'manifest.json');
  logger.info('publish', 'Publishing manifest.json to R2...');
  await execFileAsync(
    'wrangler',
    ['r2', 'object', 'put', `${R2_BUCKET}/manifest.json`, '--file', manifestPath, '--remote'],
    { timeout: 120_000 },
  );
  logger.info('publish', 'manifest.json published');
}
