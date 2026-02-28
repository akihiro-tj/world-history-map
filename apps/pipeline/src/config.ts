import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

export const PATHS = {
  cache: path.join(ROOT_DIR, '.cache'),
  historicalBasemaps: path.join(ROOT_DIR, '.cache', 'historical-basemaps'),
  sourceGeojson: path.join(ROOT_DIR, '.cache', 'historical-basemaps', 'geojson'),
  mergedGeojson: path.join(ROOT_DIR, '.cache', 'geojson'),
  pipelineState: path.join(ROOT_DIR, '.cache', 'pipeline-state.json'),
  pipelineLock: path.join(ROOT_DIR, '.cache', 'pipeline.lock'),
  publicPmtiles: path.join(ROOT_DIR, '..', 'app', 'public', 'pmtiles'),
  distPmtiles: path.join(ROOT_DIR, 'dist', 'pmtiles'),
} as const;

export const UPSTREAM = {
  repoUrl: 'https://github.com/aourednik/historical-basemaps.git',
} as const;

export const TIPPECANOE = {
  territories: [
    '-l',
    'territories',
    '-z',
    '10',
    '-Z',
    '0',
    '--simplification=10',
    '--coalesce-densest-as-needed',
    '--extend-zooms-if-still-dropping',
    '--force',
  ],
  labels: [
    '-l',
    'labels',
    '-z',
    '10',
    '-Z',
    '0',
    '-r1',
    '--no-feature-limit',
    '--no-tile-size-limit',
    '--force',
  ],
  tileJoin: ['--force'],
} as const;

export function filenameToYear(filename: string): number | null {
  const bcMatch = filename.match(/world_bc(\d+)\.geojson$/);
  if (bcMatch?.[1] !== undefined) {
    return -Number(bcMatch[1]);
  }

  const ceMatch = filename.match(/world_(\d+)\.geojson$/);
  if (ceMatch?.[1] !== undefined) {
    return Number(ceMatch[1]);
  }

  return null;
}

export function yearToUpstreamFilename(year: number): string {
  if (year < 0) {
    return `world_bc${-year}.geojson`;
  }
  return `world_${year}.geojson`;
}

export function yearToLocalFilename(year: number): string {
  return `world_${year}.geojson`;
}

export function yearToMergedFilename(year: number): string {
  return `world_${year}_merged.geojson`;
}

export function yearToLabelsFilename(year: number): string {
  return `world_${year}_merged_labels.geojson`;
}

export function yearToPmtilesFilename(year: number): string {
  return `world_${year}.pmtiles`;
}

export function yearToHashedPmtilesFilename(year: number, hash8: string): string {
  return `world_${year}.${hash8}.pmtiles`;
}
