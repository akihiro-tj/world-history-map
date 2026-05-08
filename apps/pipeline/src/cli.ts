import path from 'node:path';
import { listYears } from '@/commands/list-years.ts';
import { showStatus } from '@/commands/status.ts';
import { EXIT_CODES, PATHS } from '@/config.ts';
import type { PipelineOptions } from '@/pipeline.ts';
import { PipelineError, runPipeline } from '@/pipeline.ts';
import { syncDescriptions } from '@/stages/sync-descriptions.ts';
import { syncEraSummaries } from '@/stages/sync-era-summaries.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import { createLogger } from '@/stages/types.ts';
import { validateAllDescriptions } from '@/stages/validate-descriptions.ts';

function parseYearOption(raw: string): number {
  const year = Number(raw);
  if (Number.isNaN(year)) {
    throw new PipelineError(`Invalid year: ${raw}`, EXIT_CODES.INVALID_ARGUMENTS);
  }
  return year;
}

function parseYearRangeOption(raw: string): { from: number; to: number } {
  const match = raw.match(/^(-?\d+)\.\.(-?\d+)$/);
  if (!match?.[1] || !match[2]) {
    throw new PipelineError(
      `Invalid year range: ${raw}. Use format: 1600..1800`,
      EXIT_CODES.INVALID_ARGUMENTS,
    );
  }
  return { from: Number(match[1]), to: Number(match[2]) };
}

function parseArgs(argv: string[]): { command: string; options: PipelineOptions } {
  const args = argv.slice(2);
  let command = 'run';
  const options: PipelineOptions = {};

  let argIndex = 0;
  if (args[0] && !args[0].startsWith('--')) {
    command = args[0];
    argIndex = 1;
  }

  for (; argIndex < args.length; argIndex++) {
    const arg = args[argIndex];
    switch (arg) {
      case '--year': {
        const yearStr = args[++argIndex];
        if (yearStr) options.year = parseYearOption(yearStr);
        break;
      }
      case '--years': {
        const rangeStr = args[++argIndex];
        if (rangeStr) options.years = parseYearRangeOption(rangeStr);
        break;
      }
      case '--restart':
        options.restart = true;
        break;
      case '--dry-run':
        options.dryRun = true;
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

async function runTerritoryValidate(logger: PipelineLogger): Promise<void> {
  const results = await validateAllDescriptions(PATHS.descriptionsDir);
  let hasErrors = false;
  for (const result of results) {
    if (result.valid) {
      logger.info('territory-validate', `${path.basename(result.filePath)}: OK`);
    } else {
      hasErrors = true;
      for (const validationError of result.errors) {
        logger.error('territory-validate', `${path.basename(result.filePath)}: ${validationError}`);
      }
    }
  }
  if (hasErrors) {
    throw new PipelineError('Validation failed', EXIT_CODES.GENERAL_FAILURE);
  }
  logger.info('territory-validate', `All ${results.length} files passed validation`);
}

type CommandHandler = (logger: PipelineLogger, options: PipelineOptions) => Promise<void>;

const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  run: (logger, options) => runPipeline(logger, options),
  status: (logger) => Promise.resolve(showStatus(logger)),
  list: (logger) => listYears(logger),
  'territory-sync': (logger, options) =>
    syncDescriptions(
      PATHS.descriptionsDir,
      logger,
      options.year !== undefined ? { year: options.year } : undefined,
    ),
  'era-summary-sync': (logger, options) =>
    syncEraSummaries(
      PATHS.eraSummariesDir,
      logger,
      options.year !== undefined ? { year: options.year } : undefined,
    ),
  'territory-validate': (logger) => runTerritoryValidate(logger),
  fetch: (logger, options) => {
    logger.info('cli', 'Running individual stage: fetch');
    return runPipeline(logger, options);
  },
  merge: (logger, options) => {
    logger.info('cli', 'Running individual stage: merge');
    return runPipeline(logger, options);
  },
  validate: (logger, options) => {
    logger.info('cli', 'Running individual stage: validate');
    return runPipeline(logger, options);
  },
  convert: (logger, options) => {
    logger.info('cli', 'Running individual stage: convert');
    return runPipeline(logger, options);
  },
  index: (logger, options) => {
    logger.info('cli', 'Running individual stage: index');
    return runPipeline(logger, options);
  },
};

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv);
  const logger = createLogger(options.verbose ?? false);

  const handler = COMMAND_HANDLERS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error(
      'Usage: pnpm pipeline <run|status|list|territory-sync|territory-validate|era-summary-sync> [options]',
    );
    process.exit(EXIT_CODES.INVALID_ARGUMENTS);
  }

  await handler(logger, options);
}

main().catch((caughtError: unknown) => {
  if (caughtError instanceof PipelineError) {
    process.exit(caughtError.exitCode);
  }
  console.error('Unexpected error:', caughtError);
  process.exit(EXIT_CODES.GENERAL_FAILURE);
});
