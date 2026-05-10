import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';
import { describe, expect, it } from 'vitest';
import { computeMainBbox, mergeByName } from '@/tiles/merge.ts';
import type { FeatureCollection } from '@/types/geojson.ts';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures');

describe('computeMainBbox', () => {
  it('returns correct bbox for a single normal polygon', () => {
    const polygon = turf.polygon([
      [
        [2, 46],
        [3, 46],
        [3, 47],
        [2, 47],
        [2, 46],
      ],
    ]);
    const result = computeMainBbox(polygon);
    expect(result.west).toBe(2);
    expect(result.south).toBe(46);
    expect(result.east).toBe(3);
    expect(result.north).toBe(47);
    expect(result.crossesAntimeridian).toBe(false);
  });

  it('returns correct bbox when given the largest polygon from an exclave territory', () => {
    const mainPolygon = turf.polygon([
      [
        [60, 30],
        [120, 30],
        [120, 50],
        [60, 50],
        [60, 30],
      ],
    ]);
    const result = computeMainBbox(mainPolygon);
    expect(result.west).toBe(60);
    expect(result.south).toBe(30);
    expect(result.east).toBe(120);
    expect(result.north).toBe(50);
    expect(result.crossesAntimeridian).toBe(false);
  });

  it('detects antimeridian crossing and returns east > 180', () => {
    const polygon = turf.polygon([
      [
        [178, -10],
        [-178, -10],
        [-178, 10],
        [178, 10],
        [178, -10],
      ],
    ]);
    const result = computeMainBbox(polygon);
    expect(result.crossesAntimeridian).toBe(true);
    expect(result.west).toBeCloseTo(178);
    expect(result.east).toBeCloseTo(182);
    expect(result.south).toBe(-10);
    expect(result.north).toBe(10);
  });
});

describe('merge stage', () => {
  describe('mergeByName', () => {
    it('should pass through single-feature-per-name without change', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));

      const { polygons, labels } = mergeByName(input);

      expect(polygons.features).toHaveLength(3);
      expect(labels.features).toHaveLength(3);
    });

    it('should merge same-name polygons into MultiPolygon', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid-multi.geojson'), 'utf-8'));

      const { polygons, labels } = mergeByName(input);

      expect(polygons.features).toHaveLength(2);

      const france = polygons.features.find((f) => f.properties?.['NAME'] === 'France');
      expect(france?.geometry.type).toBe('MultiPolygon');

      expect(labels.features).toHaveLength(2);
    });

    it('should generate centroid label points for each territory', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));

      const { labels } = mergeByName(input);

      for (const label of labels.features) {
        expect(label.geometry.type).toBe('Point');
        expect(label.properties?.['NAME']).toBeTruthy();
      }
    });

    it('should keep NAME, SUBJECTO, and BBOX properties', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid-multi.geojson'), 'utf-8'));

      const { polygons } = mergeByName(input);

      const france = polygons.features.find((f) => f.properties?.['NAME'] === 'France');
      expect(france?.properties?.['NAME']).toBe('France');
      expect(france?.properties?.['SUBJECTO']).toBe('');
      expect(Object.keys(france?.properties ?? {})).toEqual([
        'NAME',
        'SUBJECTO',
        'BBOX_W',
        'BBOX_S',
        'BBOX_E',
        'BBOX_N',
        'BBOX_AM',
      ]);
    });

    it('should report feature count correctly', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));
      const { polygons } = mergeByName(input);

      expect(polygons.features).toHaveLength(3);
    });

    it('should inject name_ja into label features when descriptions match', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));
      const descriptions = {
        france: { name: 'フランス' },
        'ottoman-empire': { name: 'オスマン帝国' },
      };

      const { labels } = mergeByName(input, descriptions);

      const france = labels.features.find((f) => f.properties?.['NAME'] === 'France');
      const ottoman = labels.features.find((f) => f.properties?.['NAME'] === 'Ottoman Empire');
      const spain = labels.features.find((f) => f.properties?.['NAME'] === 'Spain');

      expect(france?.properties?.['name_ja']).toBe('フランス');
      expect(ottoman?.properties?.['name_ja']).toBe('オスマン帝国');
      expect(spain?.properties?.['name_ja']).toBeUndefined();
    });

    it('should not inject name_ja into polygon features', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));
      const descriptions = { france: { name: 'フランス' } };

      const { polygons } = mergeByName(input, descriptions);

      const france = polygons.features.find((f) => f.properties?.['NAME'] === 'France');
      expect(france?.properties?.['name_ja']).toBeUndefined();
    });

    it('should skip name_ja injection when description name is empty', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));
      const descriptions = { france: { name: '' } };

      const { labels } = mergeByName(input, descriptions);

      const france = labels.features.find((f) => f.properties?.['NAME'] === 'France');
      expect(france?.properties?.['name_ja']).toBeUndefined();
    });

    it('should include BBOX_W/S/E/N/AM in every polygon feature properties', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));
      const { polygons } = mergeByName(input);

      for (const feature of polygons.features) {
        const p = feature.properties ?? {};
        expect(p['BBOX_W']).toBeTypeOf('number');
        expect(p['BBOX_S']).toBeTypeOf('number');
        expect(p['BBOX_E']).toBeTypeOf('number');
        expect(p['BBOX_N']).toBeTypeOf('number');
        expect(p['BBOX_AM'] === 0 || p['BBOX_AM'] === 1).toBe(true);
        expect(p['BBOX_S']).toBeLessThanOrEqual(p['BBOX_N']);
        expect(p['BBOX_W']).toBeGreaterThanOrEqual(-180);
        expect(p['BBOX_W']).toBeLessThanOrEqual(180);
      }
    });

    it('should compute BBOX from the largest polygon of a multi-polygon territory (not from exclaves)', () => {
      const input: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { NAME: 'USA', SUBJECTO: '' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [60, 30],
                  [120, 30],
                  [120, 50],
                  [60, 50],
                  [60, 30],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: { NAME: 'USA', SUBJECTO: '' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [150, 50],
                  [160, 50],
                  [160, 70],
                  [150, 70],
                  [150, 50],
                ],
              ],
            },
          },
        ],
      };
      const { polygons } = mergeByName(input);
      const usa = polygons.features.find((f) => f.properties?.['NAME'] === 'USA');
      expect(usa?.properties?.['BBOX_W']).toBe(60);
      expect(usa?.properties?.['BBOX_E']).toBe(120);
      expect(usa?.properties?.['BBOX_S']).toBe(30);
      expect(usa?.properties?.['BBOX_N']).toBe(50);
      expect(usa?.properties?.['BBOX_AM']).toBe(0);
    });

    it('should set BBOX_AM=1 and BBOX_E > 180 for an antimeridian-crossing territory', () => {
      const input: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { NAME: 'Fiji', SUBJECTO: '' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [178, -10],
                  [-178, -10],
                  [-178, 10],
                  [178, 10],
                  [178, -10],
                ],
              ],
            },
          },
        ],
      };
      const { polygons } = mergeByName(input);
      const fiji = polygons.features.find((f) => f.properties?.['NAME'] === 'Fiji');
      expect(fiji?.properties?.['BBOX_AM']).toBe(1);
      expect(fiji?.properties?.['BBOX_E']).toBeGreaterThan(180);
    });
  });
});
