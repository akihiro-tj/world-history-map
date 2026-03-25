import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockYears: { year: number; filename: string; countries: string[] }[] = [];
let mockIsLoading = false;

vi.mock('./hooks/use-year-index', () => ({
  useYearIndex: () => ({ years: mockYears, isLoading: mockIsLoading }),
}));

vi.mock('./components/territory-info/hooks/use-territory-description', () => ({
  prefetchYearDescriptions: vi.fn(),
  useTerritoryDescription: () => ({ description: null, isLoading: false, error: null }),
}));

vi.mock('./components/map/map-view', () => ({
  MapView: ({
    onProjectionReady,
  }: {
    onProjectionReady?: (p: string, setter: (p: string) => void) => void;
  }) => {
    useEffect(() => {
      onProjectionReady?.('mercator', vi.fn());
    }, [onProjectionReady]);
    return <div data-testid="mock-map-view" />;
  },
}));

vi.mock('./components/territory-info/territory-info-panel', () => ({
  TerritoryInfoPanel: () => <div data-testid="mock-territory-info-panel" />,
}));

vi.mock('./components/control-bar/control-bar', () => ({
  ControlBar: ({
    projection,
  }: {
    projection: string;
    onToggleProjection: (p: string) => void;
    onOpenLicense: () => void;
  }) => <div data-testid="mock-control-bar" data-projection={projection} />,
}));

vi.mock('./components/year-display/year-display', () => ({
  YearDisplay: ({ year }: { year: number }) => <div data-testid="mock-year-display">{year}</div>,
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

  it('renders MapView and TerritoryInfoPanel', () => {
    render(<App />);

    expect(screen.getByTestId('mock-map-view')).toBeInTheDocument();
    expect(screen.getByTestId('mock-territory-info-panel')).toBeInTheDocument();
  });

  it('renders YearSelector when years are loaded', () => {
    render(<App />);

    expect(screen.getByTestId('mock-year-selector')).toBeInTheDocument();
  });

  it('does not render YearSelector while loading', () => {
    mockIsLoading = true;
    render(<App />);

    expect(screen.queryByTestId('mock-year-selector')).not.toBeInTheDocument();
  });

  it('does not render YearSelector when years array is empty', () => {
    mockYears = [];
    render(<App />);

    expect(screen.queryByTestId('mock-year-selector')).not.toBeInTheDocument();
  });

  it('passes projection state to ControlBar', () => {
    render(<App />);

    expect(screen.getByTestId('mock-control-bar')).toHaveAttribute('data-projection', 'mercator');
  });

  it('renders YearDisplay with selected year', () => {
    render(<App />);

    expect(screen.getByTestId('mock-year-display')).toBeInTheDocument();
  });
});
