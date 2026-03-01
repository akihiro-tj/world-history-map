export interface TerritoryProfile {
  capital?: string;
  regime?: string;
  leader?: string;
  population?: string;
  religion?: string;
}

export interface KeyEvent {
  year: number;
  event: string;
}

export interface TerritoryDescription {
  name: string;
  era?: string;
  profile?: TerritoryProfile;
  context?: string;
  keyEvents?: KeyEvent[];
}

export type YearDescriptionBundle = Record<string, TerritoryDescription>;

export type KeyEventTemporal = 'past' | 'current' | 'future';

export interface ClassifiedKeyEvent extends KeyEvent {
  temporal: KeyEventTemporal;
}

export const PROFILE_FIELD_ORDER = [
  'capital',
  'regime',
  'leader',
  'population',
  'religion',
] as const satisfies readonly (keyof TerritoryProfile)[];

export const PROFILE_FIELD_LABELS: Record<keyof TerritoryProfile, string> = {
  capital: '首都',
  regime: '政体',
  leader: '指導者',
  population: '人口',
  religion: '宗教',
};
