import type { TerritoryProperties } from './types';

export function resolveTerritoryName(properties: TerritoryProperties): string {
  return properties.NAME || properties.SUBJECTO;
}
