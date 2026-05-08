import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

const mockOpenSummary = vi.fn();
let mockIsSummaryPanelOpen = false;
let mockIsInfoPanelOpen = false;

vi.mock('@/contexts/app-state-context', () => ({
  useAppState: () => ({
    state: {
      selectedYear: createHistoricalYear(1650),
      isSummaryPanelOpen: mockIsSummaryPanelOpen,
      isInfoPanelOpen: mockIsInfoPanelOpen,
    },
    actions: {
      openSummary: mockOpenSummary,
    },
  }),
}));

import { SummaryTrigger } from './summary-trigger';

describe('SummaryTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSummaryPanelOpen = false;
    mockIsInfoPanelOpen = false;
  });

  it('renders with 概要 label', () => {
    render(<SummaryTrigger />);

    expect(screen.getByText('概要')).toBeInTheDocument();
  });

  it('returns null when summary panel is open', () => {
    mockIsSummaryPanelOpen = true;
    const { container } = render(<SummaryTrigger />);

    expect(container.firstChild).toBeNull();
  });

  it('returns null when territory info panel is open', () => {
    mockIsInfoPanelOpen = true;
    const { container } = render(<SummaryTrigger />);

    expect(container.firstChild).toBeNull();
  });

  it('dispatches openSummary on click', () => {
    render(<SummaryTrigger />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockOpenSummary).toHaveBeenCalled();
  });

  it('has aria-label for accessibility', () => {
    render(<SummaryTrigger />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', '概要を開く');
  });
});
