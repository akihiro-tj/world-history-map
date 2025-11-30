/**
 * Year entry
 * Holds PMTiles file information for each year
 */
export interface YearEntry {
  /** Year (negative values represent BCE) */
  year: number;

  /** PMTiles filename (e.g., "world_1650.pmtiles") */
  filename: string;

  /** Array of country/territory names that existed in this era */
  countries: string[];
}

/**
 * Year index
 * List of all available years
 */
export interface YearIndex {
  years: YearEntry[];
}

/**
 * Territory properties
 * Attributes contained in PMTiles vector tiles
 */
export interface TerritoryProperties {
  /** Country/territory name (for label display) */
  NAME: string;

  /** Colonial power or region name (for color grouping) */
  SUBJECTO: string;

  /** Larger cultural sphere affiliation */
  PARTOF: string;

  /** Border precision: 1=approximate, 2=moderate, 3=international law compliant */
  BORDERPRECISION: 1 | 2 | 3;
}

/**
 * Territory description
 * AI-generated historical content
 */
export interface TerritoryDescription {
  /** Unique identifier (`{NAME}_{year}` format) */
  id: string;

  /** Territory name (Japanese) */
  name: string;

  /** Target year */
  year: number;

  /** Summary (1-2 sentences, recommended under 100 characters) */
  summary: string;

  /** Historical background (200-500 characters) */
  background: string;

  /** Key events (recommended 3-5 items) */
  keyEvents: string[];

  /** Related years (for year link navigation) */
  relatedYears: number[];

  /** Generation timestamp (ISO 8601 format) */
  generatedAt: string;

  /** AI-generated flag (always true) */
  aiGenerated: true;
}

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
    longitude: 0,
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
