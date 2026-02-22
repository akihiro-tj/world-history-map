import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppStateProvider } from '@/contexts/app-state-context';
import { MapView } from './map-view';

// Mock MapLibre and react-map-gl
vi.mock('react-map-gl/maplibre', () => ({
  default: vi.fn(({ children }) => (
    <div data-testid="mock-map">
      <div className="maplibregl-canvas" />
      {children}
    </div>
  )),
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

// Mock year index fetch
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
    return render(<AppStateProvider>{ui}</AppStateProvider>);
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
      // Territory fill layer should be rendered
      expect(screen.getByTestId('map-layer-territory-fill')).toBeInTheDocument();
    });
  });

  it('should call onProjectionReady when map loads', async () => {
    const onProjectionReady = vi.fn();
    renderWithProvider(<MapView onProjectionReady={onProjectionReady} />);
    await waitFor(() => {
      expect(onProjectionReady).toHaveBeenCalled();
    });
  });

  it('should render territory label layer', async () => {
    renderWithProvider(<MapView />);
    await waitFor(() => {
      expect(screen.getByTestId('map-layer-territory-label')).toBeInTheDocument();
    });
  });
});
