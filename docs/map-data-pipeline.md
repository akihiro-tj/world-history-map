# 地図データパイプライン

歴史地図データの処理ワークフローを説明するドキュメント。GeoJSON の取得から PMTiles への変換、Cloudflare R2 への配信までの全工程を網羅する。

## 概要

```
historical-basemaps (GitHub)
        │
        ▼
┌──────────────────────────┐
│ 1. GeoJSON ダウンロード  │  convert-to-pmtiles.sh
│ 2. ポリゴンマージ        │  merge-same-name-polygons.mjs
│ 3. PMTiles 変換          │  tippecanoe + tile-join
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 4. 年代インデックス生成  │  generate-index.sh
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 5. ファイル名ハッシュ化  │  prepare-pmtiles.mjs
│ 6. R2 へアップロード     │  upload-to-r2.sh
└────────────┬─────────────┘
             │
             ▼
      フロントエンド (MapLibre)
```

## 前提条件

| ツール | 用途 | インストール |
|--------|------|-------------|
| tippecanoe | GeoJSON → PMTiles 変換 | `brew install tippecanoe` |
| jq | インデックス生成時の JSON 処理 | `brew install jq` |
| Node.js 22.x | スクリプト実行 | pnpm 経由 |
| wrangler | Cloudflare R2 アップロード | `pnpm add -g wrangler` |

## データソース

- **リポジトリ**: [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0)
- **形式**: 年代ごとの GeoJSON FeatureCollection
- **ファイル名規則**: `world_1650.geojson`（西暦）、`world_bc1000.geojson`（紀元前）
- **プロパティ**: `NAME`, `SUBJECTO`, `PARTOF`, `BORDERPRECISION`

## パイプラインの各ステップ

### ステップ 1〜3: GeoJSON → PMTiles 変換

```bash
# 単一年度
./scripts/convert-to-pmtiles.sh 1650

# 全年度
./scripts/convert-to-pmtiles.sh all

# 利用可能な年度一覧
./scripts/convert-to-pmtiles.sh list
```

このスクリプトは内部で 3 つのサブステップを実行する。

#### 1a. GeoJSON ダウンロード

historical-basemaps からダウンロードし `.cache/geojson/` にキャッシュする。キャッシュが存在する場合はスキップ。

- 紀元前: 内部では負の値（例: `-1000`）、リモートでは `world_bc1000.geojson`
- 西暦: 正の値（例: `1650`）、リモートでは `world_1650.geojson`

#### 1b. 同名ポリゴンのマージ (`merge-same-name-polygons.mjs`)

`NAME` 属性でフィーチャーをグループ化し、MultiPolygon に統合する。同時にラベル用の重心ポイントも生成する。

- **入力**: `.cache/geojson/world_{year}.geojson`
- **出力**:
  - `.cache/geojson/world_{year}_merged.geojson`（領土ポリゴン）
  - `.cache/geojson/world_{year}_merged_labels.geojson`（ラベルポイント）

ラベルポイントは各領土の最大ポリゴンに対して `turf.pointOnFeature()` で配置される。

#### 1c. PMTiles 変換 (tippecanoe + tile-join)

マージ済み GeoJSON を 2 パスで PMTiles に変換し、最後に統合する。

1. **territories 層** (`tippecanoe`): ポリゴン、z0〜z10、simplification=10
2. **labels 層** (`tippecanoe`): ポイント、z0〜z10、サイズ/フィーチャー制限なし
3. **統合** (`tile-join`): 2 つの層を 1 つの PMTiles ファイルにマージ

- **出力**: `public/pmtiles/world_{year}.pmtiles`

### ステップ 4: 年代インデックス生成

```bash
./scripts/generate-index.sh
```

`.cache/geojson/` をスキャンし、利用可能な年代と国名リストのインデックスを生成する。

- **前提**: `.cache/geojson/` に GeoJSON ファイルが存在すること
- **出力**: `public/pmtiles/index.json`

```json
{
  "years": [
    { "year": 1650, "filename": "world_1650.pmtiles", "countries": ["France", ...] }
  ]
}
```

### ステップ 5: デプロイ準備

```bash
node scripts/prepare-pmtiles.mjs
```

キャッシュバスティングのためファイル名にコンテンツハッシュを付与し、マニフェストを生成する。

- **入力**: `public/pmtiles/*.pmtiles`
- **出力**:
  - `dist/pmtiles/world_{year}.{hash}.pmtiles`（ハッシュ付きコピー）
  - `dist/pmtiles/manifest.json`（年度→ファイル名のマッピング）

```json
{
  "version": "2026-01-01T00:00:00.000Z",
  "files": {
    "1650": "world_1650.abc12345.pmtiles"
  }
}
```

### ステップ 6: R2 へアップロード

```bash
./scripts/upload-to-r2.sh
```

ハッシュ付き PMTiles とマニフェストを Cloudflare R2 にアップロードする。

- **前提**: 事前に `prepare-pmtiles.mjs` を実行すること。`CLOUDFLARE_API_TOKEN` 環境変数または `wrangler login` で認証が必要。
- **バケット**: `world-history-map-tiles`

## デプロイ手順（一括実行）

```bash
# 1. 全年度を変換（または特定の年度を指定）
./scripts/convert-to-pmtiles.sh all

# 2. 年代インデックスを生成
./scripts/generate-index.sh

# 3. コンテンツハッシュ付与とマニフェスト作成
node scripts/prepare-pmtiles.mjs

# 4. Cloudflare R2 へアップロード
./scripts/upload-to-r2.sh
```

## ディレクトリ構成

```
.cache/geojson/                       # ダウンロード・加工済み GeoJSON（gitignore 対象）
├── world_1650.geojson                # ダウンロードした生データ
├── world_1650_merged.geojson         # マージ済みポリゴン
└── world_1650_merged_labels.geojson  # ラベルポイント

public/pmtiles/                       # ローカル開発用ファイル
├── index.json                        # 年代インデックス
└── world_1650.pmtiles                # ハッシュなし PMTiles

dist/pmtiles/                         # デプロイ成果物（gitignore 対象）
├── manifest.json                     # ハッシュマッピング
└── world_1650.abc12345.pmtiles       # ハッシュ付き PMTiles
```

## フロントエンドでの利用

フロントエンドは MapLibre GL JS の `pmtiles://` プロトコルを通じて PMTiles を読み込む。

### 開発環境 vs 本番環境

| | 開発環境 | 本番環境 |
|---|---|---|
| **VITE_TILES_BASE_URL** | _（空文字列）_ | Worker URL |
| **URL パターン** | `pmtiles:///pmtiles/world_1650.pmtiles` | `pmtiles://https://worker.dev/world_1650.abc12345.pmtiles` |
| **マニフェスト** | 不使用（空） | R2 から取得 |

### 関連モジュール

- `src/utils/tiles-config.ts` — マニフェスト読み込みと URL 構築
- `src/utils/year-index.ts` — 年代インデックス読み込み、最近傍年検索
- `src/hooks/use-pmtiles-protocol.ts` — MapLibre に `pmtiles://` プロトコルを登録

### PMTiles のレイヤー構成

各 PMTiles ファイルには 2 つのベクタータイルレイヤーが含まれる。

| レイヤー | 型 | 用途 |
|---------|-----|------|
| `territories` | Polygon / MultiPolygon | 領土の塗りつぶしと境界線の描画 |
| `labels` | Point | 領土名ラベルの表示 |
