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

export function SummaryReferences({ context, references }: SummaryReferencesProps) {
  const { actions } = useAppState();
  const availableYears = useAvailableYears();

  const paragraphs = splitIntoParagraphs(context).map((text, index) => ({
    key: `${index}:${text}`,
    segments: new AnnotatedContext(text, references).segments(availableYears),
  }));

  return (
    <div className="mt-1 space-y-2 text-body-sm leading-relaxed text-text-secondary">
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
