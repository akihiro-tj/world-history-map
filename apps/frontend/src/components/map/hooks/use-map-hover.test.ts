import { act, renderHook } from '@testing-library/react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { describe, expect, it, vi } from 'vitest';
import { useMapHover } from './use-map-hover';

function createMouseEvent(subjecto?: string): MapLayerMouseEvent {
  const features = subjecto ? [{ properties: { SUBJECTO: subjecto } }] : [];
  return { features } as unknown as MapLayerMouseEvent;
}

describe('useMapHover', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with isHoveringTerritory as false', () => {
    const { result } = renderHook(() => useMapHover());

    expect(result.current.isHoveringTerritory).toBe(false);
  });

  it('sets isHoveringTerritory to true when hovering over a territory', () => {
    const { result } = renderHook(() => useMapHover());

    act(() => {
      result.current.handleMouseMove(createMouseEvent('France'));
    });

    expect(result.current.isHoveringTerritory).toBe(true);
  });

  it('sets isHoveringTerritory to false when not hovering over a territory', () => {
    const { result } = renderHook(() => useMapHover());

    act(() => {
      result.current.handleMouseMove(createMouseEvent('France'));
    });
    expect(result.current.isHoveringTerritory).toBe(true);

    act(() => {
      result.current.handleMouseMove(createMouseEvent());
    });
    expect(result.current.isHoveringTerritory).toBe(false);
  });

  it('handles features with no SUBJECTO property', () => {
    const { result } = renderHook(() => useMapHover());
    const event = { features: [{ properties: {} }] } as unknown as MapLayerMouseEvent;

    act(() => {
      result.current.handleMouseMove(event);
    });

    expect(result.current.isHoveringTerritory).toBe(false);
  });

  it('handles event with undefined features', () => {
    const { result } = renderHook(() => useMapHover());
    const event = { features: undefined } as unknown as MapLayerMouseEvent;

    act(() => {
      result.current.handleMouseMove(event);
    });

    expect(result.current.isHoveringTerritory).toBe(false);
  });

  it('cancels pending rAF on unmount', () => {
    const cancelSpy = vi.mocked(cancelAnimationFrame);
    let rafId = 1;
    vi.mocked(requestAnimationFrame).mockImplementation(() => rafId++);

    const { result, unmount } = renderHook(() => useMapHover());

    act(() => {
      result.current.handleMouseMove(createMouseEvent('France'));
    });

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });
});
