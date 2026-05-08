import { PATHS } from '@/config.ts';
import type { PipelineLogger } from '@/shared/logger.ts';
import { parseYearsFromDirectory } from '@/stages/fetch.ts';

export async function listYears(logger: PipelineLogger): Promise<void> {
  const years = await parseYearsFromDirectory(PATHS.sourceGeojson);
  logger.info('list', `Available years (${years.length}):`);
  for (const year of years) {
    console.log(`  ${year}`);
  }
}
