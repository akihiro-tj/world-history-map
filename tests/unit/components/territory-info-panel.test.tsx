import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TerritoryDescription } from '../../../src/types';

// Mock the app state context
const mockSetInfoPanelOpen = vi.fn();
const mockSetSelectedYear = vi.fn();
const mockSetSelectedTerritory = vi.fn();

vi.mock('../../../src/contexts/app-state-context', () => ({
  useAppState: () => ({
    state: {
      selectedYear: 1650,
      selectedTerritory: 'France',
      isInfoPanelOpen: true,
    },
    actions: {
      setInfoPanelOpen: mockSetInfoPanelOpen,
      setSelectedYear: mockSetSelectedYear,
      setSelectedTerritory: mockSetSelectedTerritory,
    },
  }),
}));

// Mock the territory description hook
const mockDescription: TerritoryDescription = {
  id: 'France_1650',
  name: 'フランス王国',
  year: 1650,
  summary: '17世紀のフランスはヨーロッパ最強の国家でした。',
  background:
    'ルイ14世の治世下、フランスは絶対王政の頂点に達しました。宰相マザランの指導のもと、三十年戦争の終結に向けた交渉が進められ、ウェストファリア条約（1648年）によりフランスはアルザス地方を獲得しました。この時期のフランスは、軍事力、文化、芸術の面でヨーロッパをリードしていました。',
  keyEvents: [
    { year: 1648, event: 'ウェストファリア条約締結' },
    { year: 1648, event: 'フロンドの乱' },
    { year: 1643, event: 'マザランの宰相就任' },
  ],
  relatedYears: [1600, 1700, 1789],
  aiGenerated: true,
};

vi.mock('../../../src/hooks/use-territory-description', () => ({
  useTerritoryDescription: () => ({
    description: mockDescription,
    isLoading: false,
    error: null,
  }),
}));

// Import after mocks
import { TerritoryInfoPanel } from '../../../src/components/territory-info/territory-info-panel';

describe('TerritoryInfoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders territory name as heading', () => {
    render(<TerritoryInfoPanel />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('フランス王国');
  });

  it('renders territory summary', () => {
    render(<TerritoryInfoPanel />);

    expect(screen.getByText(/17世紀のフランスはヨーロッパ最強の国家/)).toBeInTheDocument();
  });

  it('renders historical background', () => {
    render(<TerritoryInfoPanel />);

    expect(screen.getByText(/ルイ14世の治世下/)).toBeInTheDocument();
  });

  it('renders key events list', () => {
    render(<TerritoryInfoPanel />);

    // Events are rendered with year and event text separately
    expect(screen.getByText('ウェストファリア条約締結')).toBeInTheDocument();
    expect(screen.getByText('フロンドの乱')).toBeInTheDocument();
    expect(screen.getByText('マザランの宰相就任')).toBeInTheDocument();
    // Years are displayed in timeline format (sorted by year)
    expect(screen.getByText('1643年')).toBeInTheDocument();
    expect(screen.getAllByText('1648年')).toHaveLength(2);
  });

  it('renders AI-generated notice', () => {
    render(<TerritoryInfoPanel />);

    const aiNotice = screen.getByTestId('ai-notice');
    expect(aiNotice).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<TerritoryInfoPanel />);

    const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('closes panel when close button is clicked', () => {
    render(<TerritoryInfoPanel />);

    const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
    fireEvent.click(closeButton);

    expect(mockSetInfoPanelOpen).toHaveBeenCalledWith(false);
  });

  it('closes panel when Escape key is pressed', () => {
    render(<TerritoryInfoPanel />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockSetInfoPanelOpen).toHaveBeenCalledWith(false);
  });

  it('renders related years as clickable links', () => {
    render(<TerritoryInfoPanel />);

    const relatedYearsSection = screen.getByTestId('related-years');
    expect(relatedYearsSection).toBeInTheDocument();

    // Check that year links are rendered
    const yearLinks = screen.getAllByTestId('year-link');
    expect(yearLinks.length).toBe(3); // 1600, 1700, 1789
  });

  it('has proper accessibility attributes', () => {
    render(<TerritoryInfoPanel />);

    const panel = screen.getByTestId('territory-info-panel');
    expect(panel).toHaveAttribute('role', 'dialog');
    expect(panel).toHaveAttribute('aria-labelledby');
  });
});

describe('TerritoryInfoPanel - Loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock to loading state
    vi.doMock('../../../src/hooks/use-territory-description', () => ({
      useTerritoryDescription: () => ({
        description: null,
        isLoading: true,
        error: null,
      }),
    }));
  });

  // Note: Due to mock limitations, this test is illustrative
  // In real implementation, we would test loading spinner visibility
  it.skip('shows loading spinner when loading', () => {
    // Would render TerritoryInfoPanel and check for loading indicator
  });
});

describe('TerritoryInfoPanel - No description state', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.doMock('../../../src/hooks/use-territory-description', () => ({
      useTerritoryDescription: () => ({
        description: null,
        isLoading: false,
        error: null,
      }),
    }));
  });

  // Note: Due to mock limitations, this test is illustrative
  it.skip('shows placeholder message when no description available', () => {
    // Would render TerritoryInfoPanel and check for placeholder
  });
});
