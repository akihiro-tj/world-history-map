import type { HistoricalYear } from '../year/historical-year';
import { type EraSummary, type EraSummaryReference, isRegionId, type RegionCard } from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseReference(raw: unknown): EraSummaryReference | null {
  if (!isObject(raw)) return null;
  const { kind, target, text } = raw;
  if (kind !== 'territory' && kind !== 'year') return null;
  if (!isNonEmptyString(target) || !isNonEmptyString(text)) return null;
  return { kind, target, text };
}

function parseRegionCard(raw: unknown): RegionCard | null {
  if (!isObject(raw)) return null;
  const { region, title, context, references } = raw;
  if (!isRegionId(region) || !isNonEmptyString(title) || !isNonEmptyString(context)) return null;
  if (!Array.isArray(references)) return null;

  const parsedReferences = references.map(parseReference);
  if (parsedReferences.includes(null)) return null;

  return { region, title, context, references: parsedReferences as EraSummaryReference[] };
}

/**
 * Validates the era-summary JSON shape at the load boundary so malformed or stale
 * files surface as "no summary" rather than rendering broken segments. Returns null
 * on any structural mismatch.
 */
export function parseEraSummary(raw: unknown): EraSummary | null {
  if (!isObject(raw)) return null;
  const { year, regions } = raw;
  if (typeof year !== 'number' || !Array.isArray(regions) || regions.length === 0) return null;

  const parsedRegions = regions.map(parseRegionCard);
  if (parsedRegions.includes(null)) return null;

  return { year: year as HistoricalYear, regions: parsedRegions as RegionCard[] };
}
