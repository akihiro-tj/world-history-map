import { describe, expect, it, vi } from 'vitest';

// Mock the exec wrapper module
vi.mock('@/pipeline/exec.ts', () => ({
  execFileAsync: vi.fn(),
}));

import { execFileAsync } from '@/pipeline/exec.ts';
import { buildTippecanoeArgs, executeConvert } from '@/pipeline/stages/convert.ts';
import type { PipelineLogger } from '@/pipeline/stages/types.ts';

const mockExecFileAsync = vi.mocked(execFileAsync);

function createMockLogger(): PipelineLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    timing: vi.fn(),
  };
}

describe('convert stage', () => {
  describe('buildTippecanoeArgs', () => {
    it('should build correct args for territories layer', () => {
      const args = buildTippecanoeArgs('territories', '/tmp/input.geojson', '/tmp/output.pmtiles');

      expect(args).toContain('-l');
      expect(args).toContain('territories');
      expect(args).toContain('-z');
      expect(args).toContain('10');
      expect(args).toContain('-Z');
      expect(args).toContain('0');
      expect(args).toContain('--simplification=10');
      expect(args).toContain('--force');
      expect(args).toContain('--output=/tmp/output.pmtiles');
      expect(args[args.length - 1]).toBe('/tmp/input.geojson');
    });

    it('should build correct args for labels layer', () => {
      const args = buildTippecanoeArgs('labels', '/tmp/labels.geojson', '/tmp/labels.pmtiles');

      expect(args).toContain('-l');
      expect(args).toContain('labels');
      expect(args).toContain('-r1');
      expect(args).toContain('--no-feature-limit');
      expect(args).toContain('--no-tile-size-limit');
    });
  });

  describe('executeConvert', () => {
    it('should call tippecanoe and tile-join in sequence', async () => {
      const logger = createMockLogger();

      mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' } as never);

      await executeConvert(
        { polygonsPath: '/tmp/poly.geojson', labelsPath: '/tmp/labels.geojson' },
        '/tmp/output.pmtiles',
        '/tmp',
        logger,
      );

      // 3 calls: tippecanoe for territories, tippecanoe for labels, tile-join
      expect(mockExecFileAsync).toHaveBeenCalledTimes(3);

      // First call: tippecanoe for territories
      expect(mockExecFileAsync).toHaveBeenNthCalledWith(
        1,
        'tippecanoe',
        expect.arrayContaining(['-l', 'territories']),
        expect.anything(),
      );

      // Second call: tippecanoe for labels
      expect(mockExecFileAsync).toHaveBeenNthCalledWith(
        2,
        'tippecanoe',
        expect.arrayContaining(['-l', 'labels']),
        expect.anything(),
      );

      // Third call: tile-join
      expect(mockExecFileAsync).toHaveBeenNthCalledWith(
        3,
        'tile-join',
        expect.arrayContaining(['--force']),
        expect.anything(),
      );
    });

    it('should throw when tippecanoe is not installed', async () => {
      const logger = createMockLogger();

      const err = new Error('tippecanoe not found') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockExecFileAsync.mockRejectedValue(err);

      await expect(
        executeConvert(
          { polygonsPath: '/tmp/poly.geojson', labelsPath: '/tmp/labels.geojson' },
          '/tmp/output.pmtiles',
          '/tmp',
          logger,
        ),
      ).rejects.toThrow();
    });
  });
});
