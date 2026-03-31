import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PATHS, UPSTREAM } from '@/config.ts';
import { executeFetch, getCommitHash, parseYearsFromDirectory } from '@/stages/fetch.ts';
import { runIndexGenStage } from '@/stages/index-gen.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import { runUploadStage } from '@/stages/upload.ts';
import { PipelineCheckpoint } from '@/state/checkpoint.ts';
import { acquireLock, registerCleanupHandlers, releaseLock } from '@/state/lock.ts';
import type { DeploymentManifest } from '@/types/pipeline.ts';
import { generateReport } from '@/validation/report.ts';
import { YearProcessor } from '@/year-processor.ts';

export interface PipelineOptions {
  year?: number | undefined;
  years?: { from: number; to: number } | undefined;
  restart?: boolean | undefined;
  dryRun?: boolean | undefined;
  skipUpload?: boolean | undefined;
  verbose?: boolean | undefined;
}

export async function runPipeline(
  logger: PipelineLogger,
  options: PipelineOptions = {},
): Promise<void> {
  if (!acquireLock()) {
    throw new PipelineError(
      'Pipeline is already running. Use `rm -rf .cache/pipeline.lock` to clear a stale lock.',
      2,
    );
  }
  registerCleanupHandlers();

  let checkpoint: PipelineCheckpoint | undefined;
  try {
    checkpoint = initCheckpoint(options, logger);

    logger.info('pipeline', '=== Stage: fetch ===');
    await executeFetch(PATHS.historicalBasemaps, UPSTREAM.repoUrl, logger);

    let commitHash = '';
    try {
      commitHash = await getCommitHash(PATHS.historicalBasemaps);
    } catch {
      commitHash = 'unknown';
    }
    checkpoint.setFetchStage(commitHash);
    checkpoint.persist();

    const allYears = await parseYearsFromDirectory(PATHS.sourceGeojson);
    const yearsToProcess = filterYears(allYears, options);
    logger.info('pipeline', `Processing ${yearsToProcess.length} of ${allYears.length} years`);

    if (options.dryRun) {
      logger.info('pipeline', 'Dry run: would process the following years:');
      for (const y of yearsToProcess) {
        logger.info('pipeline', `  Year ${y}`);
      }
      return;
    }

    const manifest: DeploymentManifest = loadManifest();
    const yearProcessor = new YearProcessor(checkpoint, logger, manifest);

    for (const year of yearsToProcess) {
      await yearProcessor.process(year);
    }

    if (yearProcessor.validationResults.length > 0) {
      const report = generateReport(checkpoint.runId, yearProcessor.validationResults);
      logger.info(
        'validate',
        `Validation report: ${report.totalYears} years, ${report.totalFeatures} features, ${report.totalErrors} errors, ${report.totalWarnings} warnings, ${report.totalRepairs} repairs`,
      );
    }

    logger.info('pipeline', '=== Stage: index-gen ===');
    await runIndexGenStage(yearsToProcess, logger);

    if (!options.skipUpload) {
      logger.info('pipeline', '=== Stage: upload ===');
      await runUploadStage(manifest, logger);
    } else {
      logger.info('pipeline', 'Upload skipped (--skip-upload)');
    }

    saveManifest(manifest);

    checkpoint.complete();

    logger.info('pipeline', 'Pipeline completed successfully');
  } catch (err) {
    checkpoint?.fail();
    logger.error(
      'pipeline',
      `Pipeline failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  } finally {
    releaseLock();
  }
}

function initCheckpoint(options: PipelineOptions, logger: PipelineLogger): PipelineCheckpoint {
  if (options.restart) {
    logger.info('pipeline', 'Starting fresh (--restart)');
    return PipelineCheckpoint.create(PATHS.pipelineState);
  }
  return PipelineCheckpoint.loadOrCreate(PATHS.pipelineState);
}

function filterYears(allYears: number[], options: PipelineOptions): number[] {
  if (options.year !== undefined) {
    return allYears.includes(options.year) ? [options.year] : [];
  }
  if (options.years) {
    const { from, to } = options.years;
    return allYears.filter((y) => y >= from && y <= to);
  }
  return allYears;
}

function loadManifest(): DeploymentManifest {
  const manifestPath = path.join(PATHS.distPmtiles, 'manifest.json');
  try {
    if (existsSync(manifestPath)) {
      return JSON.parse(readFileSync(manifestPath, 'utf-8')) as DeploymentManifest;
    }
  } catch {
    // Fall through to create fresh manifest
  }
  return {
    version: new Date().toISOString(),
    files: {},
  };
}

function saveManifest(manifest: DeploymentManifest): void {
  const manifestPath = path.join(PATHS.distPmtiles, 'manifest.json');
  mkdirSync(PATHS.distPmtiles, { recursive: true });
  const output = { ...manifest, version: new Date().toISOString() };
  writeFileSync(manifestPath, JSON.stringify(output, null, 2));
}

export class PipelineError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
    super(message);
    this.name = 'PipelineError';
    this.exitCode = exitCode;
  }
}
