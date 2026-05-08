import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockYears: { year: number; filename: string; countries: string[] }[] = [];
let mockIsLoading = false;

vi.mock('@/hooks/use-year-index', () => ({
  useYearIndex: () => ({ years: mockYears, isLoading: mockIsLoading }),
}));

vi.mock('@/domain/territory/description-loader', () => ({
  prefetchYearDescriptions: vi.fn(),
}));

vi.mock('./components/territory-info/hooks/use-territory-description', () => ({
  useTerritoryDescription: () => ({ description: null, isLoading: false, error: null }),
}));

vi.mock('./components/map/map-view', () => ({
  MapView: ({ onReady }: { onReady?: () => void }) => {
    queueMicrotask(() => onReady?.());
    return <div data-testid="mock-map-view" />;
  },
}));

vi.mock('./components/territory-info/territory-info-panel', () => ({
  TerritoryInfoPanel: () => <div data-testid="mock-territory-info-panel" />,
}));

vi.mock('./components/control-bar/control-bar', () => ({
  ControlBar: () => <div data-testid="mock-control-bar" />,
}));

vi.mock('./components/year-selector/year-selector', () => ({
  YearSelector: () => <div data-testid="mock-year-selector" />,
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

import App from './App';

describe('App', () => {
  beforeEach(() => {
    mockYears = [
      { year: 1600, filename: 'world_1600.pmtiles', countries: [] },
      { year: 1700, filename: 'world_1700.pmtiles', countries: [] },
    ];
    mockIsLoading = false;
  });

  it('renders MapView and TerritoryInfoPanel after map is ready', async () => {
    render(<App />);

    expect(screen.getByTestId('mock-map-view')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('mock-territory-info-panel')).toBeInTheDocument(),
    );
  });

  it('renders YearSelector when map is ready and years are loaded', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('mock-year-selector')).toBeInTheDocument());
  });

  it('does not render YearSelector when years array is empty', async () => {
    mockYears = [];
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('mock-map-view')).toBeInTheDocument());
    expect(screen.queryByTestId('mock-year-selector')).not.toBeInTheDocument();
  });

  it('renders ControlBar after map is ready', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('mock-control-bar')).toBeInTheDocument());
  });

  it('hides UI panels before map is ready', () => {
    render(<App />);

    expect(screen.queryByTestId('mock-territory-info-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-control-bar')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-map-view')).toBeInTheDocument();
  });
});
