import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EraSummaryReference } from '@/domain/era-summary/types';
import { createHistoricalYear } from '@/domain/year/historical-year';

const mockSelectTerritory = vi.fn();
const mockSetSelectedYear = vi.fn();

vi.mock('@/contexts/app-state-context', () => ({
  useAppState: () => ({
    state: { selectedYear: createHistoricalYear(1650) },
    actions: {
      selectTerritory: mockSelectTerritory,
      setSelectedYear: mockSetSelectedYear,
    },
  }),
}));

vi.mock('@/hooks/use-year-index', () => ({
  useYearIndex: () => ({
    years: [
      { year: createHistoricalYear(1650), filename: 'world_1650.pmtiles', countries: [] },
      { year: createHistoricalYear(1700), filename: 'world_1700.pmtiles', countries: [] },
    ],
    isLoading: false,
  }),
}));

import { SummaryReferences } from './summary-references';

const noRefs: EraSummaryReference[] = [];

describe('SummaryReferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders context verbatim when references array is empty', () => {
    render(<SummaryReferences context="三十年戦争が終結した。" references={noRefs} />);

    expect(screen.getByText('三十年戦争が終結した。')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders context verbatim when no reference text matches', () => {
    const refs: EraSummaryReference[] = [{ kind: 'territory', target: 'france', text: 'フランス' }];
    render(<SummaryReferences context="存在しないテキストを含む文。" references={refs} />);

    expect(screen.getByText('存在しないテキストを含む文。')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('wraps matching text in a button leaving surrounding text as plain', () => {
    const refs: EraSummaryReference[] = [{ kind: 'territory', target: 'france', text: 'フランス' }];
    render(<SummaryReferences context="フランスでは絶対王政が確立。" references={refs} />);

    expect(screen.getByRole('button', { name: 'フランス' })).toBeInTheDocument();
    expect(screen.getByText('では絶対王政が確立。')).toBeInTheDocument();
  });

  it('dispatches selectTerritory with title-cased name when territory reference is clicked', () => {
    const refs: EraSummaryReference[] = [{ kind: 'territory', target: 'france', text: 'フランス' }];
    render(<SummaryReferences context="フランスの歴史。" references={refs} />);

    fireEvent.click(screen.getByRole('button', { name: 'フランス' }));

    expect(mockSelectTerritory).toHaveBeenCalledWith('France');
  });

  it('converts multi-word kebab-case territory to title case', () => {
    const refs: EraSummaryReference[] = [
      { kind: 'territory', target: 'ottoman-empire', text: 'オスマン帝国' },
    ];
    render(<SummaryReferences context="オスマン帝国の歴史。" references={refs} />);

    fireEvent.click(screen.getByRole('button', { name: 'オスマン帝国' }));

    expect(mockSelectTerritory).toHaveBeenCalledWith('Ottoman Empire');
  });

  it('dispatches setSelectedYear when year reference is clicked and year is available', () => {
    const refs: EraSummaryReference[] = [{ kind: 'year', target: '1650', text: '1650 年' }];
    render(<SummaryReferences context="1650 年に始まった。" references={refs} />);

    fireEvent.click(screen.getByRole('button', { name: '1650 年' }));

    expect(mockSetSelectedYear).toHaveBeenCalledWith(createHistoricalYear(1650));
  });

  it('renders unavailable year reference as plain text without link', () => {
    const refs: EraSummaryReference[] = [{ kind: 'year', target: '1648', text: '1648 年' }];
    render(<SummaryReferences context="1648 年に条約が締結された。" references={refs} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/1648/)).toBeInTheDocument();
  });

  it('skips year reference with invalid target and renders as plain text', () => {
    const refs: EraSummaryReference[] = [{ kind: 'year', target: 'invalid', text: '不明な年' }];
    render(<SummaryReferences context="不明な年の出来事。" references={refs} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('processes multiple references in order of first occurrence', () => {
    const refs: EraSummaryReference[] = [
      { kind: 'territory', target: 'qing', text: '清' },
      { kind: 'territory', target: 'japan', text: '日本' },
    ];
    render(<SummaryReferences context="清と日本が存在する。" references={refs} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('清');
    expect(buttons[1]).toHaveTextContent('日本');
  });
});
