import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { initialAppState, type AppState, type AppStateActions, type MapViewState } from '../types';

/**
 * AppStateコンテキストの型
 */
interface AppStateContextValue {
  state: AppState;
  actions: AppStateActions;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

/**
 * AppStateプロバイダーのProps
 */
interface AppStateProviderProps {
  children: ReactNode;
  /** テスト用の初期状態（省略時はデフォルト値） */
  initialState?: AppState;
}

/**
 * アプリケーション状態を提供するプロバイダー
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
export function AppStateProvider({ children, initialState = initialAppState }: AppStateProviderProps) {
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

  const setDisclaimerOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isDisclaimerOpen: open }));
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
      setDisclaimerOpen,
      setMapView,
      setLoading,
      setError,
    }),
    [setSelectedYear, setSelectedTerritory, setInfoPanelOpen, setDisclaimerOpen, setMapView, setLoading, setError],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

/**
 * アプリケーション状態を取得するフック
 *
 * @returns 現在の状態と更新アクション
 * @throws AppStateProvider外で使用された場合
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
