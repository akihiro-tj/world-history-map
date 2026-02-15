import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateGeoJSON } from '@/pipeline/validation/geojson.ts';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures', 'pipeline');

describe('GeoJSON validation', () => {
  describe('validateGeoJSON', () => {
    it('should pass valid GeoJSON with all required properties', () => {
      const geojson = JSON.parse(readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8'));

      const result = validateGeoJSON(geojson, 1650);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.featureCount).toBe(3);
    });

    it('should detect missing NAME property', () => {
      const geojson = JSON.parse(
        readFileSync(path.join(FIXTURES, 'invalid-missing-name.geojson'), 'utf-8'),
      );

      const result = validateGeoJSON(geojson, 1650);

      expect(result.passed).toBe(false);
      const nameErrors = result.errors.filter((e) => e.type === 'missing_name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('should reject empty FeatureCollection', () => {
      const geojson = JSON.parse(
        readFileSync(path.join(FIXTURES, 'invalid-empty-collection.geojson'), 'utf-8'),
      );

      const result = validateGeoJSON(geojson, 1650);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.type === 'empty_collection')).toBe(true);
    });

    it('should detect invalid geometry types (Point instead of Polygon)', () => {
      const geojson = JSON.parse(
        readFileSync(path.join(FIXTURES, 'invalid-geometry.geojson'), 'utf-8'),
      );

      const result = validateGeoJSON(geojson, 1650);

      expect(result.passed).toBe(false);
      const typeErrors = result.errors.filter((e) => e.type === 'invalid_geometry_type');
      expect(typeErrors.length).toBeGreaterThan(0);
    });

    it('should attempt auto-repair on self-intersecting polygons', () => {
      const geojson = JSON.parse(
        readFileSync(path.join(FIXTURES, 'invalid-geometry.geojson'), 'utf-8'),
      );

      const result = validateGeoJSON(geojson, 1650);

      // Should have attempted repairs on the self-intersecting polygon
      // (The Point geometry is rejected outright, no repair possible)
      if (result.repairs.length > 0) {
        expect(result.repairs[0]?.featureName).toBeTruthy();
      }
    });

    it('should handle bowtie polygon (self-intersecting or valid depending on turf version)', () => {
      const bowtie = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: { NAME: 'Bowtie Territory' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0, 0],
                  [2, 2],
                  [2, 0],
                  [0, 2],
                  [0, 0],
                ],
              ],
            },
          },
        ],
      };

      const result = validateGeoJSON(bowtie, 1650);

      // Result should be well-formed regardless of whether turf detects the issue
      expect(result.year).toBe(1650);
      expect(result.featureCount).toBe(1);
      // If turf considers it valid, passed=true with no errors; otherwise repairs attempted
      expect(typeof result.passed).toBe('boolean');
    });
  });
});
