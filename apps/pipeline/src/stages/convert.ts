/**
 * Convert stage: tippecanoe + tile-join to produce PMTiles
 * Uses execFile (no shell) for safe CLI execution
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PATHS, TIPPECANOE, yearToPmtilesFilename } from '@/config.ts';
import { execFileAsync } from '@/exec.ts';
import type { PipelineLogger } from '@/stages/types.ts';

export function buildTippecanoeArgs(
  layer: 'territories' | 'labels',
  inputPath: string,
  outputPath: string,
): string[] {
  const flags = layer === 'territories' ? [...TIPPECANOE.territories] : [...TIPPECANOE.labels];
  return [`--output=${outputPath}`, ...flags, inputPath];
}

/**
 * Execute the convert stage for a single year.
 * Runs tippecanoe for territories and labels, then tile-join to merge layers.
 */
export async function executeConvert(
  input: { polygonsPath: string; labelsPath: string },
  outputPath: string,
  tempDir: string,
  logger: PipelineLogger,
): Promise<void> {
  const polygonsPmtiles = path.join(tempDir, 'territories_temp.pmtiles');
  const labelsPmtiles = path.join(tempDir, 'labels_temp.pmtiles');

  const territoryArgs = buildTippecanoeArgs('territories', input.polygonsPath, polygonsPmtiles);
  logger.info('convert', 'Running tippecanoe for territories...');
  await execFileAsync('tippecanoe', territoryArgs, { timeout: 300_000 });

  const labelArgs = buildTippecanoeArgs('labels', input.labelsPath, labelsPmtiles);
  logger.info('convert', 'Running tippecanoe for labels...');
  await execFileAsync('tippecanoe', labelArgs, { timeout: 300_000 });

  const tileJoinArgs = [
    `--output=${outputPath}`,
    ...TIPPECANOE.tileJoin,
    '--attribution=© historical-basemaps (GPL-3.0)',
    polygonsPmtiles,
    labelsPmtiles,
  ];
  logger.info('convert', 'Running tile-join...');
  await execFileAsync('tile-join', tileJoinArgs, { timeout: 300_000 });
}

export async function runConvertForYear(
  year: number,
  polygonsPath: string,
  labelsPath: string,
  logger: PipelineLogger,
): Promise<string> {
  await mkdir(PATHS.publicPmtiles, { recursive: true });

  const outputPath = path.join(PATHS.publicPmtiles, yearToPmtilesFilename(year));
  const tempDir = PATHS.mergedGeojson;

  const start = Date.now();
  await executeConvert({ polygonsPath, labelsPath }, outputPath, tempDir, logger);
  logger.timing('convert', Date.now() - start);

  return outputPath;
}
