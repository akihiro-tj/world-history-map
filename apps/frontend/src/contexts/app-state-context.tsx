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
  | { type: 'SELECT_TERRITORY'; territory: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_MAP_VIEW'; view: MapViewState };

function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case 'SET_SELECTED_YEAR':
      return { ...state, selectedYear: action.year };
    case 'SELECT_TERRITORY':
      return { ...state, selectedTerritory: action.territory, isInfoPanelOpen: true };
    case 'CLEAR_SELECTION':
      return { ...state, selectedTerritory: null, isInfoPanelOpen: false };
    case 'SET_MAP_VIEW':
      return { ...state, mapView: action.view };
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
      selectTerritory: (territory: string) => dispatch({ type: 'SELECT_TERRITORY', territory }),
      clearSelection: () => dispatch({ type: 'CLEAR_SELECTION' }),
      setMapView: (view: MapViewState) => dispatch({ type: 'SET_MAP_VIEW', view }),
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
