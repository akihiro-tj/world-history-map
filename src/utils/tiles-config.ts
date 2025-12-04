/**
 * PMTiles configuration utilities
 *
 * Handles loading tile manifests and constructing URLs for PMTiles files.
 * Supports both local development (using /pmtiles/) and production (using R2 + Workers).
 */

/** PMTiles manifest structure */
export interface TilesManifest {
  /** Generation timestamp */
  version: string;
  /** Map of year to hashed filename */
  files: Record<string, string>;
}

/** Default manifest for development (unhashed filenames) */
const DEV_MANIFEST: TilesManifest = {
  version: 'development',
  files: {},
};

/** Cached manifest */
let cachedManifest: TilesManifest | null = null;

/**
 * Get the base URL for tiles
 * @returns Base URL (empty string for local, Worker URL for production)
 */
export function getTilesBaseUrl(): string {
  return import.meta.env.VITE_TILES_BASE_URL || '';
}

/**
 * Check if running in production mode (using R2)
 */
export function isProductionTiles(): boolean {
  return !!import.meta.env.VITE_TILES_BASE_URL;
}

/**
 * Load tiles manifest
 *
 * In production, fetches manifest.json from R2.
 * In development, returns empty manifest (uses unhashed filenames).
 *
 * @returns Tiles manifest
 */
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

/**
 * Get PMTiles filename for a year
 *
 * In production: Returns hashed filename from manifest (e.g., "world_1600.abc123.pmtiles")
 * In development: Returns unhashed filename (e.g., "world_1600.pmtiles")
 *
 * @param year Target year
 * @param manifest Tiles manifest
 * @returns Filename or null if not found
 */
export function getTilesFilename(year: number, manifest: TilesManifest): string | null {
  if (!isProductionTiles()) {
    // Development: use unhashed filename
    return `world_${year}.pmtiles`;
  }

  // Production: lookup in manifest
  const filename = manifest.files[String(year)];
  return filename || null;
}

/**
 * Get full PMTiles URL for a year
 *
 * @param year Target year
 * @param manifest Tiles manifest
 * @returns PMTiles URL with pmtiles:// protocol, or null if not found
 */
export function getTilesUrl(year: number, manifest: TilesManifest): string | null {
  const filename = getTilesFilename(year, manifest);
  if (!filename) {
    return null;
  }

  const baseUrl = getTilesBaseUrl();
  if (baseUrl) {
    // Production: full URL
    return `pmtiles://${baseUrl}/${filename}`;
  }

  // Development: local path
  return `pmtiles:///pmtiles/${filename}`;
}
