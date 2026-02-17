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
import { computeUploadPlan, executeUpload } from '@/stages/upload.ts';
import type { DeploymentManifest } from '@/types/pipeline.ts';

const mockExecFileAsync = vi.mocked(execFileAsync);

function createMockLogger(): PipelineLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    timing: vi.fn(),
  };
}

describe('upload stage', () => {
  let tempDir: string;
  let distDir: string;
  let logger: PipelineLogger;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'upload-test-'));
    distDir = path.join(tempDir, 'dist', 'pmtiles');
    logger = createMockLogger();
    vi.clearAllMocks();
    const { mkdir } = await import('node:fs/promises');
    await mkdir(distDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('computeUploadPlan', () => {
    it('should detect changed files by comparing hashes', () => {
      const currentManifest: DeploymentManifest = {
        version: 'old',
        files: { '1650': 'world_1650.old12345.pmtiles' },
        metadata: { '1650': { hash: 'aaa', size: 100 } },
      };
      const newFiles = new Map([
        ['1650', { hashedFilename: 'world_1650.new12345.pmtiles', hash: 'bbb', size: 100 }],
      ]);

      const plan = computeUploadPlan(currentManifest, newFiles);

      expect(plan.toUpload).toHaveLength(1);
      expect(plan.toSkip).toHaveLength(0);
    });

    it('should skip unchanged files', () => {
      const currentManifest: DeploymentManifest = {
        version: 'old',
        files: { '1650': 'world_1650.abc12345.pmtiles' },
        metadata: { '1650': { hash: 'same_hash', size: 100 } },
      };
      const newFiles = new Map([
        ['1650', { hashedFilename: 'world_1650.abc12345.pmtiles', hash: 'same_hash', size: 100 }],
      ]);

      const plan = computeUploadPlan(currentManifest, newFiles);

      expect(plan.toUpload).toHaveLength(0);
      expect(plan.toSkip).toHaveLength(1);
    });

    it('should upload all on first deploy (no previous manifest)', () => {
      const currentManifest: DeploymentManifest = {
        version: 'new',
        files: {},
      };
      const newFiles = new Map([
        ['1650', { hashedFilename: 'world_1650.aaa.pmtiles', hash: 'h1', size: 100 }],
        ['1700', { hashedFilename: 'world_1700.bbb.pmtiles', hash: 'h2', size: 200 }],
      ]);

      const plan = computeUploadPlan(currentManifest, newFiles);

      expect(plan.toUpload).toHaveLength(2);
      expect(plan.toSkip).toHaveLength(0);
    });
  });

  describe('executeUpload', () => {
    it('should call wrangler for files that need uploading', async () => {
      await writeFile(path.join(distDir, 'world_1650.abc.pmtiles'), 'fake tile data');
      mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' } as never);

      const plan = {
        toUpload: [{ year: '1650', filename: 'world_1650.abc.pmtiles' }],
        toSkip: [],
      };

      await executeUpload(plan, distDir, 'my-bucket', logger);

      expect(mockExecFileAsync).toHaveBeenCalledTimes(1);
      const callArgs = mockExecFileAsync.mock.calls[0];
      expect(callArgs?.[0]).toBe('wrangler');
      expect(callArgs?.[1]).toContain('--remote');
      expect(callArgs?.[1]).toEqual(expect.arrayContaining(['r2', 'object', 'put']));
    });

    it('should log skipped files', async () => {
      const plan = {
        toUpload: [],
        toSkip: [{ year: '1650', filename: 'world_1650.abc.pmtiles' }],
      };

      await executeUpload(plan, distDir, 'my-bucket', logger);

      expect(mockExecFileAsync).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('upload', expect.stringContaining('skipped'));
    });
  });
});
