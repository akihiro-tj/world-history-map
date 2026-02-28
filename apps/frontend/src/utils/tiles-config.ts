export interface TilesManifest {
  version: string;
  files: Record<string, string>;
}

const DEV_MANIFEST: TilesManifest = {
  version: 'development',
  files: {},
};

let cachedManifest: TilesManifest | null = null;

export function getTilesBaseUrl(): string {
  const url = import.meta.env.VITE_TILES_BASE_URL || '';
  // Remove trailing slash to avoid double slashes in URLs
  return url.replace(/\/+$/, '');
}

export function isProductionTiles(): boolean {
  return !!import.meta.env.VITE_TILES_BASE_URL;
}

export async function loadTilesManifest(): Promise<TilesManifest> {
  if (cachedManifest) {
    return cachedManifest;
  }

  if (!isProductionTiles()) {
    cachedManifest = DEV_MANIFEST;
    return cachedManifest;
  }

  const baseUrl = getTilesBaseUrl();
  const response = await fetch(`${baseUrl}/manifest.json`);

  if (!response.ok) {
    throw new Error(`Failed to load tiles manifest: ${response.status}`);
  }

  cachedManifest = (await response.json()) as TilesManifest;
  return cachedManifest;
}

export function getTilesFilename(year: number, manifest: TilesManifest): string | null {
  if (!isProductionTiles()) {
    return `world_${year}.pmtiles`;
  }

  const filename = manifest.files[String(year)];
  return filename || null;
}

export function getTilesUrl(year: number, manifest: TilesManifest): string | null {
  const filename = getTilesFilename(year, manifest);
  if (!filename) {
    return null;
  }

  const baseUrl = getTilesBaseUrl();
  if (baseUrl) {
    return `pmtiles://${baseUrl}/${filename}`;
  }

  return `pmtiles:///pmtiles/${filename}`;
}
