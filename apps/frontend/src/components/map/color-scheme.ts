import type { ExpressionSpecification } from 'maplibre-gl';
import { CachedFetcher } from '../../lib/cached-fetcher';

const TERRITORY_FALLBACK_COLOR = '#cccccc';
const COLOR_SCHEME_PATH = '/data/color-scheme.json';

const colorSchemeFetcher = new CachedFetcher<Record<string, string>>({
  async fetch() {
    const response = await fetch(COLOR_SCHEME_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load color scheme: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Record<string, string>;
  },
});

export async function loadColorScheme(): Promise<Record<string, string>> {
  return colorSchemeFetcher.load();
}

export function clearColorSchemeCache(): void {
  colorSchemeFetcher.clear();
}

export function createMatchColorExpression(
  colorScheme: Record<string, string> | null,
): ExpressionSpecification {
  const scheme = colorScheme;

  if (!scheme) {
    return ['literal', TERRITORY_FALLBACK_COLOR] as unknown as ExpressionSpecification;
  }

  const entries = Object.entries(scheme);

  return [
    'match',
    ['case', ['==', ['get', 'SUBJECTO'], ''], ['get', 'NAME'], ['get', 'SUBJECTO']],
    ...entries.flat(),
    TERRITORY_FALLBACK_COLOR,
  ] as unknown as ExpressionSpecification;
}
