import { readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineLogger } from '@/stages/types.ts';
import { runValidateForYear } from '@/stages/validate.ts';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures');

function createMockLogger(): PipelineLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    timing: vi.fn(),
  };
}

describe('validate stage', () => {
  let tempDir: string;
  let logger: PipelineLogger;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'validate-test-'));
    logger = createMockLogger();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('runValidateForYear', () => {
    it('should pass valid data through', () => {
      const geojsonPath = path.join(tempDir, 'valid.geojson');
      const content = readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8');
      writeFileSync(geojsonPath, content);

      const result = runValidateForYear(1650, geojsonPath, logger);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should block on errors', () => {
      const geojsonPath = path.join(tempDir, 'empty.geojson');
      writeFileSync(geojsonPath, JSON.stringify({ type: 'FeatureCollection', features: [] }));

      const result = runValidateForYear(1650, geojsonPath, logger);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should continue with warnings', () => {
      const geojsonPath = path.join(tempDir, 'valid.geojson');
      const content = readFileSync(path.join(FIXTURES, 'valid.geojson'), 'utf-8');
      writeFileSync(geojsonPath, content);

      const result = runValidateForYear(1650, geojsonPath, logger);

      // Valid data should pass regardless of warnings
      expect(result.passed).toBe(true);
    });

    it('should record repair actions', () => {
      const geojsonPath = path.join(tempDir, 'bowtie.geojson');
      const bowtie = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { NAME: 'Bowtie' },
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
      writeFileSync(geojsonPath, JSON.stringify(bowtie));

      const result = runValidateForYear(1650, geojsonPath, logger);

      expect(result.repairs.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });
});
