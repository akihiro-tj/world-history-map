import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCameraFitOnSelection } from './use-camera-fit-on-selection';

vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: vi.fn(() => false),
}));

vi.mock('./use-panel-padding', () => ({
  usePanelPadding: vi.fn(() => ({ top: 24, right: 24, bottom: 24, left: 416 })),
}));

vi.mock('@/contexts/app-state-context', () => ({
  useAppState: vi.fn(),
}));

import { useAppState } from '@/contexts/app-state-context';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { usePanelPadding } from './use-panel-padding';

const VALID_BBOX_PROPS = {
  BBOX_W: 2,
  BBOX_S: 46,
  BBOX_E: 3,
  BBOX_N: 47,
  BBOX_AM: 0,
};

const AM_BBOX_PROPS = {
  BBOX_W: 178,
  BBOX_S: -10,
  BBOX_E: 182,
  BBOX_N: 10,
  BBOX_AM: 1,
};

function makeFeature(props: Record<string, unknown>) {
  return { properties: props };
}

function createMockMap(features: object[] = [makeFeature(VALID_BBOX_PROPS)]) {
  const sourcedataListeners: ((e: { isSourceLoaded: boolean }) => void)[] = [];
  const fitBounds = vi.fn();
  const querySourceFeatures = vi.fn(() => features);
  const on = vi.fn((event: string, handler: (e: { isSourceLoaded: boolean }) => void) => {
    if (event === 'sourcedata') sourcedataListeners.push(handler);
  });
  const off = vi.fn();
  return { fitBounds, querySourceFeatures, on, off, sourcedataListeners };
}

function createMockRef(
  mapInstance: ReturnType<typeof createMockMap>,
): RefObject<{ getMap: () => typeof mapInstance }> {
  return { current: { getMap: () => mapInstance } } as unknown as RefObject<{
    getMap: () => typeof mapInstance;
  }>;
}

function makeTerritoryState(territory: string | null, year = 1600) {
  return {
    state: {
      activePanel:
        territory !== null
          ? { kind: 'territory' as const, selectedTerritory: territory }
          : { kind: 'none' as const },
      selectedYear: year,
    },
    actions: {},
  };
}

