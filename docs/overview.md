# コードベース概要

> Last updated: 2026-04-17

## このアプリは何か

世界史学習者がブラウザ上で「任意の年の世界地図」を開き、領土を選ぶとその土地の概況・年表を読める、インタラクティブな世界史地図アプリ。教科書を縦（時代）と横（同時代の各地域）に跨いで読む負担を、単一のマップ UI に置き換える。

## アプリ構成

```
   aourednik/historical-basemaps (GitHub)
              │  GeoJSON (年別)
              ▼
         ┌──────────┐
         │ pipeline │  Notion DB (領土説明)
         └──────────┘       │
          │      │          ▼
          │      └──>  descriptions/{year}.json
          │                   (frontend/public/data)
          ▼
     world_{year}.{hash}.pmtiles
          │
          ├──> frontend/public/pmtiles/ (dev)
          └──> R2 bucket ──> worker ──> frontend (prod)
```

pipeline は上流 GeoJSON と Notion DB を取り込み、PMTiles タイルと JSON 説明文を生成する。
frontend は開発時は `public/` から直接タイルを読み、本番では worker 経由で R2 から配信する。
領土説明 JSON は環境に関わらず `frontend/public/data/descriptions/` に常駐する静的ファイル。

## データの流れ

pipeline: `historical-basemaps` を git clone し、年ごとの GeoJSON を同名領土でマージ → tippecanoe で PMTiles に変換 → SHA-256 ハッシュ付きファイル名 (`world_{year}.{hash}.pmtiles`) で書き出し、R2 にアップロード。Notion から領土説明を同期して `descriptions/{year}.json` に落とす。詳細は [pipeline.md](./pipeline.md) を参照。

frontend: React + MapLibre GL JS (react-map-gl) で地図を描画。起動時に `manifest.json` と `index.json`・`color-scheme.json` をロードし、選択年のタイル URL を組み立てて PMTiles プロトコルで読む。領土クリックで kebab-case 化した名前をキーに `descriptions/{year}.json` を引き、パネルに表示する。詳細は [frontend.md](./frontend.md) を参照。

worker: Cloudflare Worker が R2 バインディング経由で `manifest.json` と `*.pmtiles` を配信。Range Request に対応し、ハッシュ付き PMTiles は immutable キャッシュで返す。詳細は [worker.md](./worker.md) を参照。

## 中核の型

pipeline と frontend で事実上共有される型。共有パッケージはなく、`public/data/` 配下の JSON が双方の契約。

`YearEntry` — year, filename, countries
`YearIndex` — years
`TerritoryDescription` — name, era, profile, context, keyEvents
`TerritoryProfile` — capital, regime, dynasty, leader, religion
`KeyEvent` — year, event
`DeploymentManifest` — version, files, metadata
`ManifestMetadata` — hash, size

`YearEntry.year` は frontend 側で `HistoricalYear`（number の branded 型）として扱われる。
領土説明の辞書キーは GeoJSON の `NAME` プロパティを kebab-case 化したもの。

## データファイル（public/data/）

- `index.json` — 収録されている年と各年の領土一覧（`YearIndex`）。YearSelector の表示源
- `color-scheme.json` — 領土名 → HEX カラーのマッピング。地図の塗り分けに使う
- `descriptions/{year}.json` — 年単位の領土説明バンドル（`YearDescriptionBundle`）。Notion から同期
- `pmtiles/manifest.json`（dev 時は未使用。prod 時は R2 に配置されて worker が配信） — 年 → ハッシュ付きファイル名のマッピング
- `pmtiles/world_{year}.pmtiles`（dev のみ） — MapLibre が直接読む年別タイル
