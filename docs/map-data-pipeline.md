# 地図データパイプライン

歴史地図データの処理ワークフローを説明するドキュメント。GeoJSON の取得から PMTiles への変換、Cloudflare R2 への配信までの全工程を網羅する。

## 概要

```
historical-basemaps (GitHub)
        │
        ▼
┌──────────────────────────┐
│ 1. fetch                 │  git clone / pull
│ 2. merge                 │  NAME でグループ化 → MultiPolygon
│ 3. validate              │  GeoJSON 検証 + 自動修復
│ 4. convert               │  tippecanoe + tile-join
│ 5. prepare               │  SHA-256 ハッシュ付きファイル名
│ 6. index-gen             │  年代インデックス生成
│ 7. upload                │  差分 R2 アップロード
└────────────┬─────────────┘
             │
             ▼
      publish-manifest (手動)
             │
             ▼
      フロントエンド (MapLibre)
```

パイプラインは `pnpm pipeline run` で一括実行される。SHA-256 による変更検出で未変更の年度をスキップし、チェックポイント機能により中断した場合でも最後の成功ステージから再開できる。

## 前提条件

| ツール | 用途 | インストール |
|--------|------|-------------|
| tippecanoe | GeoJSON → PMTiles 変換 | `brew install tippecanoe` |
| Node.js 22.x | パイプライン実行 | pnpm 経由 |
| tsx | TypeScript 直接実行 | `pnpm install`（devDependency） |
| wrangler | Cloudflare R2 アップロード | `pnpm add -g wrangler` |

## データソース

- **リポジトリ**: [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0)
- **形式**: 年代ごとの GeoJSON FeatureCollection
- **ファイル名規則**: `world_1650.geojson`（西暦）、`world_bc1000.geojson`（紀元前）
- **プロパティ**: `NAME`, `SUBJECTO`, `PARTOF`, `BORDERPRECISION`

## CLI コマンド

```bash
# 全年度を処理
pnpm pipeline run

# 特定の年度のみ処理
pnpm pipeline run --year 1650

# 年度範囲を指定
pnpm pipeline run --years 1600..1800

# 状態をクリアして最初から実行
pnpm pipeline run --restart

# ドライラン（処理対象の年度を表示のみ）
pnpm pipeline run --dry-run

# アップロードをスキップ
pnpm pipeline run --skip-upload

# PMTiles のみ R2 にアップロード（manifest.json からファイル一覧を読み込み）
pnpm pipeline upload

# manifest.json を R2 に公開（プロダクション反映）
pnpm pipeline publish-manifest

# パイプラインの状態を確認
pnpm pipeline status

# 利用可能な年度を一覧
pnpm pipeline list
```

### 終了コード

| コード | 意味 |
|--------|------|
| 0 | 成功 |
| 1 | パイプラインエラー（バリデーション失敗等） |
| 2 | ロックエラー（別プロセスが実行中） |
| 3 | 設定エラー |

## パイプラインの各ステージ

### ステージ 1: fetch

historical-basemaps リポジトリを `.cache/historical-basemaps/` にクローンまたは更新する。

- 初回: `git clone --depth 1`
- 更新時: `git -C pull`
- オフライン: キャッシュが存在すれば警告付きで続行
- ファイル名パターンから利用可能な年度を自動検出

**実装**: `apps/pipeline/src/stages/fetch.ts`

### ステージ 2: merge

`NAME` 属性でフィーチャーをグループ化し、同名ポリゴンを MultiPolygon に統合する。各領土の最大ポリゴンに対して `turf.pointOnFeature()` で重心ラベルポイントを生成する。

- **入力**: `.cache/historical-basemaps/geojson/world_{year}.geojson`
- **出力**:
  - `.cache/geojson/world_{year}_merged.geojson`（領土ポリゴン）
  - `.cache/geojson/world_{year}_merged_labels.geojson`（ラベルポイント）

**実装**: `apps/pipeline/src/stages/merge.ts`

### ステージ 3: validate

マージ済み GeoJSON に対してバリデーションルールを適用する。エラーがあればパイプラインを停止し、修復可能な問題は自動修復を試みる。

**バリデーションルール**:

