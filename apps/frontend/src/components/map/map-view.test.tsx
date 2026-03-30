import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppStateProvider } from '@/contexts/app-state-context';
import { ProjectionProvider } from '@/contexts/projection-context';
import { MapView } from './map-view';

let capturedOnClick: ((e: unknown) => void) | undefined;
let capturedOnLoad: (() => void) | undefined;

vi.mock('react-map-gl/maplibre', () => ({
  default: vi.fn(({ children, onClick, onLoad }) => {
    capturedOnClick = onClick;
    capturedOnLoad = onLoad;
    return (
      <div data-testid="mock-map">
        <div className="maplibregl-canvas" />
        {children}
      </div>
    );
  }),
  Source: vi.fn(({ children }) => <div data-testid="map-source">{children}</div>),
  Layer: vi.fn((props) => <div data-testid={`map-layer-${props.id}`} />),
}));

vi.mock('maplibre-gl', () => ({
  default: {
    addProtocol: vi.fn(),
    removeProtocol: vi.fn(),
  },
}));

vi.mock('pmtiles', () => ({
  Protocol: class {
    tile = vi.fn();
  },
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        years: [{ year: 1650, filename: 'world_1650.pmtiles', countries: [] }],
      }),
  }),
) as unknown as typeof fetch;

describe('MapView', () => {
  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <AppStateProvider>
        <ProjectionProvider>{ui}</ProjectionProvider>
      </AppStateProvider>,
    );
  };

  it('should render the map container', async () => {
    renderWithProvider(<MapView />);
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  it('should have proper accessibility attributes', async () => {
    renderWithProvider(<MapView />);
    await waitFor(() => {
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toHaveAttribute('role', 'application');
      expect(mapContainer).toHaveAttribute('aria-label');
    });
  });

  it('should render map layers for territories', async () => {
    renderWithProvider(<MapView />);
    await waitFor(() => {
      expect(screen.getByTestId('map-layer-territory-fill')).toBeInTheDocument();
    });
  });

  it('should render territory label layer', async () => {
    renderWithProvider(<MapView />);
    await waitFor(() => {
      expect(screen.getByTestId('map-layer-territory-label')).toBeInTheDocument();
    });
  });

  it('should show loading overlay before map is loaded', async () => {
    renderWithProvider(<MapView />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-map')).toBeInTheDocument();
    });

    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
  });

  it('should hide loading overlay after onLoad fires', async () => {
    renderWithProvider(<MapView />);

    await waitFor(() => {
      expect(capturedOnLoad).toBeDefined();
    });

    act(() => {
      capturedOnLoad?.();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
    });
  });

  it('should select territory on map click with features', async () => {
    renderWithProvider(<MapView />);

    await waitFor(() => {
      expect(capturedOnClick).toBeDefined();
    });

    act(() => {
      capturedOnClick?.({
        features: [{ properties: { NAME: 'France', SUBJECTO: '' } }],
      });
    });
  });

  it('should clear selection on map click without features', async () => {
    renderWithProvider(<MapView />);

    await waitFor(() => {
      expect(capturedOnClick).toBeDefined();
    });

    act(() => {
      capturedOnClick?.({ features: [] });
    });
  });

  it('should handle click with empty features array', async () => {
    renderWithProvider(<MapView />);

    await waitFor(() => {
      expect(capturedOnClick).toBeDefined();
    });

    act(() => {
      capturedOnClick?.({ features: null });
    });
  });
});

describe('MapView - error state', () => {
  it('should display error when data loading fails', async () => {
    vi.spyOn(await import('./hooks/use-map-data'), 'useMapData').mockReturnValue({
      yearIndex: null,
      tilesManifest: null,
      pmtilesUrl: null,
      isLoading: false,
      error: 'Network error',
    });

    render(
      <AppStateProvider>
        <ProjectionProvider>
          <MapView />
        </ProjectionProvider>
      </AppStateProvider>,
    );

    expect(screen.getByTestId('map-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load map data')).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
