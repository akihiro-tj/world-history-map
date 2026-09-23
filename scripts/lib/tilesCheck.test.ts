import { describe, expect, it } from "vitest";
import { checkTiles, EXPECTED_TILES, type TilesFacts } from "./tilesCheck";

const valid: TilesFacts = {
  minZoom: 0,
  maxZoom: EXPECTED_TILES.maxZoom,
  tileType: 1,
  layerIds: ["land", "coastline"],
  sizeBytes: 5 * 1024 * 1024,
};

describe("checkTiles", () => {
  it("条件を満たせば問題なし", () => {
    expect(checkTiles(valid)).toEqual([]);
  });

  it("ズーム範囲の違いを指摘する", () => {
    expect(checkTiles({ ...valid, maxZoom: 7 })).toHaveLength(1);
    expect(checkTiles({ ...valid, minZoom: 1 })).toHaveLength(1);
  });

  it("MVT 以外を指摘する", () => {
    expect(checkTiles({ ...valid, tileType: 2 })).toHaveLength(1);
  });

  it("足りないソースレイヤーを指摘する", () => {
    expect(checkTiles({ ...valid, layerIds: ["land"] })).toEqual([
      "ソースレイヤー coastline がありません",
    ]);
  });

  it("15 MiB 以上なら指摘する", () => {
    expect(checkTiles({ ...valid, sizeBytes: 15 * 1024 * 1024 })).toHaveLength(1);
  });
});
