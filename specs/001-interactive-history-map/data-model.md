# Data Model: インタラクティブ世界史地図

**Date**: 2025-11-29
**Feature**: 001-interactive-history-map

## Overview

本アプリケーションは外部データソース（historical-basemaps）をPMTiles形式に変換したベクタータイルと、AI生成の領土説明JSONを使用する。バックエンドデータベースは使用しない。

## Entities

### 1. YearIndex（年代インデックス）

アプリケーションで利用可能な年代の一覧を管理する。

```typescript
interface YearEntry {
  /** 年代（負の値は紀元前を表す） */
  year: number;

  /** PMTilesファイル名（例: "world_1650.pmtiles"） */
  filename: string;

  /** その時代に存在した国・地域名の配列 */
  countries: string[];
}

interface YearIndex {
  years: YearEntry[];
}
```

**データソース**: `public/pmtiles/index.json`（historical-basemapsから変換）

**バリデーション**:
- `year`は整数
- `filename`は`/^world_-?\d+\.pmtiles$/`にマッチ
- `countries`は空配列でも可

### 2. Territory（領土）

地図上に表示される領土のジオメトリと属性。PMTiles内のMVT（Mapbox Vector Tile）形式。

```typescript
interface TerritoryProperties {
  /** 国・地域名（ラベル表示用） */
  NAME: string;

  /** 植民地権力や地域名（色分けのグルーピング用） */
  SUBJECTO: string;

  /** より大きな文化圏への帰属 */
  PARTOF: string;

  /** 境界精度: 1=概略、2=中程度、3=国際法準拠 */
  BORDERPRECISION: 1 | 2 | 3;
}

interface TerritoryFeature {
  type: 'Feature';
  properties: TerritoryProperties;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

interface TerritoryCollection {
  type: 'FeatureCollection';
  features: TerritoryFeature[];
}
```

**データソース**: `public/pmtiles/world_{year}.pmtiles`

**バリデーション**:
- `NAME`は必須、空文字不可
- `geometry`は有効なPolygonまたはMultiPolygon

### 3. TerritoryDescription（領土説明）

領土の歴史的説明。AI生成コンテンツ。

```typescript
interface TerritoryDescription {
  /** 一意識別子（`{NAME}_{year}`形式） */
  id: string;

  /** 領土名（日本語） */
  name: string;

  /** 対象年代 */
  year: number;

  /** 概要（1-2文、100文字以内推奨） */
  summary: string;

  /** 時代背景（200-500文字） */
  background: string;

  /** 主要な出来事（3-5項目推奨） */
  keyEvents: string[];

  /** 関連する年代（年代リンク用） */
  relatedYears: number[];

  /** 生成日時（ISO 8601形式） */
  generatedAt: string;

  /** AI生成フラグ（常にtrue） */
  aiGenerated: true;
}

interface DescriptionIndex {
  descriptions: TerritoryDescription[];
}
```

**データソース**: `src/data/descriptions/{year}.json`

**バリデーション**:
- `id`は`{NAME}_{year}`形式
- `relatedYears`の各要素はYearIndexに存在する年代
- `aiGenerated`は常に`true`

### 4. AppState（アプリケーション状態）

UIの状態管理用。永続化しない。

```typescript
interface AppState {
  /** 現在選択中の年代 */
  selectedYear: number;

  /** 現在選択中の領土（null = 未選択） */
  selectedTerritory: string | null;

  /** 領土情報パネルの表示状態 */
  isInfoPanelOpen: boolean;

  /** ライセンス・免責事項モーダルの表示状態 */
  isDisclaimerOpen: boolean;

  /** 地図のビュー状態 */
  mapView: {
    longitude: number;
    latitude: number;
    zoom: number;
  };

  /** ローディング状態 */
  isLoading: boolean;

  /** エラー状態 */
  error: string | null;
}
```

**初期状態**:
```typescript
const initialState: AppState = {
  selectedYear: 1650,
  selectedTerritory: null,
  isInfoPanelOpen: false,
  isDisclaimerOpen: false,
  mapView: {
    longitude: 0,
    latitude: 30,
    zoom: 2,
  },
  isLoading: false,
  error: null,
};
```

## Relationships

```
YearIndex
    │
    │ 1:N (year → filename)
    ▼
TerritoryCollection ◄──────────────────┐
    │                                   │
    │ 1:N (NAME → features)             │ references
    ▼                                   │
TerritoryFeature ─────────────────────► TerritoryDescription
    │                                   (NAME + year → id)
    │
    └── properties.SUBJECTO (色分けグループ)
```

## State Transitions

### 年代選択

```
[初期状態: 1650年]
    │
    ▼ ユーザーが年代ボタンをクリック
[Loading状態]
    │
    ├─► [成功] → selectedYear更新、PMTilesロード
    │
    └─► [失敗] → error設定、最も近い年代を提案
```

### 領土選択

```
[領土未選択]
    │
    ▼ ユーザーが領土をクリック
[領土選択中]
    │
    ├─► 説明データあり → isInfoPanelOpen: true
    │
    └─► 説明データなし → 「準備中」メッセージ表示
    │
    ▼ パネル閉じる or 別領土クリック
[領土未選択 or 別領土選択中]
```

## Data Flow

```
1. アプリ起動
   └─► index.json ロード → YearIndex取得

2. 年代選択（初期: 1650年）
   └─► world_1650.pmtiles ロード → ベクタータイル取得
   └─► descriptions/1650.json ロード → DescriptionIndex取得

3. 領土クリック
   └─► TerritoryDescription検索（id = NAME_year）
   └─► 情報パネル表示

4. 説明内の年代リンククリック
   └─► selectedYear更新 → 2.に戻る
```

## File Structure

```
public/
└── pmtiles/
    ├── index.json              # YearIndex
    ├── world_1650.pmtiles      # ベクタータイル (1650年)
    ├── world_1700.pmtiles      # ベクタータイル (1700年)
    └── ...

src/
└── data/
    └── descriptions/
        ├── 1650.json           # DescriptionIndex (1650年)
        ├── 1700.json           # DescriptionIndex (1700年)
        └── ...
```

## Notes

- バックエンドAPIは使用しない（静的ファイルのみ）
- PMTilesデータはhistorical-basemapsのGeoJSONからTippecanoeで変換（GPL-3.0ライセンス遵守）
- 領土説明はビルド時にAI生成し、レビュー後にコミット
- 説明データがない領土は「準備中」として表示
