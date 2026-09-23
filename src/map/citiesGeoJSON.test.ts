import { describe, expect, it } from "vitest";
import type { City } from "../data/city";
import { citiesToGeoJSON } from "./citiesGeoJSON";

const bukhara: City = {
  id: "bukhara",
  name: "ブハラ",
  reading: "ぶはら",
  type: "city",
  lon: 64.4286,
  lat: 39.7747,
  source: "https://ja.wikipedia.org/wiki/ブハラ",
};

describe("citiesToGeoJSON", () => {
  it("都市を id だけを持つ点にする（名前は地図に渡さない）", () => {
    expect(citiesToGeoJSON([bukhara])).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [64.4286, 39.7747] },
          properties: { id: "bukhara" },
        },
      ],
    });
  });
});
