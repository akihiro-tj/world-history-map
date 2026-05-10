# Contract: Territory Feature BBox Properties

**Feature**: 241-camera-fit-on-territory-select  
**Date**: 2026-05-10  
**Linked plan**: [../plan.md](../plan.md) / [../research.md](../research.md) / [../data-model.md](../data-model.md)

`apps/pipeline` が出力する PMTiles の `territories` レイヤ Feature.properties に格納する **bbox 関連プロパティの契約** を定義する。`apps/pipeline` と `apps/frontend` で TypeScript 型定義は独立して保たれている（CLAUDE.md「Types are duplicated across apps」）ため、本契約ファイルが両者の同期点となる。

---

## 1. プロパティ仕様

`territories` レイヤの全 Feature が以下のプロパティを持つ：

| プロパティ名 | 型 | 必須 | 値域 | 意味 |
|-------------|----|------|------|------|
| `BBOX_W` | `number` | ✅ | `-180.0` 〜 `180.0` | 主要ポリゴンの bbox 西端経度（度） |
| `BBOX_S` | `number` | ✅ | `-90.0` 〜 `90.0` | 主要ポリゴンの bbox 南端緯度（度） |
| `BBOX_E` | `number` | ✅ | `-180.0` 〜 `540.0` | 主要ポリゴンの bbox 東端経度（度）。antimeridian 越え時は `> 180.0` を取る |
| `BBOX_N` | `number` | ✅ | `-90.0` 〜 `90.0` | 主要ポリゴンの bbox 北端緯度（度） |
| `BBOX_AM` | `0 \| 1` | ✅ | `0` または `1` | antimeridian またぎフラグ。`1` のとき `BBOX_E > 180` または `BBOX_E < BBOX_W` の不変条件で表現される |

「主要ポリゴン」とは、同 NAME を持つ MultiPolygon の中で `turf.area()` が最大の Polygon リング群を指す。`mergeByName()` 内の `largestPoly` 算出ロジックで決定される。

---

## 2. 不変条件

| 条件 | 説明 |
|------|------|
| `-90 <= BBOX_S <= BBOX_N <= 90` | 南北は単調 |
| `-180 <= BBOX_W <= 180` | 西端は通常範囲 |
| `BBOX_AM = 0` のとき `BBOX_W <= BBOX_E <= 180` | 通常領土 |
| `BBOX_AM = 1` のとき `BBOX_E > 180` または `BBOX_W > BBOX_E` | antimeridian またぎ |
| 5 プロパティの全てが Feature ごとに一致して格納される | pipeline 側で全タイル断片に同じ値を複製。frontend がどのタイル断片を読んでも同じ bbox を得る |

---

## 3. pipeline 側の生成手順（規範）

`apps/pipeline/src/tiles/merge.ts` の `mergeByName()` 内、最大ポリゴンを検出した直後に以下を実行する：

1. `turf.bbox(largestPoly)` で `[minLng, minLat, maxLng, maxLat]` を取得。
2. 主要ポリゴンの外周リング座標を経度でソートし、隣接 2 点間の経度差を全列挙。
3. 最大ギャップが `180°` を超えていれば antimeridian またぎと判定：
   - `west = ギャップの東端経度`
   - `east = ギャップの西端経度 + 360`
   - `BBOX_AM = 1`
4. それ以外は素の `turf.bbox` 結果を使用：
   - `west = minLng`、`east = maxLng`、`BBOX_AM = 0`
5. 5 プロパティを `mergedFeature.properties` にセット。
6. `KEPT_PROPERTIES` セットに 5 プロパティ名が含まれていることを保証（Tippecanoe の `--include` 等の通過要件）。

この手順は `merge.ts` のテストで以下のケースを検証する：

- 通常領土（フランス、ドイツ）→ `BBOX_AM = 0` で正規範囲の bbox
- 飛び地を持つ領土（アメリカ、イギリス）→ 最大ポリゴン（北米本土、グレートブリテン島）の bbox が出力され、ハワイ・海外領土は無視される
- antimeridian またぎ領土（フィジー、ロシア東端を含む年代）→ `BBOX_AM = 1`、`east > 180` または `west > east`

---

## 4. frontend 側の消費手順（規範）

`apps/frontend/src/domain/territory/territory-bounds.ts` の `parseFeatureBounds(properties)`：

1. 5 プロパティが全て存在することを確認。1 つでも欠けていれば `null` を返す。
2. 数値型・値域の検証。違反すれば `null` を返す。
3. `TerritoryBounds` オブジェクトに変換して返す：
   - `crossesAntimeridian = (BBOX_AM === 1)`
   - その他はそのまま転記
4. `null` を受け取った呼び出し側はカメラフィットを発火しない（既存挙動を維持）。

`use-camera-fit-on-selection.ts` は `mapRef.getMap().querySourceFeatures(SOURCE_ID, { sourceLayer: 'territories', filter: ['==', ['get', 'NAME'], selectedTerritory] })` で取得した最初のフィーチャの properties に対して `parseFeatureBounds` を呼ぶ。

---

## 5. バージョニングと互換性

- pipeline 側でプロパティを追加しても、frontend 側がそれを読まない限り影響は無い（properties は Feature 上の任意キー）。
- 本契約に定義したキーを **削除・改名** する変更は破壊的変更とみなし、別の plan / spec で扱う。
- 本契約に定義した型・値域を **狭める** 変更（例: `BBOX_E <= 180` に制限し antimeridian 対応を撤回する）も破壊的変更とみなす。
- 本契約に定義した型・値域を **広げる** 変更（例: 新たに小数の精度規定を追加する）は前方互換であれば本契約のマイナー更新で対応可能。

---

## 6. テストでの参照点

| テストファイル | 検証対象 |
|---------------|---------|
| `apps/pipeline/src/tiles/merge.test.ts` | §3 の生成手順を満たすこと（通常領土、飛び地、antimeridian 越え） |
| `apps/frontend/src/domain/territory/territory-bounds.test.ts` | §4 の消費手順を満たすこと（正常系、欠損、不正値、antimeridian 透過） |
| `apps/frontend/src/components/map/hooks/use-camera-fit-on-selection.test.tsx` | querySourceFeatures から取得した properties で `fitBounds` が正しく呼ばれること |
