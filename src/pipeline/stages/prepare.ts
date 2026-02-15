/**
 * Prepare stage: SHA-256 hash + copy to dist with hashed filename
 * Generates deployment-ready PMTiles with content-based cache busting
 */
import { copyFileSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PATHS, yearToHashedPmtilesFilename } from '@/pipeline/config.ts';
import type { PipelineLogger } from '@/pipeline/stages/types.ts';
import { hash8, hashFile } from '@/pipeline/state/hash.ts';

interface PrepareResult {
  hash: string;
  hashedFilename: string;
  size: number;
}

/**
 * Prepare a single PMTiles file for deployment.
 * Computes SHA-256, creates hashed filename, copies to dist directory.
 */
export async function prepareTile(
  year: number,
  sourcePath: string,
  distDir: string,
): Promise<PrepareResult> {
  const fullHash = await hashFile(sourcePath);
  const short = hash8(fullHash);
  const hashedFilename = yearToHashedPmtilesFilename(year, short);
  const destPath = path.join(distDir, hashedFilename);

  copyFileSync(sourcePath, destPath);

  const stat = statSync(destPath);

  return {
    hash: fullHash,
    hashedFilename,
    size: stat.size,
  };
}

/**
 * Run the prepare stage for a single year using default paths.
 */
export async function runPrepareForYear(
  year: number,
  pmtilesPath: string,
  logger: PipelineLogger,
): Promise<PrepareResult> {
  await mkdir(PATHS.distPmtiles, { recursive: true });

  const result = await prepareTile(year, pmtilesPath, PATHS.distPmtiles);
  logger.info('prepare', `Year ${year}: ${result.hashedFilename} (SHA-256)`);

  return result;
}
