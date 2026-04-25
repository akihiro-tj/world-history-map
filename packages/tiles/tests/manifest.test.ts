import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildManifest } from '../src/build/build.ts';

let sourceDir: string;
let distDir: string;

beforeAll(async () => {
  sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-manifest-src-'));
  distDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-manifest-dist-'));

  await fs.writeFile(path.join(sourceDir, 'world_-1.pmtiles'), Buffer.from('bc-year'));
  await fs.writeFile(path.join(sourceDir, 'world_1000.pmtiles'), Buffer.from('medieval'));
  await fs.writeFile(path.join(sourceDir, 'world_1500.pmtiles'), Buffer.from('renaissance'));
});

afterAll(async () => {
  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.rm(distDir, { recursive: true, force: true });
});

describe('manifest generation', () => {
  it('covers all source pmtiles files', async () => {
    const manifest = await buildManifest(sourceDir, distDir);
    expect(Object.keys(manifest)).toContain('-1');
    expect(Object.keys(manifest)).toContain('1000');
    expect(Object.keys(manifest)).toContain('1500');
  });

  it('uses filename format world_{year}.{12hex}.pmtiles for each entry', async () => {
    const manifest = await buildManifest(sourceDir, distDir);
    for (const [year, filename] of Object.entries(manifest)) {
      expect(filename).toMatch(new RegExp(`^world_${year}\\.[0-9a-f]{12}\\.pmtiles$`));
    }
  });

  it('extracts year from filename correctly including negative years', async () => {
    const manifest = await buildManifest(sourceDir, distDir);
    const keys = Object.keys(manifest).sort((a, b) => Number(a) - Number(b));
    expect(keys).toEqual(['-1', '1000', '1500']);
  });

  it('ignores non-pmtiles files in the source directory', async () => {
    await fs.writeFile(path.join(sourceDir, 'readme.txt'), 'not a tile');
    const manifest = await buildManifest(sourceDir, distDir);
    for (const key of Object.keys(manifest)) {
      expect(key).not.toBe('readme');
    }
  });

  it('returns an empty manifest when source directory has no pmtiles', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-empty-'));
    const emptyDist = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-empty-dist-'));
    try {
      const manifest = await buildManifest(emptyDir, emptyDist);
      expect(Object.keys(manifest)).toHaveLength(0);
    } finally {
      await fs.rm(emptyDir, { recursive: true, force: true });
      await fs.rm(emptyDist, { recursive: true, force: true });
    }
  });
});
