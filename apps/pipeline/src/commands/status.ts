import { PATHS } from '@/config.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import { PipelineCheckpoint } from '@/state/checkpoint.ts';

interface StatusColumn {
  label: string;
  width: number;
  getValue: (yearState: ReturnType<PipelineCheckpoint['getYearState']>, yearKey: string) => string;
}

const STATUS_COLUMNS: StatusColumn[] = [
  { label: 'Year', width: 8, getValue: (_state, yearKey) => yearKey },
  { label: 'Source', width: 8, getValue: (s) => (s?.source ? 'ok' : '-') },
  { label: 'Merge', width: 8, getValue: (s) => (s?.merge ? 'ok' : '-') },
  { label: 'Validate', width: 10, getValue: (s) => (s?.validate ? 'ok' : '-') },
  { label: 'Convert', width: 9, getValue: (s) => (s?.convert ? 'ok' : '-') },
  { label: 'Prepare', width: 9, getValue: (s) => (s?.prepare ? 'ok' : '-') },
  { label: 'Upload', width: 8, getValue: (s) => (s?.upload ? 'ok' : '-') },
];

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
  console.log(STATUS_COLUMNS.map((col) => col.label.padEnd(col.width)).join(''));

  for (const yearKey of yearKeys) {
    const yearState = checkpoint.getYearState(Number(yearKey));
    if (!yearState) continue;
    const cells = STATUS_COLUMNS.map((col) => col.getValue(yearState, yearKey).padEnd(col.width));
    console.log(cells.join(''));
  }
}
