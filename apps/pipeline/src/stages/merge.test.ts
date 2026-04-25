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

    it('should only keep NAME and SUBJECTO properties', () => {
      const input = JSON.parse(readFileSync(path.join(FIXTURES, 'valid-multi.geojson'), 'utf-8'));

      const { polygons } = mergeByName(input);

      const france = polygons.features.find((f) => f.properties?.['NAME'] === 'France');
      expect(france?.properties?.['NAME']).toBe('France');
      expect(france?.properties?.['SUBJECTO']).toBe('');
      expect(Object.keys(france?.properties ?? {})).toEqual(['NAME', 'SUBJECTO']);
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
  });
});
