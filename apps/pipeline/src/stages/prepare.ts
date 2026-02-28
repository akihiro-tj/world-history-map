import { copyFileSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PATHS, yearToHashedPmtilesFilename } from '@/config.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import { hash8, hashFile } from '@/state/hash.ts';

interface PrepareResult {
  hash: string;
  hashedFilename: string;
  size: number;
}

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
