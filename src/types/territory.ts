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
 * Key historical event with year
 */
export interface KeyEvent {
  /** Year of the event */
  year: number;
  /** Event description */
  event: string;
}

/**
 * Territory description
 * AI-generated factual historical data
 */
export interface TerritoryDescription {
  /** Unique identifier (`{NAME}_{year}` format) */
  id: string;

  /** Territory name (Japanese) */
  name: string;

  /** Target year */
  year: number;

  /** Basic facts about the territory (e.g., "首都: パリ", "君主: ルイ14世") */
  facts: string[];

  /** Key events (recommended 3-5 items, sorted by year) */
  keyEvents: KeyEvent[];

  /** Related years (for year link navigation) - optional */
  relatedYears?: number[];

  /** AI-generated flag (always true) */
  aiGenerated: true;
}
