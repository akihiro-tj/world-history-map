import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { type AppState, type AppStateActions, initialAppState, type MapViewState } from '../types';

/**
 * AppState context type
 */
interface AppStateContextValue {
  state: AppState;
  actions: AppStateActions;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

/**
 * AppStateProvider props
 */
interface AppStateProviderProps {
  children: ReactNode;
  /** Initial state for testing (uses default when omitted) */
  initialState?: AppState;
}

/**
 * Provider that supplies application state
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <AppStateProvider>
 *       <MapView />
 *       <YearSelector />
 *     </AppStateProvider>
 *   );
 * }
 * ```
 */
export function AppStateProvider({
  children,
  initialState = initialAppState,
}: AppStateProviderProps) {
  const [state, setState] = useState<AppState>(initialState);

  const setSelectedYear = useCallback((year: number) => {
    setState((prev) => ({ ...prev, selectedYear: year }));
  }, []);

  const setSelectedTerritory = useCallback((territory: string | null) => {
    setState((prev) => ({ ...prev, selectedTerritory: territory }));
  }, []);

  const setInfoPanelOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isInfoPanelOpen: open }));
  }, []);

  const setMapView = useCallback((view: MapViewState) => {
    setState((prev) => ({ ...prev, mapView: view }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const actions: AppStateActions = useMemo(
    () => ({
      setSelectedYear,
      setSelectedTerritory,
      setInfoPanelOpen,
      setMapView,
      setLoading,
      setError,
    }),
    [setSelectedYear, setSelectedTerritory, setInfoPanelOpen, setMapView, setLoading, setError],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

/**
 * Hook to get application state
 *
 * @returns Current state and update actions
 * @throws When used outside of AppStateProvider
 *
 * @example
 * ```tsx
 * function YearSelector() {
 *   const { state, actions } = useAppState();
 *   return (
 *     <button onClick={() => actions.setSelectedYear(1700)}>
 *       Current: {state.selectedYear}
 *     </button>
 *   );
 * }
 * ```
 */
export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
