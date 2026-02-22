/**
 * Territory properties
 * Attributes contained in PMTiles vector tiles
 */
export interface TerritoryProperties {
  NAME: string;
  SUBJECTO: string;
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

  /** AI-generated flag (always true) */
  aiGenerated: true;
}

/**
 * Year-level bundle of territory descriptions
 * Maps kebab-case territory name to its description
 */
export type YearDescriptionBundle = Record<string, TerritoryDescription>;
