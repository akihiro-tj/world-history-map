import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TERRITORY_LABEL_ID, TerritoryLabel } from './territory-label';

vi.mock('react-map-gl/maplibre', () => ({
  Layer: vi.fn((props) => (
    <div
      data-testid={`layer-${props.id}`}
      data-layer-type={props.type}
      data-source={props.source}
      data-source-layer={props['source-layer']}
      data-layout={JSON.stringify(props.layout)}
      data-paint={JSON.stringify(props.paint)}
    />
  )),
}));

describe('TerritoryLabel', () => {
  const defaultProps = {
    sourceId: 'territories',
    sourceLayer: 'labels',
  };

  it('should render label layer with correct ID', () => {
    render(<TerritoryLabel {...defaultProps} />);

    const labelLayer = screen.getByTestId(`layer-${TERRITORY_LABEL_ID}`);
    expect(labelLayer).toBeInTheDocument();
  });

  it('should be a symbol layer type', () => {
    render(<TerritoryLabel {...defaultProps} />);

    const labelLayer = screen.getByTestId(`layer-${TERRITORY_LABEL_ID}`);
    expect(labelLayer).toHaveAttribute('data-layer-type', 'symbol');
  });

  it('should use NAME property for text field', () => {
    render(<TerritoryLabel {...defaultProps} />);

    const labelLayer = screen.getByTestId(`layer-${TERRITORY_LABEL_ID}`);
    const layout = JSON.parse(labelLayer.getAttribute('data-layout') || '{}');

    expect(layout['text-field']).toEqual(['get', 'NAME']);
  });

  it('should have text halo for readability', () => {
    render(<TerritoryLabel {...defaultProps} />);

    const labelLayer = screen.getByTestId(`layer-${TERRITORY_LABEL_ID}`);
    const paint = JSON.parse(labelLayer.getAttribute('data-paint') || '{}');

    expect(paint['text-halo-color']).toBeDefined();
    expect(paint['text-halo-width']).toBeGreaterThan(0);
  });

  it('should use variable anchor for flexible positioning', () => {
    render(<TerritoryLabel {...defaultProps} />);

    const labelLayer = screen.getByTestId(`layer-${TERRITORY_LABEL_ID}`);
    const layout = JSON.parse(labelLayer.getAttribute('data-layout') || '{}');

    expect(layout['text-variable-anchor']).toBeDefined();
    expect(Array.isArray(layout['text-variable-anchor'])).toBe(true);
  });

  it('should have text-optional enabled for collision handling', () => {
    render(<TerritoryLabel {...defaultProps} />);

    const labelLayer = screen.getByTestId(`layer-${TERRITORY_LABEL_ID}`);
    const layout = JSON.parse(labelLayer.getAttribute('data-layout') || '{}');

    expect(layout['text-optional']).toBe(true);
  });

  it('should export correct layer ID constant', () => {
    expect(TERRITORY_LABEL_ID).toBe('territory-label');
  });
});
