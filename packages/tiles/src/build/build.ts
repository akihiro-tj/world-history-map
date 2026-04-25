import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Manifest } from '../types.ts';
import { computeHash, truncateHash } from './hash.ts';

const PMTILES_EXTENSION = '.pmtiles';
const YEAR_IN_FILENAME = /^world_(-?\d+)\.pmtiles$/;

function extractYear(filename: string): string | null {
  return YEAR_IN_FILENAME.exec(filename)?.[1] ?? null;
}

function buildHashedFilename(year: string, fullHash: string): string {
  return `world_${year}.${truncateHash(fullHash)}.pmtiles`;
}

export async function computeManifest(sourceDir: string): Promise<Manifest> {
  const entries = await readdir(sourceDir).catch(() => [] as string[]);
  const pmtilesFiles = entries.filter((f) => f.endsWith(PMTILES_EXTENSION));

  const manifest: Record<string, string> = {};
  for (const filename of pmtilesFiles) {
    const year = extractYear(filename);
    if (year === null) continue;
    const content = await readFile(path.join(sourceDir, filename));
    manifest[year] = buildHashedFilename(year, computeHash(content));
  }
  return manifest;
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
  return freshKeys.every((year) => freshManifest[year] === existingManifest[year]);
}