- FeatureCollection 構造チェック
- 空 features 拒否
- NAME プロパティ必須
- Polygon / MultiPolygon のみ許可
- OGC ジオメトリ妥当性チェック（`turf.booleanValid`）

**自動修復パイプライン**: `clean-coords` → `rewind` → `buffer(0)` → `unkink-polygon`

全年度のバリデーション完了後、サマリーレポート（エラー数・警告数・修復数）をログ出力する。

**実装**: `apps/pipeline/src/stages/validate.ts`, `apps/pipeline/src/validation/geojson.ts`

### ステージ 4: convert

マージ済み GeoJSON を 2 パスで PMTiles に変換し、`tile-join` で統合する。

1. **territories 層** (`tippecanoe`): ポリゴン、z0〜z10、simplification=10
2. **labels 層** (`tippecanoe`): ポイント、z0〜z10、サイズ/フィーチャー制限なし
3. **統合** (`tile-join`): 2 つの層を 1 つの PMTiles ファイルにマージ（GPL-3.0 attribution 保持）

- **出力**: `public/pmtiles/world_{year}.pmtiles`

**実装**: `apps/pipeline/src/stages/convert.ts`

### ステージ 5: prepare

キャッシュバスティングのためファイル名に SHA-256 コンテンツハッシュ（先頭 8 文字 hex）を付与し、デプロイ用ディレクトリにコピーする。

- **入力**: `public/pmtiles/world_{year}.pmtiles`
- **出力**: `dist/pmtiles/world_{year}.{hash8}.pmtiles`

デプロイメントマニフェストの `files`（年度→ファイル名マッピング）と `metadata`（ハッシュ・サイズ）を更新する。

**実装**: `apps/pipeline/src/stages/prepare.ts`

### ステージ 6: index-gen

処理済み年度をスキャンし、マージ済み GeoJSON から領土名を抽出して年代インデックスを生成する。

- **出力**: `public/pmtiles/index.json`

```json
{
  "years": [
    { "year": 1650, "filename": "world_1650.pmtiles", "countries": ["France", ...] }
  ]
}
```

**実装**: `apps/pipeline/src/stages/index-gen.ts`

### ステージ 7: upload

ローカルの SHA-256 ハッシュとデプロイメントマニフェストの `metadata` を比較し、変更されたファイルのみを `wrangler r2 object put --remote` で Cloudflare R2 にアップロードする。PMTiles ファイルのみをアップロードし、`manifest.json` はアップロードしない。

- **前提**: `CLOUDFLARE_API_TOKEN` 環境変数または `wrangler login` で認証が必要
- **バケット**: `world-history-map-tiles`
- **スキップ**: `--skip-upload` フラグで省略可能

> **Note**: PMTiles ファイルはハッシュ付きファイル名のため、アップロードしても既存のプロダクション環境には影響しない。プロダクションへの反映は `publish-manifest` コマンドで行う。

**実装**: `apps/pipeline/src/stages/upload.ts`

### publish-manifest

`dist/pmtiles/manifest.json` を R2 にアップロードし、プロダクション環境で参照する PMTiles ファイルを切り替える。`pnpm pipeline run` とは独立したコマンドとして提供される。

```bash
pnpm pipeline publish-manifest
```

**実装**: `apps/pipeline/src/stages/upload.ts` (`publishManifest`), `apps/pipeline/src/cli.ts`

## 変更検出とチェックポイント

### 変更検出

各年度のソースファイルの SHA-256 ハッシュを計算し、前回の実行時のハッシュと比較する。ハッシュが一致する年度は全ステージをスキップする。ソースが変更された場合、下流のステージ（merge → validate → convert → prepare）が自動的に無効化される。

### チェックポイント

パイプラインの状態は `.cache/pipeline-state.json` にアトミックに保存される（temp ファイル + rename）。各ステージの完了後に保存されるため、中断時は最後の成功ステージから再開できる。

```json
{
  "version": 1,
  "runId": "uuid",
  "status": "running",
  "startedAt": "2026-02-15T...",
  "years": {
    "1650": {
      "source": { "hash": "sha256...", "fetchedAt": "..." },
      "merge": { "hash": "sha256...", "completedAt": "...", "featureCount": 42, "labelCount": 42 },
      "validate": { "completedAt": "...", "warnings": 0, "errors": 0 },
      "convert": { "hash": "sha256...", "completedAt": "..." },
      "prepare": { "hash": "sha256...", "hashedFilename": "world_1650.abc12345.pmtiles", "completedAt": "..." }
    }
  }
}
```

