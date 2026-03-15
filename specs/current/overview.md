# コードベース概要

> Last synced: 2026-03-15

## このアプリは何か

世界史の領土変遷をインタラクティブな地図で表示する Web アプリ。
ユーザーは年代を選び、その時代の世界地図を閲覧し、領土をクリックして詳細情報を読む。

## アプリ構成

3 つのアプリで構成される。

```
  GitHub (GeoJSON)      Notion (領土情報)
       │                      │
       ▼                      ▼
  ┌────────────────────────────────┐
  │  pipeline (Node.js CLI)        │
  │  データ取得 → 変換 → デプロイ  │
  └──────┬─────────────────┬───────┘
         │                 │
    R2 に upload     public/data/ に出力
         │                 │
         ▼                 │
  ┌──────────────┐         │
  │  worker       │         │
  │  タイル配信   │         │
  └──────┬───────┘         │
         │                 │
         ▼                 ▼
  ┌────────────────────────────────┐
  │  frontend (React)              │
  │  MapLibre GL JS で地図描画     │
  │  領土情報パネル表示            │
  └────────────────────────────────┘
```

## pipeline: データの流れ

2 系統ある。**地図タイル**と**領土説明**。

### 地図タイル系統

GitHub の歴史地図リポジトリから GeoJSON を取得し、PMTiles（ベクタータイル）に変換する。

```
  fetch: GitHub から年別 GeoJSON を git clone
    ↓
  merge: 同名領土のポリゴンを統合 + ラベル点を生成 (@turf/turf)
    ↓
  validate: GeoJSON の整合性チェック
    ↓
  convert: tippecanoe で PMTiles に変換
    ↓
  prepare: SHA-256 ハッシュをファイル名に付与
    ↓
  index-gen: 年一覧 (index.json) を生成
    ↓
  upload: Cloudflare R2 にアップロード (wrangler)
```

増分処理: ファイルハッシュで変更検知し、変わった年だけ再処理する。
状態は `.cache/pipeline-state.json` に保存される。

### 領土説明系統

Notion DB から領土の説明情報を取得し、年別 JSON に変換する。

```
  territory-sync: Notion API → 年ごとにグルーピング → public/data/descriptions/{year}.json
```

## frontend: 状態設計

状態は 3 層に分かれる。

```
  ┌─────────────────────────────────────┐
  │  AppStateContext (useReducer)        │
  │  ・selectedYear: 選択中の年          │
  │  ・selectedTerritory: 選択中の領土   │
  │  ・isInfoPanelOpen: パネル開閉       │
  │  ・mapView: カメラ位置               │
  └──────────┬──────────────────────────┘
             │ 参照・更新
  ┌──────────┴──────────────────────────┐
  │  カスタム hooks                      │
  │  ・useMapData: PMTiles URL 取得      │
  │  ・useTerritoryDescription: 説明取得 │
  │  ・useYearIndex: 年一覧取得          │
  │  ・useProjection: 投影法切替         │
  └──────────┬──────────────────────────┘
             │ 制御
  ┌──────────┴──────────────────────────┐
  │  MapLibre 内部状態                   │
  │  ・viewport (pan/zoom)              │
  │  ・layers & sources                 │
  │  ・projection (globe/mercator)      │
  └─────────────────────────────────────┘
```

## 中核の型

pipeline と frontend に同じ形状で独立定義されている（共有パッケージはない）。
JSON ファイルが事実上のスキーマ契約。

**TerritoryDescription** — 領土の説明情報

```
{ name, era?, profile?, context?, keyEvents? }
  └ profile: { capital?, regime?, dynasty?, leader?, religion? }
  └ keyEvents: [{ year, event }]
```

**YearEntry** — 年一覧の 1 エントリ

```
{ year, filename, countries[] }
```

**TerritoryProperties** — GeoJSON / PMTiles レイヤーの属性

```
{ NAME, SUBJECTO }
```

## データファイル（public/data/）

- `descriptions/{year}.json` — 年別の領土説明。キーは kebab-case の領土名
- `color-scheme.json` — 領土名 → HSL 色のマッピング
- `../pmtiles/index.json` — 利用可能な年一覧と各年の領土名リスト

## worker: タイル配信

Cloudflare Worker が R2 バケットからファイルを配信する。

- `manifest.json`: 5 分キャッシュ。年 → ハッシュ付きファイル名のマッピング
- `world_{year}.{hash}.pmtiles`: 永久キャッシュ（ハッシュが変わらない限り同一）
- Range Request 対応で、MapLibre が必要な部分だけ取得する

## よくある問い

### 新しい年代のデータを追加したい

pipeline を実行する。`pnpm pipeline run --year 1600` で特定年のみ処理できる。
fetch → merge → validate → convert → prepare → index-gen → upload の順に自動実行される。

### 領土の説明文を更新したい

Notion DB でデータを編集し、`pnpm pipeline territory-sync` を実行する。
`public/data/descriptions/{year}.json` が更新される。

### 領土をクリックしたとき何が起きるか

1. MapLibre のクリックイベントで領土名 (NAME) を取得
2. AppStateContext の `selectTerritory(name)` を呼び出し
3. `useTerritoryDescription` hook が `/data/descriptions/{year}.json` を fetch
4. kebab-case に変換した領土名をキーに説明を抽出
5. TerritoryInfoPanel に表示

### 年代を変えたとき何が起きるか

1. YearSelector で年を選択
2. AppStateContext の `setSelectedYear(year)` を呼び出し
3. `useMapData` hook が新しい PMTiles URL を算出
4. MapLibre のソースが更新され、地図が切り替わる

### 開発環境と本番環境でタイル配信が違う

- 開発: `pmtiles:///pmtiles/world_{year}.pmtiles`（ローカルファイル直接参照）
- 本番: `pmtiles://{VITE_TILES_BASE_URL}/world_{year}.{hash}.pmtiles`（Worker 経由で R2 から配信）
