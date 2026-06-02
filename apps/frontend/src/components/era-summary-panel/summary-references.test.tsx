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

  it('passes the territory NAME to selectTerritory when a territory reference is clicked', () => {
    const refs: EraSummaryReference[] = [{ kind: 'territory', target: 'France', text: 'フランス' }];
    render(<SummaryReferences context="フランスの歴史。" references={refs} />);

    fireEvent.click(screen.getByRole('button', { name: 'フランス' }));

    expect(mockSelectTerritory).toHaveBeenCalledWith('France');
  });

  it('passes a NAME with spaces and lowercase words through unchanged', () => {
    const refs: EraSummaryReference[] = [
      { kind: 'territory', target: 'Tsardom of Muscovy', text: 'ロシア' },
    ];
    render(<SummaryReferences context="ロシアの歴史。" references={refs} />);

    fireEvent.click(screen.getByRole('button', { name: 'ロシア' }));

    expect(mockSelectTerritory).toHaveBeenCalledWith('Tsardom of Muscovy');
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
      { kind: 'territory', target: 'Manchu Empire', text: '清' },
      { kind: 'territory', target: 'Japan', text: '日本' },
    ];
    render(<SummaryReferences context="清と日本が存在する。" references={refs} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('清');
    expect(buttons[1]).toHaveTextContent('日本');
  });

  it('renders blank-line separated context as separate paragraphs', () => {
    render(<SummaryReferences context={'第一段落の文。\n\n第二段落の文。'} references={noRefs} />);

    const first = screen.getByText('第一段落の文。');
    const second = screen.getByText('第二段落の文。');
    expect(first.tagName).toBe('P');
    expect(second.tagName).toBe('P');
    expect(first).not.toBe(second);
  });

  it('annotates a reference inside the paragraph it appears in', () => {
    const refs: EraSummaryReference[] = [{ kind: 'territory', target: 'france', text: 'フランス' }];
    render(<SummaryReferences context={'最初の段落。\n\nフランスの段落。'} references={refs} />);

    expect(screen.getByText('最初の段落。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'フランス' })).toBeInTheDocument();
  });

  it('links a repeated reference only at its first occurrence across paragraphs', () => {
    const refs: EraSummaryReference[] = [{ kind: 'territory', target: 'France', text: 'フランス' }];
    render(
      <SummaryReferences
        context={'フランスが台頭した。\n\nフランスは衰退した。'}
        references={refs}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(screen.getByText('フランスは衰退した。')).toBeInTheDocument();
  });
});
