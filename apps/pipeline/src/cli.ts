import path from 'node:path';
import { listYears } from '@/commands/list-years.ts';
import { showStatus } from '@/commands/status.ts';
import { EXIT_CODES, PATHS } from '@/config.ts';
import type { PipelineOptions } from '@/pipeline.ts';
import { PipelineError, runPipeline } from '@/pipeline.ts';
import { syncDescriptions } from '@/stages/sync-descriptions.ts';
import { createLogger } from '@/stages/types.ts';
import { publishManifest, runStandaloneUpload } from '@/stages/upload.ts';
import { validateAllDescriptions } from '@/stages/validate-descriptions.ts';

function parseArgs(argv: string[]): { command: string; options: PipelineOptions } {
  const args = argv.slice(2);
  let command = 'run';
  const options: PipelineOptions = {};

  let i = 0;
  if (args[0] && !args[0].startsWith('--')) {
    command = args[0];
    i = 1;
  }

  for (; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--year': {
        const yearStr = args[++i];
        if (yearStr) {
          options.year = Number(yearStr);
          if (Number.isNaN(options.year)) {
            throw new PipelineError(`Invalid year: ${yearStr}`, EXIT_CODES.INVALID_ARGUMENTS);
          }
        }
        break;
      }
      case '--years': {
        const rangeStr = args[++i];
        if (rangeStr) {
          const match = rangeStr.match(/^(-?\d+)\.\.(-?\d+)$/);
          if (!match?.[1] || !match[2]) {
            throw new PipelineError(
              `Invalid year range: ${rangeStr}. Use format: 1600..1800`,
              EXIT_CODES.INVALID_ARGUMENTS,
            );
          }
          options.years = { from: Number(match[1]), to: Number(match[2]) };
        }
        break;
      }
      case '--restart':
        options.restart = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--skip-upload':
        options.skipUpload = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      default:
        if (arg?.startsWith('--')) {
          throw new PipelineError(`Unknown option: ${arg}`, EXIT_CODES.INVALID_ARGUMENTS);
        }
    }
  }

  return { command, options };
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv);
  const logger = createLogger(options.verbose ?? false);

  switch (command) {
    case 'run':
      await runPipeline(logger, options);
      break;
    case 'status':
      showStatus(logger);
      break;
    case 'list':
      await listYears(logger);
      break;
    case 'upload':
      await runStandaloneUpload(logger);
      break;
    case 'publish-manifest':
      await publishManifest(logger);
      break;
    case 'territory-sync': {
      await syncDescriptions(
        PATHS.descriptionsDir,
        logger,
        options.year !== undefined ? { year: options.year } : undefined,
      );
      break;
    }
    case 'territory-validate': {
      const results = await validateAllDescriptions(PATHS.descriptionsDir);
      let hasErrors = false;
      for (const result of results) {
        if (result.valid) {
          logger.info('territory-validate', `${path.basename(result.filePath)}: OK`);
        } else {
          hasErrors = true;
          for (const err of result.errors) {
            logger.error('territory-validate', `${path.basename(result.filePath)}: ${err}`);
          }
        }
      }
      if (hasErrors) {
        throw new PipelineError('Validation failed', EXIT_CODES.GENERAL_FAILURE);
      }
      logger.info('territory-validate', `All ${results.length} files passed validation`);
      break;
    }
    case 'fetch':
    case 'merge':
    case 'validate':
    case 'convert':
    case 'prepare':
    case 'index':
      logger.info('cli', `Running individual stage: ${command}`);
      await runPipeline(logger, options);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error(
        'Usage: pnpm pipeline <run|status|list|upload|publish-manifest|territory-sync|territory-validate> [options]',
      );
      process.exit(EXIT_CODES.INVALID_ARGUMENTS);
  }
}

main().catch((err: unknown) => {
  if (err instanceof PipelineError) {
    process.exit(err.exitCode);
  }
  console.error('Unexpected error:', err);
  process.exit(EXIT_CODES.GENERAL_FAILURE);
});
