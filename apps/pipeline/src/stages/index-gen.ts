/**
 * Index generation stage: create index.json with year/territory mappings
 * Scans processed years and extracts territory names from merged GeoJSON
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PATHS, yearToMergedFilename, yearToPmtilesFilename } from '@/config.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import type { YearIndex } from '@/types/year.ts';

interface MergedFeature {
  properties: { NAME?: string } | null;
}

interface MergedGeoJSON {
  features: MergedFeature[];
}

/**
 * Generate the year index from processed data.
 */
export async function generateYearIndex(
  years: number[],
  mergedDir: string,
  pmtilesDir: string,
  logger: PipelineLogger,
): Promise<YearIndex> {
  const sortedYears = [...years].sort((a, b) => a - b);
  const entries: YearIndex['years'] = [];

  for (const year of sortedYears) {
    const pmtilesPath = path.join(pmtilesDir, yearToPmtilesFilename(year));
    if (!existsSync(pmtilesPath)) {
      logger.warn('index-gen', `Year ${year}: PMTiles not found, skipping`);
      continue;
    }

    // Extract territory names from merged GeoJSON
    const mergedPath = path.join(mergedDir, yearToMergedFilename(year));
    let countries: string[] = [];

    if (existsSync(mergedPath)) {
      try {
        const geojson = JSON.parse(readFileSync(mergedPath, 'utf-8')) as MergedGeoJSON;
        const names = new Set<string>();
        for (const feature of geojson.features) {
          const name = feature.properties?.NAME;
          if (name) {
            names.add(name);
          }
        }
        countries = [...names].sort();
      } catch {
        logger.warn('index-gen', `Year ${year}: Failed to read merged GeoJSON`);
      }
    }

    entries.push({
      year,
      filename: yearToPmtilesFilename(year),
      countries,
    });
  }

  logger.info('index-gen', `Generated index with ${entries.length} years`);

  return { years: entries };
}

/**
 * Run the index generation stage and write index.json.
 */
export async function runIndexGenStage(
  years: number[],
  logger: PipelineLogger,
): Promise<YearIndex> {
  const index = await generateYearIndex(years, PATHS.mergedGeojson, PATHS.publicPmtiles, logger);

  const indexPath = path.join(PATHS.publicPmtiles, 'index.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  logger.info('index-gen', `Written: ${indexPath}`);

  return index;
}
