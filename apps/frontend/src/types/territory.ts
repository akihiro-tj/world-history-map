export interface TerritoryProperties {
  NAME: string;
  SUBJECTO: string;
}

export interface KeyEvent {
  year: number;
  event: string;
}

export interface TerritoryDescription {
  id: string;
  name: string;
  year: number;
  facts: string[];
  keyEvents: KeyEvent[];
  aiGenerated: true;
}

export type YearDescriptionBundle = Record<string, TerritoryDescription>;
