import type { City } from "../data/city";

export type Bounds = [[number, number], [number, number]];

// 都市データが読めなかったときの初期表示（中央アジア〜東アジア）
export const FALLBACK_BOUNDS: Bounds = [
  [40, 30],
  [120, 50],
];

export function boundsOf(cities: readonly City[]): Bounds {
  if (cities.length === 0) {
    return FALLBACK_BOUNDS;
  }
  const lons = cities.map((city) => city.lon);
  const lats = cities.map((city) => city.lat);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}
