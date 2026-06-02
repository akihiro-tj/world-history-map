import { render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EraSummary } from '@/domain/era-summary/types';
import { createHistoricalYear } from '@/domain/year/historical-year';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

const mockCloseSummary = vi.fn();
let mockSelectedYear = createHistoricalYear(1650);
let mockIsSummaryPanelOpen = true;

vi.mock('@/contexts/app-state-context', () => ({
  useAppState: () => ({
    state: {
      selectedYear: mockSelectedYear,
      activePanel: mockIsSummaryPanelOpen ? { kind: 'summary' } : { kind: 'none' },
    },
    actions: {
      closePanel: mockCloseSummary,
    },
  }),
}));

const mockSummary1650: EraSummary = {
  year: createHistoricalYear(1650),
  regions: [
    {
      region: 'europe',
      title: 'ヨーロッパ',
      context: '三十年戦争が終結し、主権国家体制が成立。',
      references: [],
    },
    {
      region: 'east-asia',
      title: '東アジア',
      context: '清が中国本土を支配。',
      references: [],
    },
  ],
};

let mockSummaryValue: EraSummary | null = mockSummary1650;
let mockIsLoading = false;
let mockError: string | null = null;

vi.mock('./hooks/use-era-summary', () => ({
  useEraSummary: () => ({
    summary: mockSummaryValue,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

vi.mock('@/hooks/use-year-index', () => ({
  useYearIndex: () => ({
    years: [{ year: createHistoricalYear(1650), filename: 'world_1650.pmtiles', countries: [] }],
    isLoading: false,
  }),
}));

import { EraSummaryPanel } from './era-summary-panel';

describe('EraSummaryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedYear = createHistoricalYear(1650);
    mockIsSummaryPanelOpen = true;
    mockSummaryValue = mockSummary1650;
    mockIsLoading = false;
    mockError = null;
  });

  it('returns null when isSummaryPanelOpen is false', () => {
    mockIsSummaryPanelOpen = false;
    const { container } = render(<EraSummaryPanel />);

    expect(container.firstChild).toBeNull();
  });

  it('renders year heading and region cards when summary is loaded', () => {
    render(<EraSummaryPanel />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('1650年の世界');
    expect(screen.getByRole('heading', { name: 'ヨーロッパ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '東アジア' })).toBeInTheDocument();
  });

  it('renders empty state when summary is null', () => {
    mockSummaryValue = null;
    render(<EraSummaryPanel />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('準備中');
  });

  it('renders with aria-busy when isLoading is true', () => {
    mockIsLoading = true;
    mockSummaryValue = null;
    render(<EraSummaryPanel />);

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders error message when error is set', () => {
    mockError = 'Network error';
    mockSummaryValue = null;
    render(<EraSummaryPanel />);

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<EraSummaryPanel />);

    const panel = screen.getByRole('dialog');
    expect(panel).toHaveAttribute('aria-labelledby', 'era-summary-title');
  });

  it('sets aria-busy when loading', () => {
    mockIsLoading = true;
    mockSummaryValue = null;
    render(<EraSummaryPanel />);

    const panel = screen.getByRole('dialog');
    expect(panel).toHaveAttribute('aria-busy', 'true');
  });

  it('updates content when year changes', () => {
    const { rerender } = render(<EraSummaryPanel />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('1650年の世界');

    mockSelectedYear = createHistoricalYear(1700);
    mockSummaryValue = null;
    rerender(<EraSummaryPanel />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('1700年の世界');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
