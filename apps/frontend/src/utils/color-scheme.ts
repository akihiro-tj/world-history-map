import type { ExpressionSpecification } from 'maplibre-gl';

const DEFAULT_COLOR = '#cccccc';
const COLOR_SCHEME_PATH = '/data/color-scheme.json';
let cachedColorScheme: Record<string, string> | null = null;

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

export function clearColorSchemeCache(): void {
  cachedColorScheme = null;
}

export function getColorForSubjecto(subjecto: string): string {
  if (!cachedColorScheme) {
    return DEFAULT_COLOR;
  }
  return cachedColorScheme[subjecto] ?? DEFAULT_COLOR;
}

export function createMatchColorExpression(): ExpressionSpecification {
  if (!cachedColorScheme) {
    return ['literal', DEFAULT_COLOR] as unknown as ExpressionSpecification;
  }

  const entries = Object.entries(cachedColorScheme);

  return [
    'match',
    ['case', ['==', ['get', 'SUBJECTO'], ''], ['get', 'NAME'], ['get', 'SUBJECTO']],
    ...entries.flat(),
    DEFAULT_COLOR,
  ] as unknown as ExpressionSpecification;
}
