/**
 * Map view state
 */
export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

/**
 * Application state
 * For UI-wide state management
 */
export interface AppState {
  /** Currently selected year */
  selectedYear: number;

  /** Currently selected territory (null = not selected) */
  selectedTerritory: string | null;

  /** Territory info panel visibility */
  isInfoPanelOpen: boolean;

  /** License/disclaimer modal visibility */
  isDisclaimerOpen: boolean;

  /** Map view state */
  mapView: MapViewState;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;
}

/**
 * Initial application state
 */
export const initialAppState: AppState = {
  selectedYear: 1650,
  selectedTerritory: null,
  isInfoPanelOpen: false,
  isDisclaimerOpen: false,
  mapView: {
    longitude: 40,
    latitude: 30,
    zoom: 2,
  },
  isLoading: false,
  error: null,
};

/**
 * Actions available in app state context
 */
export interface AppStateActions {
  setSelectedYear: (year: number) => void;
  setSelectedTerritory: (territory: string | null) => void;
  setInfoPanelOpen: (open: boolean) => void;
  setDisclaimerOpen: (open: boolean) => void;
  setMapView: (view: MapViewState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
