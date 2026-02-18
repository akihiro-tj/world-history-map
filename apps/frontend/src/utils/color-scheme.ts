import type { ExpressionSpecification } from 'maplibre-gl';

/**
 * Default color for territories not in the predefined list
 */
const DEFAULT_COLOR = '#cccccc';

/** Path to the color scheme JSON file */
const COLOR_SCHEME_PATH = '/data/color-scheme.json';

/** Cached color scheme dictionary */
let cachedColorScheme: Record<string, string> | null = null;

/**
 * Load color scheme dictionary
 *
 * Returns a cached result if already loaded.
 *
 * @returns Color mapping from SUBJECTO name to HSL color string
 * @throws When loading fails
 */
export async function loadColorScheme(): Promise<Record<string, string>> {
  if (cachedColorScheme) {
    return cachedColorScheme;
  }

  const response = await fetch(COLOR_SCHEME_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load color scheme: ${response.status} ${response.statusText}`);
  }

  cachedColorScheme = (await response.json()) as Record<string, string>;
  return cachedColorScheme;
}

/**
 * Clear the cached color scheme (for testing)
 */
export function clearColorSchemeCache(): void {
  cachedColorScheme = null;
}

/**
 * Get color for a specific SUBJECTO value
 *
 * Must be called after loadColorScheme() has resolved.
 */
export function getColorForSubjecto(subjecto: string): string {
  if (!cachedColorScheme) {
    return DEFAULT_COLOR;
  }
  return cachedColorScheme[subjecto] ?? DEFAULT_COLOR;
}

/**
 * Create MapLibre match expression for territory colors
 * Falls back to NAME attribute when SUBJECTO is empty
 *
 * Must be called after loadColorScheme() has resolved.
 */
export function createMatchColorExpression(): ExpressionSpecification {
  if (!cachedColorScheme) {
    return ['literal', DEFAULT_COLOR] as unknown as ExpressionSpecification;
  }

  const entries = Object.entries(cachedColorScheme);

  return [
    'match',
    // Use NAME as fallback when SUBJECTO is empty string
    ['case', ['==', ['get', 'SUBJECTO'], ''], ['get', 'NAME'], ['get', 'SUBJECTO']],
    ...entries.flat(),
    DEFAULT_COLOR,
  ] as unknown as ExpressionSpecification;
}
