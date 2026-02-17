import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeByName } from '@/stages/merge.ts';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures');

describe('merge stage', () => {
  describe('mergeByName', () => {
    it('should pass through single-feature-per-name without change', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));

      const { polygons, labels } = mergeByName(input);

      // 3 unique names → 3 features
      expect(polygons.features).toHaveLength(3);
      expect(labels.features).toHaveLength(3);
    });

    it('should merge same-name polygons into MultiPolygon', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid-multi.geojson'), 'utf-8'));

      const { polygons, labels } = mergeByName(input);

      // 2 "France" + 1 "Spain" → 2 merged features
      expect(polygons.features).toHaveLength(2);

      const france = polygons.features.find((f) => f.properties?.['NAME'] === 'France');
      expect(france?.geometry.type).toBe('MultiPolygon');

      // Labels: one per unique name
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

    it('should preserve feature properties from first feature in group', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid-multi.geojson'), 'utf-8'));

      const { polygons } = mergeByName(input);

      const france = polygons.features.find((f) => f.properties?.['NAME'] === 'France');
      expect(france?.properties?.['PARTOF']).toBe('Europe');
      expect(france?.properties?.['BORDERPRECISION']).toBe(2);
    });

    it('should report feature count correctly', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));
      const { polygons } = mergeByName(input);

      // Input has 3 features, all unique → 3 output features
      expect(polygons.features).toHaveLength(3);
    });
  });
});
