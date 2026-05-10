# Phase 1 Data Model: 年代サマリーパネル

**Feature**: 年代サマリーパネル
**Date**: 2026-05-07
**Input**: spec.md の Key Entities + research.md の決定事項

## 1. ドメイン型（`apps/frontend/src/domain/era-summary/types.ts`）

### `EraSummary`

ある年代における世界全体の概況。

| フィールド | 型 | 説明 |
|----------|----|----|
| `year` | `HistoricalYear` | 対象年（既存の `domain/year/historical-year.ts` を参照） |
| `regions` | `readonly RegionCard[]` | 地域カードの配列。最低 1 件以上 |

**バリデーション**:
- `regions.length >= 1`
- `regions` 内の `region` は重複しない（同じ地域識別子が 2 度現れない）
- 配列の順序は表示順を兼ねる（先頭から順に描画）

**Immutability**: `readonly` で不変化。コンストラクタで全フィールド初期化、setter は持たない。

### `RegionCard`

EraSummary を構成する 1 地域カード。

| フィールド | 型 | 説明 |
|----------|----|----|
| `region` | `RegionId` | 地域識別子（後述の enum） |
| `title` | `string` | 表示見出し（例：「ヨーロッパ」） |
| `context` | `string` | 概況本文。1〜2 文（150〜400 文字）想定 |
| `references` | `readonly EraSummaryReference[]` | 任意。本文中のリンク参照。空配列可 |

**バリデーション**:
- `title.length >= 1 && title.length <= 30`
- `context.length >= 1 && context.length <= 500`
- `references` は空配列許容（任意：FR-009）

### `RegionId`

```ts
type RegionId =
  | 'europe'
  | 'east-asia'
  | 'southeast-asia'
  | 'south-asia'
  | 'middle-east-north-africa'
  | 'sub-saharan-africa'
  | 'americas'
  | 'oceania';
```

研究結果で確定した 7 区分 + 任意のオセアニア。識別子は kebab-case で固定（既存プロジェクトの命名規則と整合）。

### `EraSummaryReference`

地域カード本文中から地図上の領土または別の年代へ遷移するための参照単位。

| フィールド | 型 | 説明 |
|----------|----|----|
| `kind` | `'territory' \| 'year'` | 遷移種別 |
| `target` | `string` | 遷移先識別子。`kind === 'territory'` なら kebab-case 領土名（既存規則）、`'year'` なら年（数値文字列） |
| `text` | `string` | 本文中の表示文字列（マッチ対象） |

**バリデーション**:
- `kind === 'territory'` の場合：`target` は既存 `descriptions/{year}.json` のキー集合に存在する（plan 時点で完全担保はせず、ランタイムで未解決時はリンクを描画しないフォールバック）
- `kind === 'year'` の場合：`target` は `historical-basemaps` 対応年集合に存在する

## 2. AppState 拡張（`apps/frontend/src/types/app-state.ts`）

既存の `AppState` に以下を追加：

| フィールド | 型 | 初期値 | 説明 |
|----------|----|----|----|
| `isSummaryPanelOpen` | `boolean` | `!isMobile`（デバイスに依存） | サマリーパネルの表示状態。デスクトップ初期 `true`、モバイル初期 `false` |

### 不変条件（reducer で保証）

```
NOT (isSummaryPanelOpen AND isInfoPanelOpen)
```

両者が同時に `true` にならない。違反は reducer 実装側でブロック。

### 既存・新規 actions

| Action | 既存/新規 | 効果 |
|--------|----------|------|
| `SET_SELECTED_YEAR` | 既存 | `selectedYear` 更新。パネルの開閉には影響しない |
| `SELECT_TERRITORY` | 既存（改修） | `selectedTerritory` 設定 + `isInfoPanelOpen: true` + **`isSummaryPanelOpen: false`**（追加） |
| `CLEAR_SELECTION` | 既存 | `selectedTerritory: null`、`isInfoPanelOpen: false`。サマリーには触れない |
| `OPEN_SUMMARY` | 新規 | `isSummaryPanelOpen: true` + `isInfoPanelOpen: false` + `selectedTerritory: null` |
| `CLOSE_SUMMARY` | 新規 | `isSummaryPanelOpen: false`。territory には触れない |
| `SET_MAP_VIEW` | 既存 | 変更なし |

## 3. データ取得（`apps/frontend/src/domain/era-summary/load.ts`）

### 関数シグネチャ

```ts
export async function loadEraSummary(year: HistoricalYear): Promise<EraSummary | null>;
```

- 内部で `fetch('/data/era-summaries/{year}.json')` を呼ぶ
- 404 の場合は `null` を返す（FR-007 fallback の判定材料）
- パース失敗時は例外をスロー（呼び出し側で `RoleErrorMessage` 表示）

### React 統合

`apps/frontend/src/components/era-summary-panel/hooks/use-era-summary.ts`：

```ts
export function useEraSummary(year: HistoricalYear): {
  summary: EraSummary | null;
  isLoading: boolean;
  error: string | null;
};
```

既存の `use-territory-description.ts` と同じパターン。

## 4. 状態遷移図（パネル開閉）

```
            ┌─────────────────────────────────────┐
            │   none                              │
            │   (どちらも閉じている)              │
            └────────┬────────────────────┬───────┘
                     │ OPEN_SUMMARY        │ SELECT_TERRITORY
                     │ ↓                   │ ↓
            ┌────────┴──────────┐ ┌────────┴──────────┐
            │ summaryOpen        │ │ territoryOpen      │
            │ (サマリーのみ表示) │ │ (詳細のみ表示)     │
            └─┬──────┬───────────┘ └─┬──────┬─────────┘
              │      │                │      │
              │      │ SELECT_TERRITORY      │ OPEN_SUMMARY
              │      │  → territoryOpen      │ → summaryOpen
              │      │ (後勝ち排他)          │ (後勝ち排他)
              │      └────────────────┐ ┌────┘
              │                       │ │
              │                       v v
              │ CLOSE_SUMMARY         (上記いずれかの遷移)
              │ → none
              └─→
              CLEAR_SELECTION         CLEAR_SELECTION
              (territory なら → none)
```

「同時に両方開いている」状態が **存在しない**（型的にも振る舞い的にも）ことが保証される。

## 5. JSON スキーマ（外部契約のサマリー）

`era-summaries/{year}.json` の概略。詳細は [contracts/era-summary-data.md](./contracts/era-summary-data.md) を参照。

```json
{
  "year": 1500,
  "regions": [
    {
      "region": "europe",
      "title": "ヨーロッパ",
      "context": "大航海時代の幕開け。...",
      "references": [
        { "kind": "territory", "target": "portugal", "text": "ポルトガル" }
      ]
    }
  ]
}
```

## 6. バリデーション層

| 層 | 担当 | ルール |
|----|------|------|
| Pipeline 取得・変換時 | `apps/pipeline/src/stages/sync-era-summaries.ts` | Notion API レスポンスをスキーマ全項目（必須・型・長さ・enum 一致）でバリデーション。`References` の JSON 文字列パースもここで実施 |
| ランタイム読込時 | `domain/era-summary/load.ts` | 緩いガード（必須フィールドの存在確認）+ 例外時は `null` |
| コンポーネント描画時 | `region-card.tsx` 等 | 表示 fallback（reference 解決失敗時はリンクなしで描画） |

ビルド時にすべての年代の JSON を validate する CI gate を追加することは plan の対象外（Out of Plan Scope）。
