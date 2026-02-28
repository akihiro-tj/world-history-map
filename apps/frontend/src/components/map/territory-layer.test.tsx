import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearColorSchemeCache, loadColorScheme } from '../../utils/color-scheme';
import { TerritoryLayer } from './territory-layer';

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

const colorSchemeJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../public/data/color-scheme.json'), 'utf8'),
) as Record<string, string>;

const mockFetch = vi.fn();

beforeAll(() => {
  global.fetch = mockFetch;
});

describe('TerritoryLayer', () => {
  const defaultProps = {
    sourceId: 'territories',
    sourceLayer: 'territories',
  };

  beforeEach(async () => {
    clearColorSchemeCache();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(colorSchemeJson),
    });
    await loadColorScheme();
  });

  afterEach(() => {
    clearColorSchemeCache();
    mockFetch.mockReset();
  });

  it('should render fill layer with correct configuration', () => {
    render(<TerritoryLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('layer-territory-fill');
    expect(fillLayer).toBeInTheDocument();
    expect(fillLayer).toHaveAttribute('data-layer-type', 'fill');
    expect(fillLayer).toHaveAttribute('data-source', 'territories');
    expect(fillLayer).toHaveAttribute('data-source-layer', 'territories');
  });

  it('should apply color scheme based on SUBJECTO property', () => {
    render(<TerritoryLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('layer-territory-fill');
    const paint = JSON.parse(fillLayer.getAttribute('data-paint') || '{}');

    expect(paint['fill-color']).toBeDefined();
    const colorExpr = JSON.stringify(paint['fill-color']);
    expect(colorExpr).toContain('SUBJECTO');
  });

  it('should have semi-transparent fill', () => {
    render(<TerritoryLayer {...defaultProps} />);

    const fillLayer = screen.getByTestId('layer-territory-fill');
    const paint = JSON.parse(fillLayer.getAttribute('data-paint') || '{}');

    expect(paint['fill-opacity']).toBeDefined();
    expect(paint['fill-opacity']).toBeLessThan(1);
  });
});
