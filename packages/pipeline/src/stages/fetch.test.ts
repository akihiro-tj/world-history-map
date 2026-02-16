import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineLogger } from '@/stages/types.ts';

// Mock the exec wrapper module
vi.mock('@/exec.ts', () => ({
  execFileAsync: vi.fn(),
}));

import { execFileAsync } from '@/exec.ts';
import { executeFetch, parseYearsFromDirectory } from '@/stages/fetch.ts';

const mockExecFileAsync = vi.mocked(execFileAsync);

function createMockLogger(): PipelineLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    timing: vi.fn(),
  };
}

describe('fetch stage', () => {
  let tempDir: string;
  let logger: PipelineLogger;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'fetch-test-'));
    logger = createMockLogger();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('executeFetch', () => {
    it('should git clone when cache directory does not exist', async () => {
      const repoDir = path.join(tempDir, 'historical-basemaps');
      mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' } as never);

      await executeFetch(repoDir, 'https://example.com/repo.git', logger);

      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['clone', '--depth', '1', 'https://example.com/repo.git', repoDir],
        expect.anything(),
      );
    });

    it('should git pull when cache directory exists', async () => {
      const repoDir = path.join(tempDir, 'historical-basemaps');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(repoDir, { recursive: true });

      mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' } as never);

      await executeFetch(repoDir, 'https://example.com/repo.git', logger);

      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['-C', repoDir, 'pull'],
        expect.anything(),
      );
    });

    it('should fallback to offline mode when pull fails and cache exists', async () => {
      const repoDir = path.join(tempDir, 'historical-basemaps');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(repoDir, { recursive: true });

      mockExecFileAsync.mockRejectedValue(new Error('network error'));

      // Should not throw - offline fallback
      await executeFetch(repoDir, 'https://example.com/repo.git', logger);

      expect(logger.warn).toHaveBeenCalledWith('fetch', expect.stringContaining('offline'));
    });
  });

  describe('parseYearsFromDirectory', () => {
    it('should detect CE years from filenames', async () => {
      const dir = path.join(tempDir, 'geojson');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(dir, { recursive: true });

      await writeFile(path.join(dir, 'world_1650.geojson'), '{}');
      await writeFile(path.join(dir, 'world_1700.geojson'), '{}');

      const years = await parseYearsFromDirectory(dir);
      expect(years).toContain(1650);
      expect(years).toContain(1700);
    });

    it('should detect BCE years from filenames', async () => {
      const dir = path.join(tempDir, 'geojson');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(dir, { recursive: true });

      await writeFile(path.join(dir, 'world_bc1000.geojson'), '{}');
      await writeFile(path.join(dir, 'world_bc500.geojson'), '{}');

      const years = await parseYearsFromDirectory(dir);
      expect(years).toContain(-1000);
      expect(years).toContain(-500);
    });

    it('should sort years in ascending order', async () => {
      const dir = path.join(tempDir, 'geojson');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(dir, { recursive: true });

      await writeFile(path.join(dir, 'world_1700.geojson'), '{}');
      await writeFile(path.join(dir, 'world_bc1000.geojson'), '{}');
      await writeFile(path.join(dir, 'world_1650.geojson'), '{}');

      const years = await parseYearsFromDirectory(dir);
      expect(years).toEqual([-1000, 1650, 1700]);
    });

    it('should ignore non-matching files', async () => {
      const dir = path.join(tempDir, 'geojson');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(dir, { recursive: true });

      await writeFile(path.join(dir, 'world_1650.geojson'), '{}');
      await writeFile(path.join(dir, 'readme.txt'), '');
      await writeFile(path.join(dir, 'other.geojson'), '{}');

      const years = await parseYearsFromDirectory(dir);
      expect(years).toEqual([1650]);
    });
  });
});
