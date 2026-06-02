import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createHistoricalYear } from '@/domain/year/historical-year';

vi.mock('@/contexts/app-state-context', () => ({
  useAppState: () => ({
    state: { selectedYear: createHistoricalYear(1650) },
    actions: {
      selectTerritory: vi.fn(),
      setSelectedYear: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/use-year-index', () => ({
  useYearIndex: () => ({
    years: [{ year: createHistoricalYear(1650), filename: 'world_1650.pmtiles', countries: [] }],
    isLoading: false,
  }),
}));

import { RegionCard } from './region-card';

const sampleCard = {
  region: 'europe' as const,
  title: 'ヨーロッパ',
  context: '三十年戦争が終結し、主権国家体制が成立。',
  references: [],
};

describe('RegionCard', () => {
  it('renders title and context', () => {
    render(<RegionCard regionCard={sampleCard} />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('ヨーロッパ');
    expect(screen.getByText('三十年戦争が終結し、主権国家体制が成立。')).toBeInTheDocument();
  });

  it('accepts an optional className', () => {
    const { container } = render(<RegionCard regionCard={sampleCard} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
