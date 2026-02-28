import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PATHS, yearToUpstreamFilename } from '@/config.ts';
import { runConvertForYear } from '@/stages/convert.ts';
import { executeFetch, getCommitHash, parseYearsFromDirectory } from '@/stages/fetch.ts';
import { runIndexGenStage } from '@/stages/index-gen.ts';
import { runMergeForYear } from '@/stages/merge.ts';
import { runPrepareForYear } from '@/stages/prepare.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import { runUploadStage } from '@/stages/upload.ts';
import { runValidateForYear } from '@/stages/validate.ts';
import {
  createInitialState,
  invalidateDownstream,
  loadState,
  saveState,
  shouldProcessYear,
  updateYearState,
} from '@/state/checkpoint.ts';
import { hashFile } from '@/state/hash.ts';
import { acquireLock, registerCleanupHandlers, releaseLock } from '@/state/lock.ts';
import type { DeploymentManifest, PipelineState, ValidationResult } from '@/types/pipeline.ts';
import { generateReport } from '@/validation/report.ts';

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

  try {
    let state: PipelineState;
    if (options.restart) {
      state = createInitialState();
      logger.info('pipeline', 'Starting fresh (--restart)');
    } else {
      state = loadState(PATHS.pipelineState) ?? createInitialState();
      if (state.status === 'completed' || state.status === 'failed') {
        state = createInitialState();
      }
    }

    logger.info('pipeline', '=== Stage: fetch ===');
    await executeFetch(
      PATHS.historicalBasemaps,
      'https://github.com/aourednik/historical-basemaps.git',
      logger,
    );

    let commitHash = '';
    try {
      commitHash = await getCommitHash(PATHS.historicalBasemaps);
    } catch {
      commitHash = 'unknown';
    }
    state.stages.fetch = {
      completedAt: new Date().toISOString(),
      sourceCommitHash: commitHash,
    };
    saveState(state, PATHS.pipelineState);

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
    const validationResults: ValidationResult[] = [];

    for (const year of yearsToProcess) {
      const sourceFile = path.join(PATHS.sourceGeojson, yearToUpstreamFilename(year));
      if (!existsSync(sourceFile)) {
        logger.warn('pipeline', `Year ${year}: source file not found, skipping`);
        continue;
      }

      const sourceHash = await hashFile(sourceFile);

      if (!state.years[String(year)]) {
        state.years[String(year)] = {};
      }

      const yearState = state.years[String(year)];
      if (!yearState) continue;

      if (yearState.source && yearState.source.hash !== sourceHash) {
        logger.info('pipeline', `Year ${year}: source changed, invalidating downstream`);
        invalidateDownstream(state, year, 'source');
      }

      updateYearState(state, year, 'source', {
        hash: sourceHash,
        fetchedAt: new Date().toISOString(),
      });

      if (shouldProcessYear(state, year, 'merge', sourceHash)) {
        logger.info('pipeline', `=== Year ${year}: merge ===`);
        const start = Date.now();
        const mergeResult = await runMergeForYear(year, sourceFile, logger);
        const mergedHash = await hashFile(mergeResult.polygonsPath);

        updateYearState(state, year, 'merge', {
          hash: mergedHash,
          completedAt: new Date().toISOString(),
          featureCount: mergeResult.featureCount,
          labelCount: mergeResult.labelCount,
        });
        saveState(state, PATHS.pipelineState);
        logger.timing('merge', Date.now() - start);
      } else {
        logger.info('pipeline', `Year ${year}: merge skipped (unchanged)`);
      }

      if (shouldProcessYear(state, year, 'validate', sourceHash)) {
        logger.info('pipeline', `=== Year ${year}: validate ===`);
        const mergedPath = path.join(PATHS.mergedGeojson, `world_${year}_merged.geojson`);

        const validationResult = runValidateForYear(year, mergedPath, logger);
        validationResults.push(validationResult);

        updateYearState(state, year, 'validate', {
          completedAt: new Date().toISOString(),
          warnings: validationResult.warnings.length,
          errors: validationResult.errors.length,
        });
        saveState(state, PATHS.pipelineState);

        if (!validationResult.passed) {
          throw new PipelineError(
            `Validation failed for year ${year}: ${validationResult.errors.length} errors`,
            1,
          );
        }
      } else {
        logger.info('pipeline', `Year ${year}: validate skipped (unchanged)`);
      }

      if (shouldProcessYear(state, year, 'convert', sourceHash)) {
        logger.info('pipeline', `=== Year ${year}: convert ===`);
        const mergeState = yearState.merge;
        if (!mergeState) {
          logger.error('pipeline', `Year ${year}: merge state not found, skipping convert`);
          continue;
        }

        const polygonsPath = path.join(PATHS.mergedGeojson, `world_${year}_merged.geojson`);
        const labelsPath = path.join(PATHS.mergedGeojson, `world_${year}_merged_labels.geojson`);

        const start = Date.now();
        const pmtilesPath = await runConvertForYear(year, polygonsPath, labelsPath, logger);
        const convertHash = await hashFile(pmtilesPath);

        updateYearState(state, year, 'convert', {
          hash: convertHash,
          completedAt: new Date().toISOString(),
        });
        saveState(state, PATHS.pipelineState);
        logger.timing('convert', Date.now() - start);
      } else {
        logger.info('pipeline', `Year ${year}: convert skipped (unchanged)`);
      }

      if (shouldProcessYear(state, year, 'prepare', sourceHash)) {
        logger.info('pipeline', `=== Year ${year}: prepare ===`);
        const pmtilesPath = path.join(PATHS.publicPmtiles, `world_${year}.pmtiles`);

        const result = await runPrepareForYear(year, pmtilesPath, logger);

        updateYearState(state, year, 'prepare', {
          hash: result.hash,
          hashedFilename: result.hashedFilename,
          completedAt: new Date().toISOString(),
        });

        manifest.files[String(year)] = result.hashedFilename;
        if (!manifest.metadata) {
          manifest.metadata = {};
        }
        manifest.metadata[String(year)] = {
          hash: result.hash,
          size: result.size,
        };

        saveState(state, PATHS.pipelineState);
      } else {
        logger.info('pipeline', `Year ${year}: prepare skipped (unchanged)`);
      }
    }

    if (validationResults.length > 0) {
      const report = generateReport(state.runId, validationResults);
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

    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    saveState(state, PATHS.pipelineState);

    logger.info('pipeline', 'Pipeline completed successfully');
  } catch (err) {
    logger.error(
      'pipeline',
      `Pipeline failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  } finally {
    releaseLock();
  }
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
    // Ignore errors, create fresh manifest
  }
  return {
    version: new Date().toISOString(),
    files: {},
  };
}

function saveManifest(manifest: DeploymentManifest): void {
  const manifestPath = path.join(PATHS.distPmtiles, 'manifest.json');
  mkdirSync(PATHS.distPmtiles, { recursive: true });
  manifest.version = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

export class PipelineError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
    super(message);
    this.name = 'PipelineError';
    this.exitCode = exitCode;
  }
}

export function showStatus(logger: PipelineLogger): void {
  const state = loadState(PATHS.pipelineState);
  if (!state) {
    logger.info('status', 'No pipeline state found. Run `pnpm pipeline run` first.');
    return;
  }

  logger.info('status', `Pipeline State: ${state.status}`);
  logger.info('status', `Last run: ${state.startedAt} (run-id: ${state.runId})`);

  const yearKeys = Object.keys(state.years).sort((a, b) => Number(a) - Number(b));
  logger.info('status', `Years processed: ${yearKeys.length}`);

  console.log('');
  console.log(
    'Year'.padEnd(8) +
      'Source'.padEnd(8) +
      'Merge'.padEnd(8) +
      'Validate'.padEnd(10) +
      'Convert'.padEnd(9) +
      'Prepare'.padEnd(9) +
      'Upload'.padEnd(8),
  );

  for (const yearKey of yearKeys) {
    const ys = state.years[yearKey];
    if (!ys) continue;
    const line =
      yearKey.padEnd(8) +
      (ys.source ? 'ok' : '-').padEnd(8) +
      (ys.merge ? 'ok' : '-').padEnd(8) +
      (ys.validate ? 'ok' : '-').padEnd(10) +
      (ys.convert ? 'ok' : '-').padEnd(9) +
      (ys.prepare ? 'ok' : '-').padEnd(9) +
      (ys.upload ? 'ok' : '-').padEnd(8);
    console.log(line);
  }
}

export async function listYears(logger: PipelineLogger): Promise<void> {
  const years = await parseYearsFromDirectory(PATHS.sourceGeojson);
  logger.info('list', `Available years (${years.length}):`);
  for (const year of years) {
    console.log(`  ${year}`);
  }
}
