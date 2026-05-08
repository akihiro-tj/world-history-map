import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createHistoricalYear } from '../domain/year/historical-year';
import { AppStateProvider, useAppState } from './app-state-context';

const initialState = {
  selectedYear: createHistoricalYear(1700),
  activePanel: { kind: 'none' as const },
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
      result.current.actions.setSelectedYear(createHistoricalYear(1800));
    });

    expect(result.current.state.selectedYear).toBe(1800);
  });

  it('SET_SELECTED_YEAR does not affect panel state', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.openSummary();
    });
    act(() => {
      result.current.actions.setSelectedYear(createHistoricalYear(1800));
    });

    expect(result.current.state.activePanel.kind).toBe('summary');
  });

  it('SELECT_TERRITORY sets activePanel to territory and stores territory name', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.openSummary();
    });
    act(() => {
      result.current.actions.selectTerritory('France');
    });

    const panel = result.current.state.activePanel;
    expect(panel.kind).toBe('territory');
    if (panel.kind === 'territory') {
      expect(panel.selectedTerritory).toBe('France');
    }
  });

  it('CLEAR_SELECTION sets activePanel to none', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.selectTerritory('France');
    });
    act(() => {
      result.current.actions.clearSelection();
    });

    expect(result.current.state.activePanel.kind).toBe('none');
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

  it('OPEN_SUMMARY sets activePanel to summary and closes territory panel', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.selectTerritory('France');
    });
    act(() => {
      result.current.actions.openSummary();
    });

    expect(result.current.state.activePanel.kind).toBe('summary');
  });

  it('CLOSE_PANEL sets activePanel to none', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.openSummary();
    });
    act(() => {
      result.current.actions.closePanel();
    });

    expect(result.current.state.activePanel.kind).toBe('none');
  });

  it('OPEN_SUMMARY is idempotent', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.openSummary();
    });
    act(() => {
      result.current.actions.openSummary();
    });

    expect(result.current.state.activePanel.kind).toBe('summary');
  });

  it('after-wins exclusion: OPEN_SUMMARY → SELECT_TERRITORY → OPEN_SUMMARY cycle maintains invariant', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.actions.openSummary();
    });
    expect(result.current.state.activePanel.kind).toBe('summary');

    act(() => {
      result.current.actions.selectTerritory('France');
    });
    expect(result.current.state.activePanel.kind).toBe('territory');

    act(() => {
      result.current.actions.openSummary();
    });
    expect(result.current.state.activePanel.kind).toBe('summary');
  });
});
