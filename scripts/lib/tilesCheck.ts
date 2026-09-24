// 生成した world.pmtiles が spec §4 の条件を満たすかを調べる

export const EXPECTED_TILES = {
  minZoom: 0,
  // 15 MiB を超えて 5 に下げたときは、build-tiles.sh と spec §4 も合わせて直す
  maxZoom: 6,
  layers: ["land", "coastline"],
  maxBytes: 15 * 1024 * 1024,
} as const;

// pmtiles の TileType.Mvt
const MVT_TILE_TYPE = 1;

export type TilesFacts = {
  minZoom: number;
  maxZoom: number;
  tileType: number;
  layerIds: string[];
  sizeBytes: number;
};

export function checkTiles(facts: TilesFacts): string[] {
  const problems: string[] = [];
  if (facts.minZoom !== EXPECTED_TILES.minZoom) {
    problems.push(`minZoom が ${facts.minZoom} です（期待値 ${EXPECTED_TILES.minZoom}）`);
  }
  if (facts.maxZoom !== EXPECTED_TILES.maxZoom) {
    problems.push(`maxZoom が ${facts.maxZoom} です（期待値 ${EXPECTED_TILES.maxZoom}）`);
  }
  if (facts.tileType !== MVT_TILE_TYPE) {
    problems.push(`タイル形式が MVT ではありません（${facts.tileType}）`);
  }
  for (const layer of EXPECTED_TILES.layers) {
    if (!facts.layerIds.includes(layer)) {
      problems.push(`ソースレイヤー ${layer} がありません`);
    }
  }
  if (facts.sizeBytes >= EXPECTED_TILES.maxBytes) {
    problems.push(`ファイルサイズが ${facts.sizeBytes} バイトで上限を超えています`);
  }
  return problems;
}
