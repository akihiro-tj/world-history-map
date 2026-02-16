/**
 * Integration test: Full pipeline flow
 * Tests fetch → merge → validate → convert → prepare → index stages
 * with external dependencies mocked (git, tippecanoe, wrangler)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock exec to avoid calling real git/tippecanoe/wrangler
vi.mock('@/exec.ts', () => ({
  execFileAsync: vi.fn(),
}));

// Mock config to use temp directories
vi.mock('@/config.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config.ts')>();
  return {
    ...actual,
    // Will be overridden per test
  };
});

import { generateYearIndex } from '@/stages/index-gen.ts';
import { mergeByName } from '@/stages/merge.ts';
import { prepareTile } from '@/stages/prepare.ts';
import { createInitialState, loadState, saveState } from '@/state/checkpoint.ts';
import type { ValidationResult } from '@/types/pipeline.ts';
import { validateGeoJSON } from '@/validation/geojson.ts';
import { generateReport } from '@/validation/report.ts';

describe('pipeline integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'pipeline-integration-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should process a year through merge → validate → prepare flow', async () => {
    // Setup directories
    const cacheDir = path.join(tempDir, '.cache', 'geojson');
    const publicDir = path.join(tempDir, 'public', 'pmtiles');
    const distDir = path.join(tempDir, 'dist', 'pmtiles');
    await mkdir(cacheDir, { recursive: true });
    await mkdir(publicDir, { recursive: true });
    await mkdir(distDir, { recursive: true });

    // Create sample source GeoJSON
    const sourceGeojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { NAME: 'France', SUBJECTO: '', PARTOF: 'Europe', BORDERPRECISION: 2 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [2, 46],
                [3, 46],
                [3, 47],
                [2, 47],
                [2, 46],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { NAME: 'France', SUBJECTO: '', PARTOF: 'Europe', BORDERPRECISION: 2 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [8.5, 41.5],
                [9.5, 41.5],
                [9.5, 42.5],
                [8.5, 42.5],
                [8.5, 41.5],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { NAME: 'Spain', SUBJECTO: '', PARTOF: 'Europe', BORDERPRECISION: 2 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-4, 38],
                [-3, 38],
                [-3, 39],
                [-4, 39],
                [-4, 38],
              ],
            ],
          },
        },
      ],
    };

    // Stage 1: Merge
    const mergeResult = mergeByName(sourceGeojson as Parameters<typeof mergeByName>[0]);
    expect(mergeResult.polygons.features).toHaveLength(2); // France merged, Spain separate
    expect(mergeResult.labels.features).toHaveLength(2);

    // Write merged output
    const mergedPath = path.join(cacheDir, 'world_1650_merged.geojson');
    const labelsPath = path.join(cacheDir, 'world_1650_merged_labels.geojson');
    writeFileSync(mergedPath, JSON.stringify(mergeResult.polygons));
    writeFileSync(labelsPath, JSON.stringify(mergeResult.labels));

    // Stage 2: Validate
    const validationResult = validateGeoJSON(
      mergeResult.polygons as Parameters<typeof validateGeoJSON>[0],
      1650,
    );
    expect(validationResult.passed).toBe(true);
    expect(validationResult.errors).toHaveLength(0);

    // Stage 3: Prepare (using merged file as mock PMTiles)
    const fakePmtilesPath = path.join(publicDir, 'world_1650.pmtiles');
    writeFileSync(fakePmtilesPath, 'fake PMTiles binary content');

    const prepareResult = await prepareTile(1650, fakePmtilesPath, distDir);
    expect(prepareResult.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(prepareResult.hashedFilename).toMatch(/^world_1650\.[a-f0-9]{8}\.pmtiles$/);

    const deployedFile = path.join(distDir, prepareResult.hashedFilename);
    expect(existsSync(deployedFile)).toBe(true);
  });

  it('should generate validation report from multiple year results', () => {
    const results: ValidationResult[] = [
      {
        year: 1650,
        passed: true,
        featureCount: 42,
        errors: [],
        warnings: [{ type: 'repaired_geometry', featureIndex: 0, details: 'rewound' }],
        repairs: [{ type: 'rewind', featureIndex: 0, featureName: 'France' }],
      },
      {
        year: 1700,
        passed: true,
        featureCount: 38,
        errors: [],
        warnings: [],
        repairs: [],
      },
    ];

    const report = generateReport('integration-test', results);

    expect(report.totalYears).toBe(2);
    expect(report.totalFeatures).toBe(80);
    expect(report.totalErrors).toBe(0);
    expect(report.totalWarnings).toBe(1);
    expect(report.totalRepairs).toBe(1);
  });

  it('should generate year index from processed data', async () => {
    const mergedDir = path.join(tempDir, 'merged');
    const pmtilesDir = path.join(tempDir, 'pmtiles');
    await mkdir(mergedDir, { recursive: true });
    await mkdir(pmtilesDir, { recursive: true });

    // Create test data for 3 years
    for (const year of [1600, 1650, 1700]) {
      writeFileSync(path.join(pmtilesDir, `world_${year}.pmtiles`), 'fake');
      writeFileSync(
        path.join(mergedDir, `world_${year}_merged.geojson`),
        JSON.stringify({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { NAME: `Territory_${year}` },
              geometry: { type: 'Polygon', coordinates: [] },
            },
          ],
        }),
      );
    }

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), timing: vi.fn() };
    const index = await generateYearIndex([1600, 1650, 1700], mergedDir, pmtilesDir, logger);

    expect(index.years).toHaveLength(3);
    expect(index.years[0]?.year).toBe(1600);
    expect(index.years[1]?.year).toBe(1650);
    expect(index.years[2]?.year).toBe(1700);
  });

  it('should persist and resume pipeline state', () => {
    const statePath = path.join(tempDir, 'pipeline-state.json');

    // Create and save state
    const state = createInitialState();
    state.years['1650'] = {
      source: { hash: 'abc123', fetchedAt: new Date().toISOString() },
      merge: {
        hash: 'def456',
        completedAt: new Date().toISOString(),
        featureCount: 42,
        labelCount: 42,
      },
    };
    saveState(state, statePath);

    // Load and verify
    const loaded = loadState(statePath);
    expect(loaded).not.toBeNull();
    expect(loaded?.years['1650']?.merge?.featureCount).toBe(42);
    expect(loaded?.runId).toBe(state.runId);

    // Verify JSON is readable
    const raw = JSON.parse(readFileSync(statePath, 'utf-8'));
    expect(raw.version).toBe(1);
  });
});
