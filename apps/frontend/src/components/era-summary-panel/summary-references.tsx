import { type ReactNode, useMemo } from 'react';
import {
  AnnotatedContext,
  type ContextSegment,
  splitIntoParagraphs,
} from '@/domain/era-summary/annotated-context';
import type { EraSummaryReference } from '@/domain/era-summary/types';
import { createHistoricalYear, type HistoricalYear } from '@/domain/year/historical-year';
import { useAppState } from '../../contexts/app-state-context';
import { useAvailableYears } from './hooks/use-available-years';

interface SummaryReferencesProps {
  context: string;
  references: readonly EraSummaryReference[];
}

type AppActions = ReturnType<typeof useAppState>['actions'];

function assertNever(value: never): never {
  throw new Error(`Unhandled context segment: ${JSON.stringify(value)}`);
}

function ReferenceButton({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="underline hover:no-underline">
      {text}
    </button>
  );
}

function renderSegment(segment: ContextSegment, key: string, actions: AppActions): ReactNode {
  switch (segment.kind) {
    case 'plain':
    case 'year-plain':
      return segment.text;
    case 'territory':
      return (
        <ReferenceButton
          key={key}
          text={segment.text}
          onClick={() => actions.selectTerritory(segment.territoryName)}
        />
      );
    case 'year-link':
      return (
        <ReferenceButton
          key={key}
          text={segment.text}
          onClick={() => actions.setSelectedYear(createHistoricalYear(segment.year))}
        />
      );
    default:
      return assertNever(segment);
  }
}

interface AnnotatedParagraph {
  key: string;
  segments: readonly ContextSegment[];
}

/**
 * Splits the context into paragraphs and annotates each, linking every reference
 * at most once across the whole card: once a reference's text is matched in one
 * paragraph it is not re-linked in later paragraphs where it recurs as prose.
 */
function annotateParagraphs(
  context: string,
  references: readonly EraSummaryReference[],
  availableYears: ReadonlySet<HistoricalYear>,
): AnnotatedParagraph[] {
  const unlinked = new Set(references);

  return splitIntoParagraphs(context).map((text, index) => {
    const applicable = references.filter((reference) => unlinked.has(reference));
    const segments = new AnnotatedContext(text, applicable).segments(availableYears);
    for (const reference of applicable) {
      if (text.includes(reference.text)) unlinked.delete(reference);
    }
    return { key: `${index}:${text}`, segments };
  });
}

export function SummaryReferences({ context, references }: SummaryReferencesProps) {
  const { actions } = useAppState();
  const availableYears = useAvailableYears();

  const paragraphs = useMemo(
    () => annotateParagraphs(context, references, availableYears),
    [context, references, availableYears],
  );

  return (
    <div className="mt-1 space-y-2 text-body leading-relaxed text-text-secondary">
      {paragraphs.map((paragraph) => (
        <p key={paragraph.key}>
          {paragraph.segments.map((segment, index) =>
            renderSegment(segment, `${segment.kind}-${index}`, actions),
          )}
        </p>
      ))}
    </div>
  );
}
