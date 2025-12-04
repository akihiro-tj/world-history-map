# デプロイ・運用ガイド

**機能**: インタラクティブ世界史地図
**最終更新**: 2025-12-04

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────────┐
│                           本番環境                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌──────────────────┐     ┌─────────────┐ │
│  │  Cloudflare      │     │  Cloudflare      │     │ Cloudflare  │ │
│  │  Pages           │────►│  Workers         │────►│ R2          │ │
│  │                  │     │  (PMTiles Server)│     │ (Storage)   │ │
│  │  - React App     │     │  - Range Request │     │ - PMTiles   │ │
│  │  - Static Assets │     │  - CORS Control  │     │ - manifest  │ │
│  └──────────────────┘     └──────────────────┘     └─────────────┘ │
│         │                         │                                  │
│         │    VITE_TILES_BASE_URL  │   ALLOWED_ORIGINS               │
│         └─────────────────────────┘   = pages.dev ドメインのみ許可  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                           開発環境                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌──────────────────┐                      │
│  │  Vite Dev Server │────►│  /public/pmtiles │                      │
│  │  localhost:5173  │     │  (ローカルファイル)│                      │
│  └──────────────────┘     └──────────────────┘                      │
│                                                                      │
│  VITE_TILES_BASE_URL = (未設定) → ローカルファイルを使用            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## ディレクトリ構造

```
worker/                          # Cloudflare Worker (PMTiles Server)
├── src/
│   └── index.ts                 # Worker エントリーポイント
├── package.json
├── tsconfig.json
└── wrangler.toml                # Cloudflare 設定

scripts/
├── prepare-pmtiles.mjs          # ハッシュ付き PMTiles 生成
└── upload-to-r2.sh              # R2 バケットへのアップロード

public/pmtiles/                  # ローカル PMTiles（開発用）
└── world_*.pmtiles

dist/pmtiles/                    # ハッシュ付き PMTiles（アップロード用）
├── manifest.json
└── world_*.{hash}.pmtiles
```

## 設定ファイル

### Worker 設定 (`worker/wrangler.toml`)

```toml
name = "world-history-map-tiles"
main = "src/index.ts"
compatibility_date = "2024-12-01"
minify = true

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "world-history-map-tiles"

[vars]
ALLOWED_ORIGINS = "https://world-history-map.pages.dev"
```

**キャッシュ戦略:**
- `manifest.json`: `public, max-age=300`（5分、更新を反映させるため短め）
- `*.pmtiles`: `public, max-age=31536000, immutable`（1年、ハッシュベースのため永久キャッシュ可能）

### 環境変数

| 変数名 | 環境 | 値 |
|--------|------|-----|
| `VITE_TILES_BASE_URL` | 本番 (Pages) | Worker URL（Cloudflare Dashboard で確認） |
| `VITE_TILES_BASE_URL` | 開発 | (未設定 - ローカルファイルを使用) |

## 運用手順

### PMTiles 更新フロー

PMTiles データを更新する場合：

```bash
# 1. ハッシュ付きファイルを生成
node scripts/prepare-pmtiles.mjs

# 2. R2 にアップロード
./scripts/upload-to-r2.sh
```

**処理内容:**
1. `prepare-pmtiles.mjs` が各ファイルの MD5 ハッシュを計算
2. ハッシュ付きファイル名でコピー（例: `world_1600.a1b2c3d4.pmtiles`）
3. 年 → ハッシュ付きファイル名のマッピングを `manifest.json` に出力
4. `upload-to-r2.sh` が `--remote` フラグ付きで R2 にアップロード

**キャッシュ無効化:**
- 古いファイルは R2 に残る（ロールバック用）
- 新しい `manifest.json` が新しいハッシュ付きファイルを参照
- URL が変わるためブラウザキャッシュは自動的に無効化

### Worker デプロイ

```bash
cd worker
pnpm install
pnpm run deploy
```

### ロールバック

PMTiles を以前のバージョンに戻す場合：

1. 以前の `manifest.json` を用意（git 履歴やバックアップから）
2. 古い manifest をアップロード：
   ```bash
   wrangler r2 object put world-history-map-tiles/manifest.json \
     --file path/to/old/manifest.json \
     --content-type "application/json" \
     --remote
   ```

### モニタリング

**R2 使用状況:**
- ダッシュボード: Cloudflare Dashboard → R2 → world-history-map-tiles
- ストレージ: 約 530MB（54 PMTiles ファイル）
- 無料枠: 10GB ストレージ、1000万読み取り/月

**Worker メトリクス:**
- ダッシュボード: Cloudflare Dashboard → Workers & Pages → world-history-map-tiles
- 確認項目: リクエスト数、CPU 時間、エラー

## セキュリティ

### CORS 設定

Worker は本番 Pages ドメインからのリクエストのみ許可：

```toml
# worker/wrangler.toml
ALLOWED_ORIGINS = "https://world-history-map.pages.dev"
```

**この設定の意義:**
- 他のウェブサイトからのタイルサーバー利用を防止
- 開発環境はローカルファイルを使用するため、`localhost` は許可リストに不要
- 本番タイルをローカルでテストする必要がある場合は一時的に localhost を追加

### 複数オリジンの許可

ステージング環境など、複数のオリジンを許可する場合：

```toml
# wrangler.toml
ALLOWED_ORIGINS = "https://world-history-map.pages.dev,https://staging.world-history-map.pages.dev"
```

## トラブルシューティング

### よくある問題

**1. 本番環境でタイルが読み込まれない**
- 確認: Pages の環境変数に `VITE_TILES_BASE_URL` が設定されているか
- 確認: Worker がデプロイされて稼働しているか
- 確認: `ALLOWED_ORIGINS` に Pages ドメインが含まれているか

**2. アップロードが "Resource location: local" で失敗する**
- wrangler コマンドに `--remote` フラグを追加
- `upload-to-r2.sh` では修正済み

**3. アップロード時に 502 Bad Gateway**
- wrangler を最新版に更新: `pnpm add -g wrangler@latest`
- 再認証: `wrangler login`

**4. ブラウザコンソールに CORS エラー**
- リクエスト元が `wrangler.toml` の `ALLOWED_ORIGINS` と一致しているか確認
- オリジン変更後は Worker を再デプロイ

### 便利なコマンド

```bash
# R2 バケットの内容一覧
wrangler r2 object list world-history-map-tiles --remote

# 特定のオブジェクトを削除
wrangler r2 object delete world-history-map-tiles/filename.pmtiles --remote

# Worker ログを確認
wrangler tail world-history-map-tiles

# Worker ローカル開発
cd worker && pnpm run dev
```

## コスト見積もり

| サービス | 無料枠 | 想定使用量 | コスト |
|----------|--------|------------|--------|
| R2 ストレージ | 10 GB/月 | 約 530 MB | $0 |
| R2 Class B (読み取り) | 1000万/月 | 10万〜100万 | $0 |
| Workers リクエスト | 10万/日 | 1万〜5万 | $0 |
| Pages | 無制限 | - | $0 |

**備考:** R2 はエグレス料金が無料。無料枠を超えた場合のみ課金。
