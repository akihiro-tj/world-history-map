import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { HashedTileFilename } from '../manifest/hashed-tile-filename.ts';
import type { Manifest } from '../types.ts';
import { computeHash } from './hash.ts';

export async function computeManifest(sourceDir: string): Promise<Manifest> {
  const entries = await readdir(sourceDir).catch(() => [] as string[]);
  const sourceFiles = entries.filter((f) => f.endsWith(HashedTileFilename.sourceExtension));

  const record: Record<string, string> = {};
  for (const filename of sourceFiles) {
    const year = HashedTileFilename.extractYearFromSource(filename);
    if (year === null) continue;
    const content = await readFile(path.join(sourceDir, filename));
    record[year] = HashedTileFilename.build(year, computeHash(content)).toString();
  }
  return record as unknown as Manifest;
}

export async function buildManifest(sourceDir: string, distDir: string): Promise<Manifest> {
  await mkdir(distDir, { recursive: true });
  const manifest = await computeManifest(sourceDir);

  for (const [year, hashedFilename] of Object.entries(manifest)) {
    await copyFile(path.join(sourceDir, `world_${year}.pmtiles`), path.join(distDir, hashedFilename));
  }
  return manifest;
}

export async function isManifestFresh(sourceDir: string, existingManifest: Manifest): Promise<boolean> {
  const freshManifest = await computeManifest(sourceDir);
  const freshKeys = Object.keys(freshManifest).sort();
  const existingKeys = Object.keys(existingManifest).sort();

  if (freshKeys.join(',') !== existingKeys.join(',')) return false;
  const fresh = freshManifest as Record<string, string>;
  const existing = existingManifest as Record<string, string>;
  return freshKeys.every((year) => fresh[year] === existing[year]);
}
