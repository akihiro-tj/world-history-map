import type { City } from "../data/city";

export type CitiesFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { id: string };
  }>;
};

// 地図に渡すのは位置と id だけ。名前は選択パネルが City から表示する
export function citiesToGeoJSON(cities: readonly City[]): CitiesFeatureCollection {
  return {
    type: "FeatureCollection",
    features: cities.map((city) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [city.lon, city.lat] },
      properties: { id: city.id },
    })),
  };
}
