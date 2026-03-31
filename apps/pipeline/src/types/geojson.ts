export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown> | null;
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

export interface FeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}
