import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TerritoryLayer } from '../../../src/components/map/territory-layer';

// Mock react-map-gl/maplibre
vi.mock('react-map-gl/maplibre', () => ({
  Layer: vi.fn((props) => (
    <div
      data-testid={`layer-${props.id}`}
      data-layer-type={props.type}
      data-source={props.source}
      data-source-layer={props['source-layer']}
      data-paint={JSON.stringify(props.paint)}
    />
  )),
}));

describe('TerritoryLayer', () => {
  const defaultProps = {
    sourceId: 'territories',
    sourceLayer: 'territories',
  };

  it('should render fill layer with correct configuration', () => {
    render(<TerritoryLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('layer-territory-fill');
    expect(fillLayer).toBeInTheDocument();
    expect(fillLayer).toHaveAttribute('data-layer-type', 'fill');
    expect(fillLayer).toHaveAttribute('data-source', 'territories');
    expect(fillLayer).toHaveAttribute('data-source-layer', 'territories');
  });

  it('should render border layer with correct configuration', () => {
    render(<TerritoryLayer {...defaultProps} />);

    const borderLayer = screen.getByTestId('layer-territory-border');
    expect(borderLayer).toBeInTheDocument();
    expect(borderLayer).toHaveAttribute('data-layer-type', 'line');
    expect(borderLayer).toHaveAttribute('data-source', 'territories');
  });

  it('should apply color scheme based on SUBJECTO property', () => {
    render(<TerritoryLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('layer-territory-fill');
    const paint = JSON.parse(fillLayer.getAttribute('data-paint') || '{}');

    // Fill color should use a match expression or case expression for SUBJECTO
    expect(paint['fill-color']).toBeDefined();
    // The color expression should reference SUBJECTO property
    const colorExpr = JSON.stringify(paint['fill-color']);
    expect(colorExpr).toContain('SUBJECTO');
  });

  it('should have semi-transparent fill', () => {
    render(<TerritoryLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('layer-territory-fill');
    const paint = JSON.parse(fillLayer.getAttribute('data-paint') || '{}');

    // Fill opacity should be less than 1 for better visibility
    expect(paint['fill-opacity']).toBeDefined();
    expect(paint['fill-opacity']).toBeLessThan(1);
  });

  it('should have visible border lines', () => {
    render(<TerritoryLayer {...defaultProps} />);

    const borderLayer = screen.getByTestId('layer-territory-border');
    const paint = JSON.parse(borderLayer.getAttribute('data-paint') || '{}');

    expect(paint['line-color']).toBeDefined();
    expect(paint['line-width']).toBeDefined();
  });
});
