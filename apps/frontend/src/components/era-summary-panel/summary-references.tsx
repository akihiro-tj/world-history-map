import type { ReactNode } from 'react';
import {
  AnnotatedContext,
  type ContextSegment,
  splitIntoParagraphs,
} from '@/domain/era-summary/annotated-context';
import type { EraSummaryReference } from '@/domain/era-summary/types';
import { createHistoricalYear } from '@/domain/year/historical-year';
import { useAppState } from '../../contexts/app-state-context';
import { useAvailableYears } from './hooks/use-available-years';

interface SummaryReferencesProps {
  context: string;
  references: readonly EraSummaryReference[];
}

function renderSegment(
  segment: ContextSegment,
  key: string,
  actions: ReturnType<typeof useAppState>['actions'],
): ReactNode {
  switch (segment.kind) {
    case 'plain':
    case 'year-plain':
      return segment.text;
    case 'territory':
      return (
        <button
          key={key}
          type="button"
          onClick={() => actions.selectTerritory(segment.territoryName)}
          className="underline hover:no-underline"
        >
          {segment.text}
        </button>
      );
    case 'year-link':
      return (
        <button
          key={key}
          type="button"
          onClick={() => actions.setSelectedYear(createHistoricalYear(segment.year))}
          className="underline hover:no-underline"
        >
          {segment.text}
        </button>
      );
  }
}

export function SummaryReferences({ context, references }: SummaryReferencesProps) {
  const { actions } = useAppState();
  const availableYears = useAvailableYears();
  const paragraphs = splitIntoParagraphs(context);

  return (
    <div className="mt-1 space-y-2 text-body-sm leading-relaxed text-text-secondary">
      {paragraphs.map((paragraph) => {
        const segments = new AnnotatedContext(paragraph, references).segments(availableYears);
        return (
          <p key={paragraph}>
            {segments.map((segment, index) =>
              renderSegment(segment, `${segment.kind}-${index}`, actions),
            )}
          </p>
        );
      })}
    </div>
  );
}
