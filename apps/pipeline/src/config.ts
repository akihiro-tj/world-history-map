import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

export const EXIT_CODES = {
  GENERAL_FAILURE: 1,
  LOCK_CONFLICT: 2,
  INVALID_ARGUMENTS: 3,
  SIGINT: 130,
  SIGTERM: 143,
} as const;

export const TIMEOUTS = {
  WRANGLER_MS: 120_000,
  TIPPECANOE_MS: 300_000,
} as const;

export const ZOOM = {
  MIN: 0,
  MAX: 10,
} as const;

export const DESCRIPTION_CONSTRAINTS = {
  CONTEXT_MIN_LENGTH: 50,
  CONTEXT_MAX_LENGTH: 200,
} as const;

export const NOTION = {
  getDataSourceId: (): string => {
    return execFileSync(
      'op',
      ['read', 'op://dev/world-history-map-pipeline/territory-descriptions-datasource-id'],
      { encoding: 'utf-8' },
    ).trim();
  },
  getToken: (): string => {
    return execFileSync('op', ['read', 'op://dev/world-history-map-pipeline/credential'], {
      encoding: 'utf-8',
    }).trim();
  },
} as const;

export const PATHS = {
  cache: path.join(ROOT_DIR, '.cache'),
  historicalBasemaps: path.join(ROOT_DIR, '.cache', 'historical-basemaps'),
  sourceGeojson: path.join(ROOT_DIR, '.cache', 'historical-basemaps', 'geojson'),
  mergedGeojson: path.join(ROOT_DIR, '.cache', 'geojson'),
  pipelineState: path.join(ROOT_DIR, '.cache', 'pipeline-state.json'),
  pipelineLock: path.join(ROOT_DIR, '.cache', 'pipeline.lock'),
  publicPmtiles: path.join(ROOT_DIR, '..', 'app', 'public', 'pmtiles'),
  distPmtiles: path.join(ROOT_DIR, 'dist', 'pmtiles'),
  descriptionsDir: path.resolve(ROOT_DIR, '..', 'frontend', 'public', 'data', 'descriptions'),
} as const;

export const UPSTREAM = {
  repoUrl: 'https://github.com/aourednik/historical-basemaps.git',
} as const;

export const TIPPECANOE = {
  territories: [
    '-l',
    'territories',
    '-z',
    String(ZOOM.MAX),
    '-Z',
    String(ZOOM.MIN),
    '--simplification=10',
    '--coalesce-densest-as-needed',
    '--extend-zooms-if-still-dropping',
    '--force',
  ],
  labels: [
    '-l',
    'labels',
    '-z',
    String(ZOOM.MAX),
    '-Z',
    String(ZOOM.MIN),
    '-r1',
    '--no-feature-limit',
    '--no-tile-size-limit',
    '--force',
  ],
  tileJoin: ['--force'],
} as const;

export class YearPaths {
  readonly year: number;

  constructor(year: number) {
    this.year = year;
  }

  static fromFilename(filename: string): YearPaths | null {
    const bcMatch = filename.match(/world_bc(\d+)\.geojson$/);
    if (bcMatch?.[1] !== undefined) {
      return new YearPaths(-Number(bcMatch[1]));
    }

    const ceMatch = filename.match(/world_(\d+)\.geojson$/);
    if (ceMatch?.[1] !== undefined) {
      return new YearPaths(Number(ceMatch[1]));
    }

    return null;
  }

  get upstream(): string {
    if (this.year < 0) {
      return `world_bc${-this.year}.geojson`;
    }
    return `world_${this.year}.geojson`;
  }

  get merged(): string {
    return `world_${this.year}_merged.geojson`;
  }

  get labels(): string {
    return `world_${this.year}_merged_labels.geojson`;
  }

  get pmtiles(): string {
    return `world_${this.year}.pmtiles`;
  }

  hashed(shortHash: string): string {
    return `world_${this.year}.${shortHash}.pmtiles`;
  }

  get sourceGeojsonPath(): string {
    return path.join(PATHS.sourceGeojson, this.upstream);
  }

  get mergedGeojsonPath(): string {
    return path.join(PATHS.mergedGeojson, this.merged);
  }

  get labelsGeojsonPath(): string {
    return path.join(PATHS.mergedGeojson, this.labels);
  }

  get pmtilesPath(): string {
    return path.join(PATHS.publicPmtiles, this.pmtiles);
  }
}
