/**
 * Derives a territory description id from a GeoJSON NAME. The frontend applies the
 * same transform (TerritoryName.toLookupKey) so era-summary references and the
 * descriptions bundle stay aligned on one kebab-cased key.
 */
export function toTerritoryId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
