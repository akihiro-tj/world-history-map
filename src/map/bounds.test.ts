import { describe, expect, it } from "vitest";
import type { City } from "../data/city";
import { boundsOf, FALLBACK_BOUNDS } from "./bounds";

function at(lon: number, lat: number): City {
  return {
    id: `c${lon}`,
    name: "x",
    reading: "x",
    type: "city",
    lon,
    lat,
    source: "https://example.com",
  };
}

describe("boundsOf", () => {
  it("すべての都市を含む範囲を返す", () => {
    expect(boundsOf([at(46, 38), at(116, 47), at(80, 40)])).toEqual([
      [46, 38],
      [116, 47],
    ]);
  });

  it("都市が無ければ既定の範囲を返す", () => {
    expect(boundsOf([])).toEqual(FALLBACK_BOUNDS);
  });
});
