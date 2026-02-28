import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { filenameToYear, PATHS, UPSTREAM } from '@/config.ts';
import { execFileAsync } from '@/exec.ts';
import type { PipelineLogger } from '@/stages/types.ts';

export async function executeFetch(
  repoDir: string,
  repoUrl: string,
  logger: PipelineLogger,
): Promise<void> {
  if (!existsSync(repoDir)) {
    logger.info('fetch', `Cloning ${repoUrl}...`);
    await execFileAsync('git', ['clone', '--depth', '1', repoUrl, repoDir], {
      timeout: 120_000,
    });
    logger.info('fetch', 'Clone completed');
  } else {
    logger.info('fetch', 'Updating historical-basemaps (git pull)...');
    try {
      await execFileAsync('git', ['-C', repoDir, 'pull'], { timeout: 60_000 });
      logger.info('fetch', 'Pull completed');
    } catch {
      logger.warn('fetch', 'Git pull failed - continuing in offline mode with cached data');
    }
  }
}

export async function getCommitHash(repoDir: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', repoDir, 'rev-parse', 'HEAD']);
  return stdout.trim();
}

export async function parseYearsFromDirectory(dir: string): Promise<number[]> {
  const files = await readdir(dir);
  const years: number[] = [];

  for (const file of files) {
    const year = filenameToYear(file);
    if (year !== null) {
      years.push(year);
    }
  }

  return years.sort((a, b) => a - b);
}

export async function runFetchStage(logger: PipelineLogger): Promise<number[]> {
  await executeFetch(PATHS.historicalBasemaps, UPSTREAM.repoUrl, logger);

  const years = await parseYearsFromDirectory(PATHS.sourceGeojson);
  logger.info('fetch', `Detected ${years.length} years`);

  return years;
}
