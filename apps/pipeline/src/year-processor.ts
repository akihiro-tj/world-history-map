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
import type { DeploymentManifest, ValidationResult } from '@/types/pipeline.ts';

export class YearProcessor {
  private readonly checkpoint: PipelineCheckpoint;
  private readonly logger: PipelineLogger;
  private readonly manifest: DeploymentManifest;
  readonly validationResults: ValidationResult[] = [];

  constructor(
    checkpoint: PipelineCheckpoint,
    logger: PipelineLogger,
    manifest: DeploymentManifest,
  ) {
    this.checkpoint = checkpoint;
    this.logger = logger;
    this.manifest = manifest;
  }

  async process(year: number): Promise<void> {
    const yearPaths = new YearPaths(year);
    const sourceFile = yearPaths.sourceGeojsonPath;
    if (!existsSync(sourceFile)) {
      this.logger.warn('pipeline', `Year ${year}: source file not found, skipping`);
      return;
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
    await this.runValidate(year, yearPaths, sourceHash);
    await this.runConvert(year, yearPaths, sourceHash);
    await this.runPrepare(year, yearPaths, sourceHash);
  }

  private async runStage(
    year: number,
    stageName: string,
    sourceHash: string,
    stageKey: 'merge' | 'validate' | 'convert' | 'prepare',
    execute: () => Promise<void>,
  ): Promise<void> {
    if (this.checkpoint.shouldProcess(year, stageKey, sourceHash)) {
      this.logger.info('pipeline', `=== Year ${year}: ${stageName} ===`);
      await execute();
      this.checkpoint.persist();
    } else {
      this.logger.info('pipeline', `Year ${year}: ${stageName} skipped (unchanged)`);
    }
  }

  private async runMerge(year: number, sourceFile: string, sourceHash: string): Promise<void> {
    await this.runStage(year, 'merge', sourceHash, 'merge', async () => {
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

  private async runValidate(year: number, yearPaths: YearPaths, sourceHash: string): Promise<void> {
    await this.runStage(year, 'validate', sourceHash, 'validate', async () => {
      const validationResult = runValidateForYear(year, yearPaths.mergedGeojsonPath, this.logger);
      this.validationResults.push(validationResult);

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
    });
  }

  private async runConvert(year: number, yearPaths: YearPaths, sourceHash: string): Promise<void> {
    await this.runStage(year, 'convert', sourceHash, 'convert', async () => {
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

  private async runPrepare(year: number, yearPaths: YearPaths, sourceHash: string): Promise<void> {
    await this.runStage(year, 'prepare', sourceHash, 'prepare', async () => {
      const result = await runPrepareForYear(year, yearPaths.pmtilesPath, this.logger);

      this.checkpoint.updateYear(year, 'prepare', {
        hash: result.hash,
        hashedFilename: result.hashedFilename,
        completedAt: new Date().toISOString(),
      });

      this.manifest.files[String(year)] = result.hashedFilename;
      if (!this.manifest.metadata) {
        this.manifest.metadata = {};
      }
      this.manifest.metadata[String(year)] = {
        hash: result.hash,
        size: result.size,
      };
    });
  }
}
