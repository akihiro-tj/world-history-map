import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prepareTile } from '@/stages/prepare.ts';

describe('prepare stage', () => {
  let tempDir: string;
  let sourceDir: string;
  let distDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'prepare-test-'));
    sourceDir = path.join(tempDir, 'public', 'pmtiles');
    distDir = path.join(tempDir, 'dist', 'pmtiles');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(distDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('prepareTile', () => {
    it('should compute SHA-256 hash and return 8-char hex in filename', async () => {
      const sourcePath = path.join(sourceDir, 'world_1650.pmtiles');
      await writeFile(sourcePath, 'fake pmtiles content');

      const result = await prepareTile(1650, sourcePath, distDir);

      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.hashedFilename).toMatch(/^world_1650\.[a-f0-9]{8}\.pmtiles$/);
    });

    it('should copy file to dist directory with hashed name', async () => {
      const sourcePath = path.join(sourceDir, 'world_1650.pmtiles');
      await writeFile(sourcePath, 'fake pmtiles content');

      const result = await prepareTile(1650, sourcePath, distDir);

      const { existsSync } = await import('node:fs');
      const destPath = path.join(distDir, result.hashedFilename);
      expect(existsSync(destPath)).toBe(true);
    });

    it('should produce consistent hashes for same content', async () => {
      const sourcePath = path.join(sourceDir, 'world_1650.pmtiles');
      await writeFile(sourcePath, 'same content');

      const result1 = await prepareTile(1650, sourcePath, distDir);
      const result2 = await prepareTile(1650, sourcePath, distDir);

      expect(result1.hash).toBe(result2.hash);
      expect(result1.hashedFilename).toBe(result2.hashedFilename);
    });

    it('should produce different hashes for different content', async () => {
      const path1 = path.join(sourceDir, 'world_1650.pmtiles');
      const path2 = path.join(sourceDir, 'world_1700.pmtiles');
      await writeFile(path1, 'content A');
      await writeFile(path2, 'content B');

      const result1 = await prepareTile(1650, path1, distDir);
      const result2 = await prepareTile(1700, path2, distDir);

      expect(result1.hash).not.toBe(result2.hash);
    });
  });
});
