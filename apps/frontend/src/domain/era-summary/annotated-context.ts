import { createHistoricalYear, type HistoricalYear } from '../year/historical-year';
import type { EraSummaryReference } from './types';

export type ContextSegment =
  | { kind: 'plain'; text: string }
  | { kind: 'territory'; text: string; displayName: string }
  | { kind: 'year-link'; text: string; year: HistoricalYear }
  | { kind: 'year-plain'; text: string };

function toTerritoryDisplayName(kebabSlug: string): string {
  return kebabSlug
    .split('-')
    .map((word) => (word.length > 0 ? (word[0]?.toUpperCase() ?? '') + word.slice(1) : word))
    .join(' ');
}

function resolveYearSegment(
  ref: EraSummaryReference,
  availableYears: ReadonlySet<HistoricalYear>,
): ContextSegment {
  const parsed = Number.parseInt(ref.target, 10);
  if (Number.isNaN(parsed)) {
    return { kind: 'year-plain', text: ref.text };
  }
  const year = createHistoricalYear(parsed);
  if (!availableYears.has(year)) {
    return { kind: 'year-plain', text: ref.text };
  }
  return { kind: 'year-link', text: ref.text, year };
}

export class AnnotatedContext {
  readonly #text: string;
  readonly #references: readonly EraSummaryReference[];

  constructor(text: string, references: readonly EraSummaryReference[]) {
    this.#text = text;
    this.#references = references;
  }

  segments(availableYears: ReadonlySet<HistoricalYear>): readonly ContextSegment[] {
    const orderedReferenceMatches = this.#references
      .map((ref) => ({ ref, index: this.#text.indexOf(ref.text) }))
      .filter(({ index }) => index !== -1)
      .sort((a, b) => a.index - b.index);

    const result: ContextSegment[] = [];
    let cursor = 0;

    for (const { ref } of orderedReferenceMatches) {
      const matchStart = this.#text.indexOf(ref.text, cursor);
      if (matchStart === -1) continue;

      if (matchStart > cursor) {
        result.push({ kind: 'plain', text: this.#text.slice(cursor, matchStart) });
      }

      if (ref.kind === 'territory') {
        result.push({
          kind: 'territory',
          text: ref.text,
          displayName: toTerritoryDisplayName(ref.target),
        });
      } else {
        result.push(resolveYearSegment(ref, availableYears));
      }

      cursor = matchStart + ref.text.length;
    }

    if (cursor < this.#text.length) {
      result.push({ kind: 'plain', text: this.#text.slice(cursor) });
    }

    return result;
  }
}
