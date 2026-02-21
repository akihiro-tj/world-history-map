import { renderHook } from '@testing-library/react';
import maplibregl from 'maplibre-gl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('pmtiles', () => {
  return {
    Protocol: class MockProtocol {
      tile = vi.fn();
    },
  };
});
vi.mock('maplibre-gl', () => ({
  default: {
    addProtocol: vi.fn(),
    removeProtocol: vi.fn(),
  },
}));

import { usePMTilesProtocol } from './use-pmtiles-protocol';

const mockAddProtocol = vi.mocked(maplibregl.addProtocol);
const mockRemoveProtocol = vi.mocked(maplibregl.removeProtocol);

describe('usePMTilesProtocol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers pmtiles protocol on mount', () => {
    renderHook(() => usePMTilesProtocol());

    expect(mockAddProtocol).toHaveBeenCalledWith('pmtiles', expect.any(Function));
  });

  it('removes pmtiles protocol on unmount', () => {
    const { unmount } = renderHook(() => usePMTilesProtocol());

    unmount();

    expect(mockRemoveProtocol).toHaveBeenCalledWith('pmtiles');
  });

  it('registers protocol only once across re-renders', () => {
    const { rerender } = renderHook(() => usePMTilesProtocol());

    rerender();

    expect(mockAddProtocol).toHaveBeenCalledTimes(1);
  });
});
