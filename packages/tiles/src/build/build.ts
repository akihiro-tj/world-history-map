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
