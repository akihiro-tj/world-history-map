export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface AppState {
  selectedYear: number;
  selectedTerritory: string | null;
  isInfoPanelOpen: boolean;
  mapView: MapViewState;
  isLoading: boolean;
  error: string | null;
}

export const initialAppState: AppState = {
  selectedYear: 1650,
  selectedTerritory: null,
  isInfoPanelOpen: false,
  mapView: {
    longitude: 40,
    latitude: 30,
    zoom: 2,
  },
  isLoading: false,
  error: null,
};

export interface AppStateActions {
  setSelectedYear: (year: number) => void;
  setSelectedTerritory: (territory: string | null) => void;
  setInfoPanelOpen: (open: boolean) => void;
  setMapView: (view: MapViewState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
