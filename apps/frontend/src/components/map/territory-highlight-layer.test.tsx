import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TerritoryHighlightLayer } from './territory-highlight-layer';
import { TERRITORY_LABEL_ID } from './territory-label';

vi.mock('react-map-gl/maplibre', () => ({
  Layer: vi.fn((props) => (
    <div
      data-testid={`map-layer-${props.id}`}
      data-filter={JSON.stringify(props.filter)}
      data-paint={JSON.stringify(props.paint)}
      data-layer-type={props.type}
      data-source={props.source}
      data-source-layer={props['source-layer']}
      data-before-id={props.beforeId}
    />
  )),
}));

describe('TerritoryHighlightLayer', () => {
  const defaultProps = {
    sourceId: 'territories',
    sourceLayer: 'territories',
    selectedTerritory: 'Roman Empire',
  };

  it('should render fill layer', () => {
    render(<TerritoryHighlightLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('map-layer-territory-highlight-fill');
    expect(fillLayer).toBeInTheDocument();
    expect(fillLayer).toHaveAttribute('data-layer-type', 'fill');
  });

  it('should render outline layer', () => {
    render(<TerritoryHighlightLayer {...defaultProps} />);

    const outlineLayer = screen.getByTestId('map-layer-territory-highlight-outline');
    expect(outlineLayer).toBeInTheDocument();
    expect(outlineLayer).toHaveAttribute('data-layer-type', 'line');
  });

  it('should apply correct filter expression', () => {
    render(<TerritoryHighlightLayer {...defaultProps} />);

    const expectedFilter = ['==', ['get', 'NAME'], 'Roman Empire'];

    const fillLayer = screen.getByTestId('map-layer-territory-highlight-fill');
    expect(JSON.parse(fillLayer.getAttribute('data-filter') ?? '')).toEqual(expectedFilter);

    const outlineLayer = screen.getByTestId('map-layer-territory-highlight-outline');
    expect(JSON.parse(outlineLayer.getAttribute('data-filter') ?? '')).toEqual(expectedFilter);
  });

  it('should apply correct fill paint', () => {
    render(<TerritoryHighlightLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('map-layer-territory-highlight-fill');
    const paint = JSON.parse(fillLayer.getAttribute('data-paint') ?? '');

    expect(paint).toEqual({
      'fill-color': '#ffffff',
      'fill-opacity': 0.15,
    });
  });

  it('should apply correct line paint', () => {
    render(<TerritoryHighlightLayer {...defaultProps} />);

    const outlineLayer = screen.getByTestId('map-layer-territory-highlight-outline');
    const paint = JSON.parse(outlineLayer.getAttribute('data-paint') ?? '');

    expect(paint).toEqual({
      'line-color': '#ffffff',
      'line-width': 3.5,
    });
  });

  it('should pass sourceId and sourceLayer correctly', () => {
    render(<TerritoryHighlightLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('map-layer-territory-highlight-fill');
    expect(fillLayer).toHaveAttribute('data-source', 'territories');
    expect(fillLayer).toHaveAttribute('data-source-layer', 'territories');

    const outlineLayer = screen.getByTestId('map-layer-territory-highlight-outline');
    expect(outlineLayer).toHaveAttribute('data-source', 'territories');
    expect(outlineLayer).toHaveAttribute('data-source-layer', 'territories');
  });

  it('should place layers before territory-label layer', () => {
    render(<TerritoryHighlightLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('map-layer-territory-highlight-fill');
    expect(fillLayer).toHaveAttribute('data-before-id', TERRITORY_LABEL_ID);

    const outlineLayer = screen.getByTestId('map-layer-territory-highlight-outline');
    expect(outlineLayer).toHaveAttribute('data-before-id', TERRITORY_LABEL_ID);
  });
});
