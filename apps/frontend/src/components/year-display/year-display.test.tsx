import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createHistoricalYear } from '@/types/historical-year';
import { YearDisplay } from './year-display';

describe('YearDisplay', () => {
  it('should render a positive year', () => {
    render(<YearDisplay year={createHistoricalYear(1600)} />);
    expect(screen.getByText('1600')).toBeInTheDocument();
  });

  it('should render a negative year with BCE notation', () => {
    render(<YearDisplay year={createHistoricalYear(-500)} />);
    expect(screen.getByText('前500')).toBeInTheDocument();
  });

  it('should have aria-live="polite" for screen reader announcements', () => {
    render(<YearDisplay year={createHistoricalYear(1600)} />);
    const element = screen.getByText('1600').closest('[aria-live]');
    expect(element).toHaveAttribute('aria-live', 'polite');
  });

  it('should fade out then fade in when year changes', () => {
    vi.useFakeTimers();
    const { rerender } = render(<YearDisplay year={createHistoricalYear(1600)} />);

    const container = screen.getByText('1600').closest('[aria-live]') as HTMLElement;
    expect(container).toHaveClass('opacity-100');

    rerender(<YearDisplay year={createHistoricalYear(1700)} />);

    expect(container).toHaveClass('opacity-0');
    expect(screen.getByText('1600')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(container).toHaveClass('opacity-100');
    expect(screen.getByText('1700')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
