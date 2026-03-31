import { existsSync } from 'node:fs';
import { YearPaths } from '@/config.ts';
import { PipelineError } from '@/pipeline.ts';
import { runConvertForYear } from '@/stages/convert.ts';
import { runMergeForYear } from '@/stages/merge.ts';
import { runPrepareForYear } from '@/stages/prepare.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import { runValidateForYear } from '@/stages/validate.ts';
import type { PipelineCheckpoint } from '@/state/checkpoint.ts';
import { hashFile } from '@/state/hash.ts';
import type { ValidationResult } from '@/types/pipeline.ts';

export interface YearProcessResult {
  prepareResult?: { hash: string; hashedFilename: string; size: number };
  validationResult?: ValidationResult;
}

export class YearProcessor {
  private readonly checkpoint: PipelineCheckpoint;
  private readonly logger: PipelineLogger;

  constructor(checkpoint: PipelineCheckpoint, logger: PipelineLogger) {
    this.checkpoint = checkpoint;
    this.logger = logger;
  }

  async process(year: number): Promise<YearProcessResult> {
    const yearPaths = new YearPaths(year);
    const result: YearProcessResult = {};
    const sourceFile = yearPaths.sourceGeojsonPath;
    if (!existsSync(sourceFile)) {
      this.logger.warn('pipeline', `Year ${year}: source file not found, skipping`);
      return result;
    }

    const sourceHash = await hashFile(sourceFile);

    const yearState = this.checkpoint.getYearState(year);
    if (yearState?.source && yearState.source.hash !== sourceHash) {
      this.logger.info('pipeline', `Year ${year}: source changed, invalidating downstream`);
      this.checkpoint.invalidateDownstream(year, 'source');
    }

    this.checkpoint.updateYear(year, 'source', {
      hash: sourceHash,
      fetchedAt: new Date().toISOString(),
    });

    await this.runMerge(year, sourceFile, sourceHash);
    const validationResult = await this.runValidate(year, yearPaths, sourceHash);
    if (validationResult) result.validationResult = validationResult;
    await this.runConvert(year, yearPaths, sourceHash);
    const prepareResult = await this.runPrepare(year, yearPaths, sourceHash);
    if (prepareResult) result.prepareResult = prepareResult;
    return result;
  }

  private async runStage<T>(
    year: number,
    sourceHash: string,
    stageKey: 'merge' | 'validate' | 'convert' | 'prepare',
    execute: () => Promise<T>,
  ): Promise<T | undefined> {
    if (this.checkpoint.shouldProcess(year, stageKey, sourceHash)) {
      this.logger.info('pipeline', `=== Year ${year}: ${stageKey} ===`);
      const result = await execute();
      this.checkpoint.persist();
      return result;
    }
    this.logger.info('pipeline', `Year ${year}: ${stageKey} skipped (unchanged)`);
    return undefined;
  }

  private async runMerge(year: number, sourceFile: string, sourceHash: string): Promise<void> {
    await this.runStage(year, sourceHash, 'merge', async () => {
      const start = Date.now();
      const mergeResult = await runMergeForYear(year, sourceFile, this.logger);
      const mergedHash = await hashFile(mergeResult.polygonsPath);

      this.checkpoint.updateYear(year, 'merge', {
        hash: mergedHash,
        completedAt: new Date().toISOString(),
        featureCount: mergeResult.featureCount,
        labelCount: mergeResult.labelCount,
      });
      this.logger.timing('merge', Date.now() - start);
    });
  }

  private async runValidate(
    year: number,
    yearPaths: YearPaths,
    sourceHash: string,
  ): Promise<ValidationResult | undefined> {
    return this.runStage(year, sourceHash, 'validate', async () => {
      const validationResult = runValidateForYear(year, yearPaths.mergedGeojsonPath, this.logger);

      this.checkpoint.updateYear(year, 'validate', {
        completedAt: new Date().toISOString(),
        warnings: validationResult.warnings.length,
        errors: validationResult.errors.length,
      });

      if (!validationResult.passed) {
        throw new PipelineError(
          `Validation failed for year ${year}: ${validationResult.errors.length} errors`,
          1,
        );
      }

      return validationResult;
    });
  }

  private async runConvert(year: number, yearPaths: YearPaths, sourceHash: string): Promise<void> {
    await this.runStage(year, sourceHash, 'convert', async () => {
      const currentYearState = this.checkpoint.getYearState(year);
      const mergeState = currentYearState?.merge;
      if (!mergeState) {
        this.logger.error('pipeline', `Year ${year}: merge state not found, skipping convert`);
        return;
      }

      const start = Date.now();
      const pmtilesPath = await runConvertForYear(
        yearPaths.mergedGeojsonPath,
        yearPaths.labelsGeojsonPath,
        yearPaths.pmtilesPath,
        this.logger,
      );
      const convertHash = await hashFile(pmtilesPath);

      this.checkpoint.updateYear(year, 'convert', {
        hash: convertHash,
        completedAt: new Date().toISOString(),
      });
      this.logger.timing('convert', Date.now() - start);
    });
  }

  private async runPrepare(
    year: number,
    yearPaths: YearPaths,
    sourceHash: string,
  ): Promise<{ hash: string; hashedFilename: string; size: number } | undefined> {
    return this.runStage(year, sourceHash, 'prepare', async () => {
      const result = await runPrepareForYear(year, yearPaths.pmtilesPath, this.logger);

      this.checkpoint.updateYear(year, 'prepare', {
        hash: result.hash,
        hashedFilename: result.hashedFilename,
        completedAt: new Date().toISOString(),
      });

      return { hash: result.hash, hashedFilename: result.hashedFilename, size: result.size };
    });
  }
}
