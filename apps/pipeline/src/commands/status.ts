import { PATHS } from '@/config.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import { PipelineCheckpoint } from '@/state/checkpoint.ts';

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
