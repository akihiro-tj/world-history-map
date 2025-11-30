import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { YearSelector } from '../../../src/components/year-selector/year-selector';
import { AppStateProvider } from '../../../src/contexts/app-state-context';
import type { YearEntry } from '../../../src/types';

// Mock scrollIntoView since it's not implemented in jsdom
const scrollIntoViewMock = vi.fn();
Element.prototype.scrollIntoView = scrollIntoViewMock;

const mockYears: YearEntry[] = [
  { year: 1600, filename: 'world_1600.pmtiles', countries: [] },
  { year: 1650, filename: 'world_1650.pmtiles', countries: [] },
  { year: 1700, filename: 'world_1700.pmtiles', countries: [] },
  { year: 1750, filename: 'world_1750.pmtiles', countries: [] },
  { year: 1800, filename: 'world_1800.pmtiles', countries: [] },
];

describe('YearSelector', () => {
  beforeEach(() => {
    scrollIntoViewMock.mockClear();
  });

  const renderWithProvider = (
    ui: React.ReactElement,
    { initialYear = 1650 }: { initialYear?: number } = {},
  ) => {
    return render(
      <AppStateProvider
        initialState={{
          selectedYear: initialYear,
          selectedTerritory: null,
          isInfoPanelOpen: false,
          isDisclaimerOpen: false,
          mapView: { longitude: 0, latitude: 30, zoom: 2 },
          isLoading: false,
          error: null,
        }}
      >
        {ui}
      </AppStateProvider>,
    );
  };

  it('should render the year selector container', () => {
    renderWithProvider(<YearSelector years={mockYears} />);
    expect(screen.getByTestId('year-selector')).toBeInTheDocument();
  });

  it('should display all available years as buttons', () => {
    renderWithProvider(<YearSelector years={mockYears} />);

    for (const yearEntry of mockYears) {
      expect(screen.getByTestId(`year-button-${yearEntry.year}`)).toBeInTheDocument();
    }
  });

  it('should display years in chronological order', () => {
    renderWithProvider(<YearSelector years={mockYears} />);

    const buttons = screen.getAllByRole('button');
    const years = buttons.map((btn) => Number(btn.textContent));

    for (let i = 1; i < years.length; i++) {
      const currentYear = years[i];
      const previousYear = years[i - 1];
      if (currentYear !== undefined && previousYear !== undefined) {
        expect(currentYear).toBeGreaterThan(previousYear);
      }
    }
  });

  it('should highlight the currently selected year', () => {
    renderWithProvider(<YearSelector years={mockYears} />, { initialYear: 1650 });

    const selectedButton = screen.getByTestId('year-button-1650');
    expect(selectedButton).toHaveAttribute('aria-current', 'true');

    // Other buttons should not be current
    const otherButton = screen.getByTestId('year-button-1700');
    expect(otherButton).not.toHaveAttribute('aria-current', 'true');
  });

  it('should have proper accessibility attributes', () => {
    renderWithProvider(<YearSelector years={mockYears} />);

    const selector = screen.getByTestId('year-selector');
    expect(selector).toHaveAttribute('aria-label');

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-label');
    }
  });

  it('should call onYearSelect when a year button is clicked', async () => {
    const user = userEvent.setup();
    const onYearSelect = vi.fn();

    renderWithProvider(<YearSelector years={mockYears} onYearSelect={onYearSelect} />);

    const year1700Button = screen.getByTestId('year-button-1700');
    await user.click(year1700Button);

    expect(onYearSelect).toHaveBeenCalledWith(1700);
  });

  it('should navigate with keyboard arrow keys', async () => {
    const user = userEvent.setup();

    renderWithProvider(<YearSelector years={mockYears} />, { initialYear: 1650 });

    const year1650Button = screen.getByTestId('year-button-1650');
    year1650Button.focus();

    // Press right arrow to move to next year
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(screen.getByTestId('year-button-1700')).toHaveFocus();
    });
  });

  it('should navigate left with left arrow key', async () => {
    const user = userEvent.setup();

    renderWithProvider(<YearSelector years={mockYears} />, { initialYear: 1650 });

    const year1650Button = screen.getByTestId('year-button-1650');
    year1650Button.focus();

    // Press left arrow to move to previous year
    await user.keyboard('{ArrowLeft}');

    await waitFor(() => {
      expect(screen.getByTestId('year-button-1600')).toHaveFocus();
    });
  });

  it('should wrap around when navigating past the end', async () => {
    const user = userEvent.setup();

    renderWithProvider(<YearSelector years={mockYears} />, { initialYear: 1800 });

    const year1800Button = screen.getByTestId('year-button-1800');
    year1800Button.focus();

    // Press right arrow at the end should wrap to beginning
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(screen.getByTestId('year-button-1600')).toHaveFocus();
    });
  });

  it('should select year on Enter key press', async () => {
    const user = userEvent.setup();
    const onYearSelect = vi.fn();

    renderWithProvider(<YearSelector years={mockYears} onYearSelect={onYearSelect} />);

    const year1700Button = screen.getByTestId('year-button-1700');
    year1700Button.focus();

    await user.keyboard('{Enter}');

    expect(onYearSelect).toHaveBeenCalledWith(1700);
  });

  it('should select year on Space key press', async () => {
    const user = userEvent.setup();
    const onYearSelect = vi.fn();

    renderWithProvider(<YearSelector years={mockYears} onYearSelect={onYearSelect} />);

    const year1700Button = screen.getByTestId('year-button-1700');
    year1700Button.focus();

    await user.keyboard(' ');

    expect(onYearSelect).toHaveBeenCalledWith(1700);
  });

  it('should scroll selected year into view', () => {
    renderWithProvider(<YearSelector years={mockYears} />, { initialYear: 1700 });

    // scrollIntoView should be called for the selected year
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('should render empty state when no years are provided', () => {
    renderWithProvider(<YearSelector years={[]} />);

    const selector = screen.getByTestId('year-selector');
    expect(selector).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should handle years with BCE notation', () => {
    const yearsWithBCE: YearEntry[] = [
      { year: -500, filename: 'world_-500.pmtiles', countries: [] },
      { year: -100, filename: 'world_-100.pmtiles', countries: [] },
      { year: 100, filename: 'world_100.pmtiles', countries: [] },
    ];

    renderWithProvider(<YearSelector years={yearsWithBCE} />, { initialYear: -500 });

    // BCE years should be displayed with Japanese short notation
    const button500BCE = screen.getByTestId('year-button--500');
    expect(button500BCE).toBeInTheDocument();
    expect(button500BCE).toHaveTextContent('前500');
  });
});
