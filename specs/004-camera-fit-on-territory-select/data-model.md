# Data Model: Camera Fit on Territory Select

**Feature**: 004-camera-fit-on-territory-select  
**Date**: 2026-05-10  
**Linked plan**: [plan.md](./plan.md) / [contracts/territory-feature-bbox.md](./contracts/territory-feature-bbox.md)

本機能は永続化データを追加しない。既存のフロントエンド state（`AppState`）にも新規プロパティを **追加しない**。
カメラ位置の変更は MapLibre インスタンスへの命令で完結し、React state ループには載せない。

新規に導入するのは：
- pipeline 出力の Feature プロパティ（contracts/ で確定）
- frontend で扱う in-memory 型 3 種（本ドキュメント）

---

## 1. `TerritoryBounds`

**用途**: 領土の主要ポリゴン（最大面積部分）の地理的外接矩形。`fitBounds` 呼び出しの入力。

**配置**: `apps/frontend/src/domain/territory/territory-bounds.ts`

**フィールド**:

| Field | Type | Meaning |
|-------|------|---------|
| `west` | `number` | 西端の経度（度） |
| `south` | `number` | 南端の緯度（度） |
| `east` | `number` | 東端の経度（度。antimeridian またぎ時は west より小さい、または 180 より大きい） |
| `north` | `number` | 北端の緯度（度） |
| `crossesAntimeridian` | `boolean` | pipeline 側で `BBOX_AM === 1` だったかを保持 |

**不変条件**:

- `-90 <= south <= north <= 90`
- `-180 <= west <= 180`
- 通常時: `west <= east <= 180`、`crossesAntimeridian === false`
- antimeridian 越え時: `east > 180` または `east < west`、`crossesAntimeridian === true`

**派生表現**:

- MapLibre `fitBounds` 呼び出し時は `[[west, south], [east, north]]` の `LngLatBoundsLike` として渡す。`crossesAntimeridian` を別途見る必要は無い（east > 180 を MapLibre が直接扱える）。

**生成元**:

- `parseFeatureBounds(featureProperties)` で Feature.properties（`BBOX_W` / `BBOX_S` / `BBOX_E` / `BBOX_N` / `BBOX_AM`）から生成。各値が数値であることと不変条件を検証し、満たさなければ `null` を返す（呼び出し側で「フィットしない」を選択させる）。

---

## 2. `PaddingInsets`

**用途**: `fitBounds` の `padding` オプションに渡す四方向ピクセル余白。Desktop / Mobile レイアウトに応じて算出される。

**配置**: `apps/frontend/src/components/map/hooks/use-panel-padding.ts` 内に export する。

**フィールド**:

| Field | Type | Meaning |
|-------|------|---------|
| `top` | `number` | 上端からの余白（ピクセル） |
| `right` | `number` | 右端からの余白（ピクセル） |
| `bottom` | `number` | 下端からの余白（ピクセル） |
| `left` | `number` | 左端からの余白（ピクセル） |

**不変条件**:

- 全フィールド `>= 0`
- `top + bottom < window.innerHeight` かつ `left + right < window.innerWidth`（フィット後に可視領域が残ることを保証）

**派生表現**:

- MapLibre `fitBounds` の `padding` オプションはこの形のオブジェクトをそのまま受け付ける。

---

## 3. `CameraFitOptions`

**用途**: `fitBounds` 呼び出しのオプションを 1 箇所に集約した型。`use-camera-fit-on-selection.ts` 内部で組み立てる。

**配置**: `apps/frontend/src/components/map/hooks/use-camera-fit-on-selection.ts` 内（外部 export しない）

**フィールド**:

| Field | Type | Meaning |
|-------|------|---------|
| `padding` | `PaddingInsets` | パネル占有領域を考慮した余白 |
| `maxZoom` | `number` | フィット時の最大ズーム上限。`MAP_CONFIG.MAX_FIT_ZOOM` を渡す |
| `duration` | `number` | アニメーション時間（ms）。`prefers-reduced-motion: reduce` のとき `0` |

**不変条件**:

- `maxZoom <= MAP_CONFIG.maxZoom`
- `maxZoom >= MAP_CONFIG.minZoom`
- `duration >= 0`

---

## 4. AppState 不変条件（変更なし）

`AppState` に新規フィールドは追加しない。本機能は次の既存プロパティを **読み取りのみ** で利用する：

- `state.activePanel.kind === 'territory'`：フィットを発火する条件
- `state.activePanel.selectedTerritory`：bbox 取得と `TerritoryHighlightLayer` フィルタの両方の入力
- `state.selectedYear`：選択中領土の形状が年代切替で変化したときの再フィット契機（FR-009）

書き込みは行わない（カメラ命令は `mapRef.current?.fitBounds()` で完結）。

---

## 5. 状態遷移（イベント駆動視点）

新規 reducer 状態は無いが、カメラフィットの発火・抑止条件をイベント図として整理しておく：

```text
[activePanel.kind, selectedTerritory, selectedYear] の変化
  │
  ├─ activePanel.kind: 'territory' → 'territory' で selectedTerritory 変化  → FIT
  ├─ activePanel.kind: 'none' / 'summary' → 'territory'                       → FIT（新規選択）
  ├─ activePanel.kind: 'territory' → 'none' / 'summary'                       → SKIP（FR-007: カメラ維持）
  ├─ selectedYear 変化 + activePanel.kind === 'territory' + 同領土が新年代に存在 → FIT（FR-009: 形状変化への追随）
  └─ selectedYear 変化 + 同領土が消失 → activePanel が clearSelection で 'none' に → SKIP

querySourceFeatures 結果が空の場合（タイル未読込）：
  → sourcedata イベントを 1 度購読し、対象タイル群の読込完了を待って再試行
  → 再試行時に selectedTerritory が変わっていれば古い試行を捨てる
```

---

## 6. pipeline 側の中間データ

**用途**: `mergeByName()` 内部で最大ポリゴンに対して `turf.bbox()` を呼ぶ際の中間表現。永続化はせず、最終的に Feature.properties に展開される。

**配置**: `apps/pipeline/src/tiles/merge.ts` 内（実装局所）

**シグネチャ（参考）**:

```typescript
function computeMainBbox(largestPoly: turf.Feature<turf.Polygon>): {
  west: number;
  south: number;
  east: number;
  north: number;
  crossesAntimeridian: boolean;
};
```

frontend 側 `TerritoryBounds` と意図的に同じ形状にしておくことで、契約ファイル（`contracts/territory-feature-bbox.md`）を介して 2 アプリ間の整合を維持する。
