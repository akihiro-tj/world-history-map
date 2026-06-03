import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistoricalYear } from '@/domain/year/historical-year';

const mockOpenSummary = vi.fn();
let mockSelectedYear = createHistoricalYear(1650);

vi.mock('@/contexts/app-state-context', () => ({
  useAppState: () => ({
    state: { selectedYear: mockSelectedYear },
    actions: { openSummary: mockOpenSummary },
  }),
}));

import { SummaryNavStrip } from './summary-nav-strip';

describe('SummaryNavStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedYear = createHistoricalYear(1650);
  });

  it('renders with selected year label', () => {
    render(<SummaryNavStrip />);

    expect(screen.getByText('1650年の概観')).toBeInTheDocument();
  });

  it('dispatches openSummary on click', () => {
    render(<SummaryNavStrip />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockOpenSummary).toHaveBeenCalled();
  });

  it('has accessible aria-label', () => {
    render(<SummaryNavStrip />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', '1650年の概観を開く');
  });

  it('updates label when year changes', () => {
    const { rerender } = render(<SummaryNavStrip />);

    expect(screen.getByText('1650年の概観')).toBeInTheDocument();

    mockSelectedYear = createHistoricalYear(1700);
    rerender(<SummaryNavStrip />);

    expect(screen.getByText('1700年の概観')).toBeInTheDocument();
  });
});
