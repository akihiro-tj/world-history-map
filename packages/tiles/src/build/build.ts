import { copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { TilesManifest } from '../manifest/tiles-manifest.ts';
import type { Manifest } from '../types.ts';
import { ManifestBuilder } from './manifest-builder.ts';

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
  const source = path.join(sourceDir, 'index.json');
  if (!existsSync(source)) return;
  await copyFile(source, path.join(distDir, 'index.json'));
}
