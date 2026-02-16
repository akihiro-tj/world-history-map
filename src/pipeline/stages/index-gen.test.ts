import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateYearIndex } from '@/pipeline/stages/index-gen.ts';
import type { PipelineLogger } from '@/pipeline/stages/types.ts';

function createMockLogger(): PipelineLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    timing: vi.fn(),
  };
}

describe('index-gen stage', () => {
  let tempDir: string;
  let mergedDir: string;
  let pmtilesDir: string;
  let logger: PipelineLogger;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'index-gen-test-'));
    mergedDir = path.join(tempDir, 'geojson');
    pmtilesDir = path.join(tempDir, 'pmtiles');
    logger = createMockLogger();
    const { mkdir } = await import('node:fs/promises');
    await mkdir(mergedDir, { recursive: true });
    await mkdir(pmtilesDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('generateYearIndex', () => {
    it('should scan PMTiles directory and extract year entries', async () => {
      // Create mock PMTiles and merged GeoJSON files
      await writeFile(path.join(pmtilesDir, 'world_1650.pmtiles'), 'fake');
      await writeFile(path.join(pmtilesDir, 'world_1700.pmtiles'), 'fake');

      // Merged GeoJSON for territory extraction
      const geojson1650 = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { NAME: 'France' },
            geometry: { type: 'Polygon', coordinates: [] },
          },
          {
            type: 'Feature',
            properties: { NAME: 'Spain' },
            geometry: { type: 'Polygon', coordinates: [] },
          },
        ],
      };
      const geojson1700 = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { NAME: 'France' },
            geometry: { type: 'Polygon', coordinates: [] },
          },
          {
            type: 'Feature',
            properties: { NAME: 'Prussia' },
            geometry: { type: 'Polygon', coordinates: [] },
          },
        ],
      };

      await writeFile(
        path.join(mergedDir, 'world_1650_merged.geojson'),
        JSON.stringify(geojson1650),
      );
      await writeFile(
        path.join(mergedDir, 'world_1700_merged.geojson'),
        JSON.stringify(geojson1700),
      );

      const index = await generateYearIndex([1650, 1700], mergedDir, pmtilesDir, logger);

      expect(index.years).toHaveLength(2);
    });

    it('should extract territory names from merged GeoJSON', async () => {
      await writeFile(path.join(pmtilesDir, 'world_1650.pmtiles'), 'fake');

      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { NAME: 'France' },
            geometry: { type: 'Polygon', coordinates: [] },
          },
          {
            type: 'Feature',
            properties: { NAME: 'Spain' },
            geometry: { type: 'Polygon', coordinates: [] },
          },
          {
            type: 'Feature',
            properties: { NAME: 'Ottoman Empire' },
            geometry: { type: 'Polygon', coordinates: [] },
          },
        ],
      };
      await writeFile(path.join(mergedDir, 'world_1650_merged.geojson'), JSON.stringify(geojson));

      const index = await generateYearIndex([1650], mergedDir, pmtilesDir, logger);

      const entry = index.years[0];
      expect(entry?.countries).toEqual(['France', 'Ottoman Empire', 'Spain']); // sorted
    });

    it('should produce sorted output by year', async () => {
      await writeFile(path.join(pmtilesDir, 'world_1700.pmtiles'), 'fake');
      await writeFile(path.join(pmtilesDir, 'world_1600.pmtiles'), 'fake');
      await writeFile(path.join(pmtilesDir, 'world_1650.pmtiles'), 'fake');

      for (const year of [1600, 1650, 1700]) {
        const geojson = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { NAME: 'Test' },
              geometry: { type: 'Polygon', coordinates: [] },
            },
          ],
        };
        await writeFile(
          path.join(mergedDir, `world_${year}_merged.geojson`),
          JSON.stringify(geojson),
        );
      }

      const index = await generateYearIndex([1700, 1600, 1650], mergedDir, pmtilesDir, logger);

      const years = index.years.map((e) => e.year);
      expect(years).toEqual([1600, 1650, 1700]);
    });

    it('should detect additions and removals of years', async () => {
      // Only 2 years available (1600 removed)
      await writeFile(path.join(pmtilesDir, 'world_1650.pmtiles'), 'fake');
      await writeFile(path.join(pmtilesDir, 'world_1700.pmtiles'), 'fake');

      for (const year of [1650, 1700]) {
        const geojson = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { NAME: 'Test' },
              geometry: { type: 'Polygon', coordinates: [] },
            },
          ],
        };
        await writeFile(
          path.join(mergedDir, `world_${year}_merged.geojson`),
          JSON.stringify(geojson),
        );
      }

      const index = await generateYearIndex([1650, 1700], mergedDir, pmtilesDir, logger);

      expect(index.years).toHaveLength(2);
      expect(index.years.map((e) => e.year)).toEqual([1650, 1700]);
    });
  });
});
