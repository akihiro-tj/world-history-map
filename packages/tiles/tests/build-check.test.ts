import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildManifest, isManifestFresh } from '../src/build/build.ts';

let sourceDir: string;
let distDir: string;

beforeAll(async () => {
  sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-check-src-'));
  distDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-check-dist-'));

  await fs.writeFile(path.join(sourceDir, 'world_300.pmtiles'), Buffer.from('year-300-content'));
  await fs.writeFile(path.join(sourceDir, 'world_400.pmtiles'), Buffer.from('year-400-content'));
});

afterAll(async () => {
  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.rm(distDir, { recursive: true, force: true });
});

describe('isManifestFresh', () => {
  it('returns true when the existing manifest matches a fresh computation', async () => {
    const freshManifest = await buildManifest(sourceDir, distDir);
    const isFresh = await isManifestFresh(sourceDir, freshManifest);
    expect(isFresh).toBe(true);
  });

  it('returns false when a file has been added since the manifest was built', async () => {
    const oldManifest = await buildManifest(sourceDir, distDir);

    await fs.writeFile(path.join(sourceDir, 'world_500.pmtiles'), Buffer.from('new-year-500'));

    const isFresh = await isManifestFresh(sourceDir, oldManifest);
    expect(isFresh).toBe(false);

    await fs.rm(path.join(sourceDir, 'world_500.pmtiles'));
  });

  it('returns false when a file content has changed since the manifest was built', async () => {
    const oldManifest = await buildManifest(sourceDir, distDir);

    await fs.writeFile(path.join(sourceDir, 'world_300.pmtiles'), Buffer.from('modified-content'));

    const isFresh = await isManifestFresh(sourceDir, oldManifest);
    expect(isFresh).toBe(false);

    await fs.writeFile(path.join(sourceDir, 'world_300.pmtiles'), Buffer.from('year-300-content'));
  });

  it('returns false when the manifest references a year that is no longer in the source', async () => {
    const manifestWithExtra = {
      '300': 'world_300.abc123def456.pmtiles',
      '999': 'world_999.aabbccddeeff.pmtiles',
    };
    const isFresh = await isManifestFresh(sourceDir, manifestWithExtra);
    expect(isFresh).toBe(false);
  });
});
