/**
 * Pipeline configuration
 * Centralized paths, constants, and year encoding helpers
 */
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

export const PATHS = {
  /** Cache root directory */
  cache: path.join(ROOT_DIR, '.cache'),

  /** Cloned historical-basemaps repository */
  historicalBasemaps: path.join(ROOT_DIR, '.cache', 'historical-basemaps'),

  /** Source GeoJSON from upstream repo */
  sourceGeojson: path.join(ROOT_DIR, '.cache', 'historical-basemaps', 'geojson'),

  /** Processed (merged) GeoJSON cache */
  mergedGeojson: path.join(ROOT_DIR, '.cache', 'geojson'),

  /** Pipeline state file */
  pipelineState: path.join(ROOT_DIR, '.cache', 'pipeline-state.json'),

  /** Pipeline lock directory */
  pipelineLock: path.join(ROOT_DIR, '.cache', 'pipeline.lock'),

  /** Local development PMTiles */
  publicPmtiles: path.join(ROOT_DIR, '..', 'app', 'public', 'pmtiles'),

  /** Deployment PMTiles with hashed filenames */
  distPmtiles: path.join(ROOT_DIR, 'dist', 'pmtiles'),
} as const;

export const UPSTREAM = {
  /** Git repository URL for historical-basemaps */
  repoUrl: 'https://github.com/aourednik/historical-basemaps.git',
} as const;

export const TIPPECANOE = {
  /** Territory polygons layer flags */
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
  /** Label points layer flags */
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
  /** tile-join flags (without --output and input files) */
  tileJoin: ['--force'],
} as const;

// --- Year encoding helpers ---

/**
 * Convert an upstream filename to a year number.
 * - world_1650.geojson → 1650
 * - world_bc1000.geojson → -1000
 */
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

/**
 * Convert a year number to the upstream filename (in the historical-basemaps repo).
 * - 1650 → world_1650.geojson
 * - -1000 → world_bc1000.geojson
 */
export function yearToUpstreamFilename(year: number): string {
  if (year < 0) {
    return `world_bc${-year}.geojson`;
  }
  return `world_${year}.geojson`;
}

/**
 * Convert a year number to the local source filename.
 * Local files are stored with numeric year (including negative).
 * - 1650 → world_1650.geojson
 * - -1000 → world_-1000.geojson
 */
export function yearToLocalFilename(year: number): string {
  return `world_${year}.geojson`;
}

/**
 * Get the merged GeoJSON filename for a year.
 */
export function yearToMergedFilename(year: number): string {
  return `world_${year}_merged.geojson`;
}

/**
 * Get the merged labels GeoJSON filename for a year.
 */
export function yearToLabelsFilename(year: number): string {
  return `world_${year}_merged_labels.geojson`;
}

/**
 * Get the PMTiles filename (unhashed, for local dev).
 */
export function yearToPmtilesFilename(year: number): string {
  return `world_${year}.pmtiles`;
}

/**
 * Get the hashed PMTiles filename for deployment.
 */
export function yearToHashedPmtilesFilename(year: number, hash8: string): string {
  return `world_${year}.${hash8}.pmtiles`;
}
