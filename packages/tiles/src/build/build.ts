import { existsSync } from 'node:fs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TilesManifest } from '../manifest/tiles-manifest.ts';
import type { Manifest } from '../types.ts';
import { ManifestBuilder } from './manifest-builder.ts';

export const TILES_INDEX_FILENAME = 'index.json';

export async function computeManifest(sourceDir: string): Promise<Manifest> {
  return (await new ManifestBuilder(sourceDir).compute()).toRecord();
}

export async function buildManifest(sourceDir: string, distDir: string): Promise<Manifest> {
  return (await new ManifestBuilder(sourceDir).build(distDir)).toRecord();
}

export async function isManifestFresh(sourceDir: string, existingManifest: Manifest): Promise<boolean> {
  return new ManifestBuilder(sourceDir).isFresh(TilesManifest.fromRecord(existingManifest));
}

export async function copyIndexJson(sourceDir: string, distDir: string): Promise<void> {
  const source = path.join(sourceDir, TILES_INDEX_FILENAME);
  if (!existsSync(source)) return;
  await mkdir(distDir, { recursive: true });
  await copyFile(source, path.join(distDir, TILES_INDEX_FILENAME));
}

export async function buildTilesPackage(
  sourceDir: string,
  distDir: string,
  manifestPath: string,
): Promise<void> {
  const manifest = await new ManifestBuilder(sourceDir).build(distDir);
  await copyIndexJson(sourceDir, distDir);
  await writeFile(manifestPath, manifest.toTypeScriptSource());
}
