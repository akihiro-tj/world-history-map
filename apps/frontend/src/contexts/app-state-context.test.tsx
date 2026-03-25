import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { AppStateProvider, useAppState } from './app-state-context';

const initialState = {
  selectedYear: 1700,
  selectedTerritory: null,
  isInfoPanelOpen: false,
  mapView: { longitude: 0, latitude: 30, zoom: 2 },
};

function wrapper({ children }: { children: ReactNode }) {
  return <AppStateProvider initialState={initialState}>{children}</AppStateProvider>;
}

describe('AppStateProvider + useAppState', () => {
  it('provides initial state', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    expect(result.current.state).toEqual(initialState);
  });

  it('SET_SELECTED_YEAR updates selectedYear', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.setSelectedYear(1800);
    });

    expect(result.current.state.selectedYear).toBe(1800);
  });

  it('SELECT_TERRITORY updates selectedTerritory and opens panel', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.selectTerritory('France');
    });

    expect(result.current.state.selectedTerritory).toBe('France');
    expect(result.current.state.isInfoPanelOpen).toBe(true);
  });

  it('CLEAR_SELECTION clears territory and closes panel', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.selectTerritory('France');
    });
    act(() => {
      result.current.actions.clearSelection();
    });

    expect(result.current.state.selectedTerritory).toBeNull();
    expect(result.current.state.isInfoPanelOpen).toBe(false);
  });

  it('SET_MAP_VIEW updates mapView', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    const newView = { longitude: 139.7, latitude: 35.7, zoom: 5 };

    act(() => {
      result.current.actions.setMapView(newView);
    });

    expect(result.current.state.mapView).toEqual(newView);
  });

  it('throws when useAppState is used outside AppStateProvider', () => {
    expect(() => {
      renderHook(() => useAppState());
    }).toThrow('useAppState must be used within an AppStateProvider');
  });
});
