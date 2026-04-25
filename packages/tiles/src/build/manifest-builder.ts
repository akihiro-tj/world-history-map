import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { HashedTileFilename } from '../manifest/hashed-tile-filename.ts';
import { TilesManifest } from '../manifest/tiles-manifest.ts';
import { computeHash } from './hash.ts';

export class ManifestBuilder {
  private readonly sourceDir: string;

  constructor(sourceDir: string) {
    this.sourceDir = sourceDir;
  }

  async compute(): Promise<TilesManifest> {
    const entries = await readdir(this.sourceDir).catch(() => [] as string[]);
    const sourceFiles = entries.filter((f) => f.endsWith(HashedTileFilename.sourceExtension));

    const record: Record<string, string> = {};
    for (const filename of sourceFiles) {
      const year = HashedTileFilename.extractYearFromSource(filename);
      if (year === null) continue;
      const content = await readFile(path.join(this.sourceDir, filename));
      record[year] = HashedTileFilename.build(year, computeHash(content)).toString();
    }
    return TilesManifest.fromRecord(record);
  }

  async build(distDir: string): Promise<TilesManifest> {
    await mkdir(distDir, { recursive: true });
    const manifest = await this.compute();

    for (const year of manifest.availableYears()) {
      const filename = manifest.filenameFor(year);
      if (!filename) continue;
      await copyFile(
        path.join(this.sourceDir, `world_${year}.pmtiles`),
        path.join(distDir, filename),
      );
    }
    return manifest;
  }

  async isFresh(existing: TilesManifest): Promise<boolean> {
    const fresh = await this.compute();
    return fresh.equals(existing);
  }
}
