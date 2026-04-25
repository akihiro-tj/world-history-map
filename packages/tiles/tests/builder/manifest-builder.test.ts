import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ManifestBuilder } from '../../src/build/manifest-builder.ts';
import { TilesManifest } from '../../src/manifest/tiles-manifest.ts';
import { asHistoricalYearString } from '../../src/types.ts';

let sourceDir: string;
let distDir: string;

beforeAll(async () => {
  sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manifest-builder-src-'));
  distDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manifest-builder-dist-'));
  await fs.writeFile(path.join(sourceDir, 'world_1600.pmtiles'), Buffer.from('fixture-1600'));
  await fs.writeFile(path.join(sourceDir, 'world_-1.pmtiles'), Buffer.from('fixture-bce'));
});

afterAll(async () => {
  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.rm(distDir, { recursive: true, force: true });
});

describe('ManifestBuilder.compute', () => {
  it('returns a TilesManifest with all source years', async () => {
    const builder = new ManifestBuilder(sourceDir);
    const manifest = await builder.compute();
    expect(manifest.has(asHistoricalYearString('1600'))).toBe(true);
    expect(manifest.has(asHistoricalYearString('-1'))).toBe(true);
  });

  it('returns an empty TilesManifest for a non-existent directory', async () => {
    const builder = new ManifestBuilder('/nonexistent/path');
    const manifest = await builder.compute();
    expect(manifest.availableYears()).toHaveLength(0);
  });
});

describe('ManifestBuilder.build', () => {
  it('copies hashed files to distDir', async () => {
    const builder = new ManifestBuilder(sourceDir);
    const manifest = await builder.build(distDir);
    for (const year of manifest.availableYears()) {
      const filename = manifest.filenameFor(year);
      if (!filename) continue;
      const stat = await fs.stat(path.join(distDir, filename));
      expect(stat.isFile()).toBe(true);
    }
  });
});

describe('ManifestBuilder.isFresh', () => {
  it('returns true when source matches existing manifest', async () => {
    const builder = new ManifestBuilder(sourceDir);
    const fresh = await builder.compute();
    expect(await builder.isFresh(fresh)).toBe(true);
  });

  it('returns false for an empty existing manifest', async () => {
    const builder = new ManifestBuilder(sourceDir);
    expect(await builder.isFresh(TilesManifest.empty())).toBe(false);
  });
});
