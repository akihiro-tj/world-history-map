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

export async function runUploadStage(
  manifest: DeploymentManifest,
  logger: PipelineLogger,
): Promise<void> {
  const newFiles = new Map<string, FileInfo>();
  for (const [year, filename] of Object.entries(manifest.files)) {
    const meta = manifest.metadata?.[year];
    if (meta) {
      newFiles.set(year, { hashedFilename: filename, hash: meta.hash, size: meta.size });
    }
  }

  const existingManifest: DeploymentManifest = {
    version: '',
    files: {},
  };

  const plan = computeUploadPlan(existingManifest, newFiles);
  await executeUpload(plan, PATHS.distPmtiles, R2_BUCKET, logger);
}

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
