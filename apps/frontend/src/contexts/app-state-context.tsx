import { createContext, type ReactNode, useContext, useMemo, useReducer } from 'react';
import {
  type AppState,
  type AppStateActions,
  initialAppState,
  type MapViewState,
} from '../types/app-state';

interface AppStateContextValue {
  state: AppState;
  actions: AppStateActions;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

interface AppStateProviderProps {
  children: ReactNode;
  initialState?: AppState;
}

type AppStateAction =
  | { type: 'SET_SELECTED_YEAR'; year: number }
  | { type: 'SET_SELECTED_TERRITORY'; territory: string | null }
  | { type: 'SET_INFO_PANEL_OPEN'; open: boolean }
  | { type: 'SET_MAP_VIEW'; view: MapViewState }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null };

function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case 'SET_SELECTED_YEAR':
      return { ...state, selectedYear: action.year };
    case 'SET_SELECTED_TERRITORY':
      return { ...state, selectedTerritory: action.territory };
    case 'SET_INFO_PANEL_OPEN':
      return { ...state, isInfoPanelOpen: action.open };
    case 'SET_MAP_VIEW':
      return { ...state, mapView: action.view };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
  }
}

export function AppStateProvider({
  children,
  initialState = initialAppState,
}: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  const actions: AppStateActions = useMemo(
    () => ({
      setSelectedYear: (year: number) => dispatch({ type: 'SET_SELECTED_YEAR', year }),
      setSelectedTerritory: (territory: string | null) =>
        dispatch({ type: 'SET_SELECTED_TERRITORY', territory }),
      setInfoPanelOpen: (open: boolean) => dispatch({ type: 'SET_INFO_PANEL_OPEN', open }),
      setMapView: (view: MapViewState) => dispatch({ type: 'SET_MAP_VIEW', view }),
      setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', loading }),
      setError: (error: string | null) => dispatch({ type: 'SET_ERROR', error }),
    }),
    [],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
