import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TilesManifest } from '../manifest/tiles-manifest.ts';
import { ManifestBuilder } from './manifest-builder.ts';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const DEFAULT_SOURCE_DIR = path.join(PACKAGE_ROOT, 'src/pmtiles');
const DEFAULT_DIST_DIR = path.join(PACKAGE_ROOT, 'dist');
const DEFAULT_MANIFEST_PATH = path.join(PACKAGE_ROOT, 'src/manifest.ts');

async function runBuild(): Promise<void> {
  const manifest = await new ManifestBuilder(DEFAULT_SOURCE_DIR).build(DEFAULT_DIST_DIR);
  await writeFile(DEFAULT_MANIFEST_PATH, manifest.toTypeScriptSource());
  console.log(`Built ${manifest.availableYears().length} tiles → manifest.ts`);
}

async function runCheck(): Promise<void> {
  const { manifest: existing } = await import('../manifest.ts');
  const builder = new ManifestBuilder(DEFAULT_SOURCE_DIR);
  const isFresh = await builder.isFresh(TilesManifest.fromRecord(existing));
  process.exit(isFresh ? 0 : 1);
}

const isCheckMode = process.argv.includes('--check');
(isCheckMode ? runCheck() : runBuild()).catch((err) => {
  console.error(err);
  process.exit(1);
});
