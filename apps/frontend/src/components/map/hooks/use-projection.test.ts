import { act, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useProjection } from './use-projection';

function createMockMapRef() {
  const mapInstance = {
    setProjection: vi.fn(),
    flyTo: vi.fn(),
    getZoom: vi.fn(() => 4),
    getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
  };
  const ref = {
    current: {
      getMap: () => mapInstance,
    },
  };
  return { ref, mapInstance };
}

describe('useProjection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to mercator projection', () => {
    const { ref } = createMockMapRef();
    const { result } = renderHook(() => useProjection(ref as never, false));

    expect(result.current.projection).toBe('mercator');
  });

  it('sets projection without animation on initial load', () => {
    const { ref, mapInstance } = createMockMapRef();
    renderHook(() => useProjection(ref as never, true));

    expect(mapInstance.setProjection).toHaveBeenCalledWith({ type: 'mercator' });
    expect(mapInstance.flyTo).not.toHaveBeenCalled();
  });

  it('animates flyTo when switching to globe', () => {
    const { ref, mapInstance } = createMockMapRef();
    const { result } = renderHook(() => useProjection(ref as never, true));

    act(() => {
      result.current.setProjection('globe');
    });

    expect(mapInstance.setProjection).toHaveBeenCalledWith({ type: 'globe' });
    expect(mapInstance.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        zoom: 2,
        duration: 1200,
      }),
    );
  });

  it('animates flyTo when switching to mercator', () => {
    const { ref, mapInstance } = createMockMapRef();
    const { result } = renderHook(() => useProjection(ref as never, true));

    act(() => {
      result.current.setProjection('globe');
    });

    vi.clearAllMocks();

    act(() => {
      result.current.setProjection('mercator');
    });

    expect(mapInstance.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 800,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mapInstance.setProjection).toHaveBeenCalledWith({ type: 'mercator' });
  });

  it('clamps zoom to max 2 when switching to globe', () => {
    const { ref, mapInstance } = createMockMapRef();
    mapInstance.getZoom.mockReturnValue(5);

    const { result } = renderHook(() => useProjection(ref as never, true));

    act(() => {
      result.current.setProjection('globe');
    });

    expect(mapInstance.flyTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: 2 }));
  });

  it('clamps zoom to min 3 when switching to mercator', () => {
    const { ref, mapInstance } = createMockMapRef();
    mapInstance.getZoom.mockReturnValue(1);

    const { result } = renderHook(() => useProjection(ref as never, true));

    act(() => {
      result.current.setProjection('globe');
    });

    vi.clearAllMocks();

    act(() => {
      result.current.setProjection('mercator');
    });

    expect(mapInstance.flyTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: 3 }));
  });

  it('does nothing when map is not loaded', () => {
    const { ref, mapInstance } = createMockMapRef();
    renderHook(() => useProjection(ref as never, false));

    expect(mapInstance.setProjection).not.toHaveBeenCalled();
    expect(mapInstance.flyTo).not.toHaveBeenCalled();
  });

  it('does nothing when map ref is null', () => {
    const ref = createRef();
    expect(() => {
      renderHook(() => useProjection(ref as never, true));
    }).not.toThrow();
  });
});
