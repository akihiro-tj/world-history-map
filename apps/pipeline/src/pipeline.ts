import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PATHS, UPSTREAM, YearPaths } from '@/config.ts';
import { runConvertForYear } from '@/stages/convert.ts';
import { executeFetch, getCommitHash, parseYearsFromDirectory } from '@/stages/fetch.ts';
import { runIndexGenStage } from '@/stages/index-gen.ts';
import { runMergeForYear } from '@/stages/merge.ts';
import { runPrepareForYear } from '@/stages/prepare.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import { runUploadStage } from '@/stages/upload.ts';
import { runValidateForYear } from '@/stages/validate.ts';
import { PipelineCheckpoint } from '@/state/checkpoint.ts';
import { hashFile } from '@/state/hash.ts';
import { acquireLock, registerCleanupHandlers, releaseLock } from '@/state/lock.ts';
import type { DeploymentManifest, ValidationResult } from '@/types/pipeline.ts';
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

  let checkpoint: PipelineCheckpoint | undefined;
  try {
    if (options.restart) {
      checkpoint = PipelineCheckpoint.create(PATHS.pipelineState);
      logger.info('pipeline', 'Starting fresh (--restart)');
    } else {
      checkpoint = PipelineCheckpoint.loadOrCreate(PATHS.pipelineState);
    }

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
    const validationResults: ValidationResult[] = [];

    for (const year of yearsToProcess) {
      const yearPaths = new YearPaths(year);
      const sourceFile = yearPaths.sourceGeojsonPath;
      if (!existsSync(sourceFile)) {
        logger.warn('pipeline', `Year ${year}: source file not found, skipping`);
        continue;
      }

      const sourceHash = await hashFile(sourceFile);

      const yearState = checkpoint.getYearState(year);

      if (yearState?.source && yearState.source.hash !== sourceHash) {
        logger.info('pipeline', `Year ${year}: source changed, invalidating downstream`);
        checkpoint.invalidateDownstream(year, 'source');
      }

      checkpoint.updateYear(year, 'source', {
        hash: sourceHash,
        fetchedAt: new Date().toISOString(),
      });

      if (checkpoint.shouldProcess(year, 'merge', sourceHash)) {
        logger.info('pipeline', `=== Year ${year}: merge ===`);
        const start = Date.now();
        const mergeResult = await runMergeForYear(year, sourceFile, logger);
        const mergedHash = await hashFile(mergeResult.polygonsPath);

        checkpoint.updateYear(year, 'merge', {
          hash: mergedHash,
          completedAt: new Date().toISOString(),
          featureCount: mergeResult.featureCount,
          labelCount: mergeResult.labelCount,
        });
        checkpoint.persist();
        logger.timing('merge', Date.now() - start);
      } else {
        logger.info('pipeline', `Year ${year}: merge skipped (unchanged)`);
      }

      if (checkpoint.shouldProcess(year, 'validate', sourceHash)) {
        logger.info('pipeline', `=== Year ${year}: validate ===`);
        const validationResult = runValidateForYear(year, yearPaths.mergedGeojsonPath, logger);
        validationResults.push(validationResult);

        checkpoint.updateYear(year, 'validate', {
          completedAt: new Date().toISOString(),
          warnings: validationResult.warnings.length,
          errors: validationResult.errors.length,
        });
        checkpoint.persist();

        if (!validationResult.passed) {
          throw new PipelineError(
            `Validation failed for year ${year}: ${validationResult.errors.length} errors`,
            1,
          );
        }
      } else {
        logger.info('pipeline', `Year ${year}: validate skipped (unchanged)`);
      }

      if (checkpoint.shouldProcess(year, 'convert', sourceHash)) {
        logger.info('pipeline', `=== Year ${year}: convert ===`);
        const currentYearState = checkpoint.getYearState(year);
        const mergeState = currentYearState?.merge;
        if (!mergeState) {
          logger.error('pipeline', `Year ${year}: merge state not found, skipping convert`);
          continue;
        }

        const start = Date.now();
        const pmtilesPath = await runConvertForYear(
          yearPaths.mergedGeojsonPath,
          yearPaths.labelsGeojsonPath,
          yearPaths.pmtilesPath,
          logger,
        );
        const convertHash = await hashFile(pmtilesPath);

        checkpoint.updateYear(year, 'convert', {
          hash: convertHash,
          completedAt: new Date().toISOString(),
        });
        checkpoint.persist();
        logger.timing('convert', Date.now() - start);
      } else {
        logger.info('pipeline', `Year ${year}: convert skipped (unchanged)`);
      }

      if (checkpoint.shouldProcess(year, 'prepare', sourceHash)) {
        logger.info('pipeline', `=== Year ${year}: prepare ===`);
        const result = await runPrepareForYear(year, yearPaths.pmtilesPath, logger);

        checkpoint.updateYear(year, 'prepare', {
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

        checkpoint.persist();
      } else {
        logger.info('pipeline', `Year ${year}: prepare skipped (unchanged)`);
      }
    }

    if (validationResults.length > 0) {
      const report = generateReport(checkpoint.runId, validationResults);
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

export function showStatus(logger: PipelineLogger): void {
  const checkpoint = PipelineCheckpoint.load(PATHS.pipelineState);
  if (!checkpoint) {
    logger.info('status', 'No pipeline state found. Run `pnpm pipeline run` first.');
    return;
  }

  logger.info('status', `Pipeline State: ${checkpoint.status}`);
  logger.info('status', `Last run: ${checkpoint.startedAt} (run-id: ${checkpoint.runId})`);

  const yearKeys = checkpoint.yearKeys.sort((a, b) => Number(a) - Number(b));
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
    const yearState = checkpoint.getYearState(Number(yearKey));
    if (!yearState) continue;
    const line =
      yearKey.padEnd(8) +
      (yearState.source ? 'ok' : '-').padEnd(8) +
      (yearState.merge ? 'ok' : '-').padEnd(8) +
      (yearState.validate ? 'ok' : '-').padEnd(10) +
      (yearState.convert ? 'ok' : '-').padEnd(9) +
      (yearState.prepare ? 'ok' : '-').padEnd(9) +
      (yearState.upload ? 'ok' : '-').padEnd(8);
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
