# Quickstart: 地図データパイプライン

新規開発者向けの環境セットアップとパイプライン実行ガイド。

## Prerequisites

### System Dependencies

```bash
# macOS (Homebrew)
brew install tippecanoe

# tippecanoe のバージョン確認
tippecanoe --version
tile-join --version
```

### Project Setup

```bash
# リポジトリのクローン
git clone https://github.com/akihiro-tj/world-history-map.git
cd world-history-map

# 依存関係のインストール
pnpm install
```

### R2 Upload (optional)

Cloudflare R2 へのアップロードが必要な場合のみ:

```bash
# wrangler にログイン
npx wrangler login
```

## Basic Usage

### Full Pipeline Run

```bash
# 全年度を処理（初回は全量、2回目以降は差分のみ）
pnpm pipeline run
```

### Single Year Update

```bash
# 1650年のみ処理
pnpm pipeline run --year 1650
```

### Local Development (no upload)

```bash
# アップロードなしでローカル処理のみ
pnpm pipeline run --skip-upload
```

### Check Pipeline Status

```bash
# 現在の状態を確認
pnpm pipeline status
```

## Common Workflows

### 1. Data Update (typical)

上流の historical-basemaps リポジトリが更新された後:

```bash
pnpm pipeline run
```

パイプラインが自動的に:
1. 上流から最新データを fetch
2. 変更されたファイルのみ検出 (SHA-256 ハッシュ比較)
3. 変更されたファイルのみ再処理
4. 差分のみ R2 にアップロード

### 2. Force Full Rebuild

すべてのキャッシュを無視して再構築:

```bash
pnpm pipeline run --restart
```

### 3. Validate Only

データのバリデーションのみ実行 (変換なし):

```bash
pnpm pipeline validate
```

### 4. Resume After Failure

パイプラインが途中で失敗した場合、同じコマンドを再実行するだけで失敗したステージから再開:

```bash
# 失敗した場合
pnpm pipeline run
# エラーを修正後、再実行すると失敗したステージから自動再開
pnpm pipeline run
```

## Troubleshooting

### "Pipeline is already running"

別のプロセスがパイプラインを実行中か、前回の実行がクリーンアップされなかった場合:

```bash
# ロックファイルを手動削除
rm -rf .cache/pipeline.lock
```

### "tippecanoe not found"

```bash
# macOS
brew install tippecanoe
```

### Stale Cache

チェックポイントデータが壊れた場合:

```bash
# パイプライン状態をリセット
rm .cache/pipeline-state.json
pnpm pipeline run
```

## Directory Structure

```
.cache/
├── geojson/                  # Downloaded + processed GeoJSON (gitignored)
│   ├── world_1650.geojson           # Raw source
│   ├── world_1650_merged.geojson    # Merged polygons
│   └── world_1650_merged_labels.geojson  # Label points
├── pipeline-state.json       # Checkpoint + hash state (gitignored)
└── pipeline.lock/            # Concurrency lock (gitignored)

public/pmtiles/               # Local dev tiles
├── index.json                # Year index
└── world_1650.pmtiles        # Unhashed PMTiles

dist/pmtiles/                 # Deploy artifacts (gitignored)
├── manifest.json             # Year -> hashed filename mapping
└── world_1650.a1b2c3d4.pmtiles  # Hashed PMTiles
```
