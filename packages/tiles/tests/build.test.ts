import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildManifest } from '../src/build/build.ts';

let sourceDir: string;
let distDir1: string;
let distDir2: string;

beforeAll(async () => {
  sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-build-src-'));
  distDir1 = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-build-dist1-'));
  distDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-build-dist2-'));

  await fs.writeFile(path.join(sourceDir, 'world_100.pmtiles'), Buffer.from('fixture-year-100'));
  await fs.writeFile(path.join(sourceDir, 'world_200.pmtiles'), Buffer.from('fixture-year-200'));
});

afterAll(async () => {
  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.rm(distDir1, { recursive: true, force: true });
  await fs.rm(distDir2, { recursive: true, force: true });
});

describe('buildManifest', () => {
  it('produces identical manifest on repeated runs with the same input', async () => {
    const manifest1 = await buildManifest(sourceDir, distDir1);
    const manifest2 = await buildManifest(sourceDir, distDir2);
    expect(manifest1).toEqual(manifest2);
  });

  it('maps each year key to a hashed filename', async () => {
    const manifest = await buildManifest(sourceDir, distDir1);
    expect(manifest['100']).toMatch(/^world_100\.[0-9a-f]{12}\.pmtiles$/);
    expect(manifest['200']).toMatch(/^world_200\.[0-9a-f]{12}\.pmtiles$/);
  });

  it('writes the hashed files into distDir', async () => {
    const manifest = await buildManifest(sourceDir, distDir1);
    for (const filename of Object.values(manifest)) {
      const stat = await fs.stat(path.join(distDir1, filename));
      expect(stat.isFile()).toBe(true);
    }
  });

  it('preserves the original file bytes in the hashed copy', async () => {
    const manifest = await buildManifest(sourceDir, distDir1);
    const filename = manifest['100'];
    if (!filename) throw new Error('year 100 not in manifest');
    const original = await fs.readFile(path.join(sourceDir, 'world_100.pmtiles'));
    const hashed = await fs.readFile(path.join(distDir1, filename));
    expect(hashed).toEqual(original);
  });

  it('assigns different hashes to files with different content', async () => {
    const manifest = await buildManifest(sourceDir, distDir1);
    const hash100 = manifest['100']?.match(/\.([0-9a-f]{12})\.pmtiles$/)?.[1];
    const hash200 = manifest['200']?.match(/\.([0-9a-f]{12})\.pmtiles$/)?.[1];
    expect(hash100).toBeTruthy();
    expect(hash200).toBeTruthy();
    expect(hash100).not.toBe(hash200);
  });
});