describe('useCameraFitOnSelection', () => {
  beforeEach(() => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    vi.mocked(usePanelPadding).mockReturnValue({ top: 24, right: 24, bottom: 24, left: 416 });
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState(null) as ReturnType<typeof useAppState>,
    );
  });

  it('(a) calls fitBounds once with correct bounds, Desktop padding, and maxFitZoom', async () => {
    const map = createMockMap();
    const mapRef = createMockRef(map);
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('France') as ReturnType<typeof useAppState>,
    );

    renderHook(() => useCameraFitOnSelection(mapRef as never));

    await act(async () => {});

    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    const call0 = map.fitBounds.mock.calls[0] as [unknown[], Record<string, unknown>];
    expect(call0[0]).toEqual([
      [2, 46],
      [3, 47],
    ]);
    expect(call0[1]['padding']).toEqual({ top: 24, right: 24, bottom: 24, left: 416 });
    expect(call0[1]['maxZoom']).toBe(5);
    expect(call0[1]['duration']).toBe(600);
  });

  it('(b) re-fits when selectedYear changes while same territory is selected', async () => {
    const map = createMockMap();
    const mapRef = createMockRef(map);
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('France', 1600) as ReturnType<typeof useAppState>,
    );

    const { rerender } = renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});
    expect(map.fitBounds).toHaveBeenCalledTimes(1);

    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('France', 1700) as ReturnType<typeof useAppState>,
    );
    rerender();
    await act(async () => {});
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
  });

  it('(c) does not call fitBounds when selectedTerritory is null', async () => {
    const map = createMockMap();
    const mapRef = createMockRef(map);
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState(null) as ReturnType<typeof useAppState>,
    );

    renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});

    expect(map.fitBounds).not.toHaveBeenCalled();
  });

  it('(d) passes duration: 0 when prefers-reduced-motion is active', async () => {
    const map = createMockMap();
    const mapRef = createMockRef(map);
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true);
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('France') as ReturnType<typeof useAppState>,
    );

    renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});

    const call0d = map.fitBounds.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(call0d[1]['duration']).toBe(0);
  });

  it('(e) retries via sourcedata event when querySourceFeatures returns empty', async () => {
    let callCount = 0;
    const map = createMockMap([]);
    map.querySourceFeatures.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [];
      return [makeFeature(VALID_BBOX_PROPS)];
    });
    const mapRef = createMockRef(map);
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('France') as ReturnType<typeof useAppState>,
    );

    renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});

    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.on).toHaveBeenCalledWith('sourcedata', expect.any(Function));

    act(() => {
      for (const listener of map.sourcedataListeners) {
        listener({ isSourceLoaded: true });
      }
    });
    await act(async () => {});

    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    expect(map.off).toHaveBeenCalledWith('sourcedata', expect.any(Function));
  });

  it('(f) passes antimeridian bounds (east > 180) directly to fitBounds', async () => {
    const map = createMockMap([makeFeature(AM_BBOX_PROPS)]);
    const mapRef = createMockRef(map);
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('Fiji') as ReturnType<typeof useAppState>,
    );

    renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});

    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    const [bounds] = map.fitBounds.mock.calls[0] as [unknown[]];
    expect(bounds).toEqual([
      [178, -10],
      [182, 10],
    ]);
  });

  it('(g) consecutive selections converge to the last territory (FR-011)', async () => {
    const boundsB = { BBOX_W: 100, BBOX_S: 20, BBOX_E: 150, BBOX_N: 50, BBOX_AM: 0 };
    let selectedTerritory = 'France';
    const map = createMockMap();
    map.querySourceFeatures.mockImplementation(() => {
      return selectedTerritory === 'France'
        ? [makeFeature(VALID_BBOX_PROPS)]
        : [makeFeature(boundsB)];
    });
    const mapRef = createMockRef(map);

    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('France') as ReturnType<typeof useAppState>,
    );
    const { rerender } = renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});

    selectedTerritory = 'China';
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('China') as ReturnType<typeof useAppState>,
    );
    rerender();
    await act(async () => {});

    expect(map.fitBounds).toHaveBeenCalledTimes(2);
    const [lastBounds] = map.fitBounds.mock.calls[1] as [unknown[]];
    expect(lastBounds).toEqual([
      [100, 20],
      [150, 50],
    ]);
  });

  it('does not call fitBounds when territory goes from selected to null (FR-007)', async () => {
    const map = createMockMap();
    const mapRef = createMockRef(map);

    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('France') as ReturnType<typeof useAppState>,
    );
    const { rerender } = renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});
    expect(map.fitBounds).toHaveBeenCalledTimes(1);

    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState(null) as ReturnType<typeof useAppState>,
    );
    rerender();
    await act(async () => {});
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
  });

  it('(US2) passes Mobile padding when useIsMobile is true', async () => {
    const mobileBottom = 800 * 0.4 + 16;
    vi.mocked(usePanelPadding).mockReturnValue({
      top: 16,
      right: 16,
      bottom: mobileBottom,
      left: 16,
    });
    const map = createMockMap();
    const mapRef = createMockRef(map);
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('Australia') as ReturnType<typeof useAppState>,
    );

    renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});

    const call0p = map.fitBounds.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(call0p[1]['padding']).toEqual({ top: 16, right: 16, bottom: mobileBottom, left: 16 });
  });

  it('(US3) calls fitBounds when territory selected programmatically (not via click)', async () => {
    const map = createMockMap();
    const mapRef = createMockRef(map);
    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('Rome') as ReturnType<typeof useAppState>,
    );

    renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});

    expect(map.fitBounds).toHaveBeenCalledTimes(1);
  });

  it('(US4) does not call fitBounds again when panel is closed after selection', async () => {
    const map = createMockMap();
    const mapRef = createMockRef(map);

    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState('France') as ReturnType<typeof useAppState>,
    );
    const { rerender } = renderHook(() => useCameraFitOnSelection(mapRef as never));
    await act(async () => {});

    vi.mocked(useAppState).mockReturnValue(
      makeTerritoryState(null) as ReturnType<typeof useAppState>,
    );
    rerender();
    await act(async () => {});

    expect(map.fitBounds).toHaveBeenCalledTimes(1);
  });
});
