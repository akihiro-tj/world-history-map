import type { ReactNode } from 'react';
import type { EraSummaryReference } from '@/domain/era-summary/types';
import { createHistoricalYear } from '@/domain/year/historical-year';
import { useYearIndex } from '@/hooks/use-year-index';
import { useAppState } from '../../contexts/app-state-context';

interface SummaryReferencesProps {
  context: string;
  references: readonly EraSummaryReference[];
}

function toTerritoryDisplayName(kebabTarget: string): string {
  return kebabTarget
    .split('-')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function buildNodes(
  context: string,
  references: readonly EraSummaryReference[],
  availableYears: Set<number>,
  onTerritoryClick: (target: string) => void,
  onYearClick: (year: number) => void,
): ReactNode[] {
  const positioned = references
    .map((ref) => ({ ref, index: context.indexOf(ref.text) }))
    .filter(({ index }) => index !== -1)
    .sort((a, b) => a.index - b.index);

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const { ref } of positioned) {
    const matchStart = context.indexOf(ref.text, cursor);
    if (matchStart === -1) continue;

    if (matchStart > cursor) {
      nodes.push(context.slice(cursor, matchStart));
    }

    const key = `${ref.kind}-${ref.target}-${matchStart}`;

    if (ref.kind === 'territory') {
      nodes.push(
        <button
          key={key}
          type="button"
          onClick={() => onTerritoryClick(ref.target)}
          className="underline hover:no-underline"
        >
          {ref.text}
        </button>,
      );
    } else {
      const year = parseInt(ref.target, 10);
      if (Number.isNaN(year) || !availableYears.has(year)) {
        nodes.push(ref.text);
      } else {
        nodes.push(
          <button
            key={key}
            type="button"
            onClick={() => onYearClick(year)}
            className="underline hover:no-underline"
          >
            {ref.text}
          </button>,
        );
      }
    }

    cursor = matchStart + ref.text.length;
  }

  if (cursor < context.length) {
    nodes.push(context.slice(cursor));
  }

  return nodes;
}

export function SummaryReferences({ context, references }: SummaryReferencesProps) {
  const { actions } = useAppState();
  const { years } = useYearIndex();
  const availableYears = new Set(years.map((y) => y.year as number));

  const nodes = buildNodes(
    context,
    references,
    availableYears,
    (target) => actions.selectTerritory(toTerritoryDisplayName(target)),
    (year) => actions.setSelectedYear(createHistoricalYear(year)),
  );

  return <p className="mt-1 text-sm leading-relaxed text-gray-300">{nodes}</p>;
}
