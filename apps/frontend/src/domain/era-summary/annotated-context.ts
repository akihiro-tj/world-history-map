import { createHistoricalYear, type HistoricalYear } from '../year/historical-year';
import type { EraSummaryReference } from './types';

export type ContextSegment =
  | { kind: 'plain'; text: string }
  | { kind: 'territory'; text: string; territoryName: string }
  | { kind: 'year-link'; text: string; year: HistoricalYear }
  | { kind: 'year-plain'; text: string };

const PARAGRAPH_BREAK = /\n\s*\n/;

export function splitIntoParagraphs(context: string): readonly string[] {
  return context
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function resolveYearSegment(
  reference: EraSummaryReference,
  availableYears: ReadonlySet<HistoricalYear>,
): ContextSegment {
  const parsed = Number.parseInt(reference.target, 10);
  if (Number.isNaN(parsed)) {
    return { kind: 'year-plain', text: reference.text };
  }
  const year = createHistoricalYear(parsed);
  if (!availableYears.has(year)) {
    return { kind: 'year-plain', text: reference.text };
  }
  return { kind: 'year-link', text: reference.text, year };
}

function toReferenceSegment(
  reference: EraSummaryReference,
  availableYears: ReadonlySet<HistoricalYear>,
): ContextSegment {
  if (reference.kind === 'territory') {
    return { kind: 'territory', text: reference.text, territoryName: reference.target };
  }
  return resolveYearSegment(reference, availableYears);
}

export class AnnotatedContext {
  readonly #text: string;
  readonly #references: readonly EraSummaryReference[];

  constructor(text: string, references: readonly EraSummaryReference[]) {
    this.#text = text;
    this.#references = references;
  }

  segments(availableYears: ReadonlySet<HistoricalYear>): readonly ContextSegment[] {
    const result: ContextSegment[] = [];
    let cursor = 0;

    for (const reference of this.#referencesByOccurrence()) {
      const matchStart = this.#text.indexOf(reference.text, cursor);
      if (matchStart === -1) continue;

      if (matchStart > cursor) {
        result.push({ kind: 'plain', text: this.#text.slice(cursor, matchStart) });
      }
      result.push(toReferenceSegment(reference, availableYears));
      cursor = matchStart + reference.text.length;
    }

    if (cursor < this.#text.length) {
      result.push({ kind: 'plain', text: this.#text.slice(cursor) });
    }

    return result;
  }

  #referencesByOccurrence(): readonly EraSummaryReference[] {
    return this.#references
      .map((reference) => ({ reference, index: this.#text.indexOf(reference.text) }))
      .filter(({ index }) => index !== -1)
      .sort((a, b) => a.index - b.index)
      .map(({ reference }) => reference);
  }
}