### ロック

`mkdir` ベースのファイルロック（`.cache/pipeline.lock/`）で同時実行を防止する。ロックディレクトリ内に PID 情報を保持し、プロセスの生存確認（`process.kill(pid, 0)`）と 5 分間の mtime 経過によるstale 検出を行う。SIGINT/SIGTERM 時に自動的にロックを解放する。

## デプロイ手順

```bash
# 1. 全ステージを一括実行（PMTiles を R2 にアップロード）
pnpm pipeline run

# 2. R2 上のファイルを確認（Cloudflare ダッシュボード等）

# 3. 確認後、manifest.json を公開してプロダクションに反映
pnpm pipeline publish-manifest
```

`--skip-upload` でローカル確認してから後でアップロードする場合：

```bash
# 1. アップロードをスキップしてパイプラインを実行
pnpm pipeline run --skip-upload

# 2. ローカルの dist/pmtiles/ を確認

# 3. PMTiles ファイルを R2 にアップロード
pnpm pipeline upload

# 4. R2 上のファイルを確認

# 5. manifest.json を公開
pnpm pipeline publish-manifest
```

PMTiles ファイルはハッシュ付きファイル名で R2 に配置されるため、`manifest.json` を公開するまでプロダクション環境には影響しない。問題があった場合は `publish-manifest` を実行せずにロールバックできる。

```bash
# アップロードのみスキップしてローカル確認
pnpm pipeline run --skip-upload

# 状態をリセットして全件再処理
pnpm pipeline run --restart
```

## ディレクトリ構成

```
apps/pipeline/                       # パイプラインパッケージ
├── .cache/                              # gitignore 対象
│   ├── historical-basemaps/             # git clone したソースリポジトリ
│   │   └── geojson/world_1650.geojson   # 元データ
│   ├── geojson/                         # 加工済み GeoJSON
│   │   ├── world_1650_merged.geojson    # マージ済みポリゴン
│   │   └── world_1650_merged_labels.geojson # ラベルポイント
│   ├── pipeline-state.json              # チェックポイント状態
│   └── pipeline.lock/                   # 実行ロック
├── dist/pmtiles/                        # デプロイ成果物（gitignore 対象）
│   ├── manifest.json                    # ハッシュマッピング + metadata
│   └── world_1650.abc12345.pmtiles      # ハッシュ付き PMTiles
└── src/                                 # パイプライン実装
    ├── cli.ts                           # CLI エントリポイント
    ├── config.ts                        # パス定数、年エンコーディング
    ├── exec.ts                          # execFile ラッパー
    ├── pipeline.ts                      # オーケストレータ
    ├── stages/                          # 各ステージ実装
    │   ├── fetch.ts
    │   ├── merge.ts
    │   ├── validate.ts
    │   ├── convert.ts
    │   ├── prepare.ts
    │   ├── index-gen.ts
    │   └── upload.ts
    ├── state/                           # 状態管理
    │   ├── checkpoint.ts
    │   ├── hash.ts
    │   └── lock.ts
    └── validation/                      # バリデーション
        ├── geojson.ts
        └── report.ts

apps/app/public/pmtiles/             # ローカル開発用ファイル
├── index.json                           # 年代インデックス
└── world_1650.pmtiles                   # ハッシュなし PMTiles
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

- `apps/app/src/utils/tiles-config.ts` — マニフェスト読み込みと URL 構築
- `apps/app/src/utils/year-index.ts` — 年代インデックス読み込み、最近傍年検索
- `apps/app/src/components/map/hooks/use-pmtiles-protocol.ts` — MapLibre に `pmtiles://` プロトコルを登録

### PMTiles のレイヤー構成

各 PMTiles ファイルには 2 つのベクタータイルレイヤーが含まれる。

| レイヤー | 型 | 用途 |
|---------|-----|------|
| `territories` | Polygon / MultiPolygon | 領土の塗りつぶしと境界線の描画 |
| `labels` | Point | 領土名ラベルの表示 |
