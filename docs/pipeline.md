# pipeline: データパイプライン

> Last updated: 2026-04-26T00:00:00+09:00

## 役割

`aourednik/historical-basemaps` の年別 GeoJSON と Notion DB の領土説明を取り込み、frontend が描画する PMTiles と領土説明 JSON を生成する CLI。年単位のチェックポイントで差分だけ処理する。

タイルのハッシュ計算・R2 アップロード・manifest 管理は `packages/tiles` と `tiles-deploy.yml` CI が担う（pipeline はタイル生成のみ）。

## データの流れ

```
 historical-basemaps git repo            descriptions/{year}.json
        │ (fetch)                              │ (territory-sync)
        ▼                                      │
 .cache/historical-basemaps/geojson/world_{year}.geojson
        │ (merge: 同名領土を統合 + name_ja を焼き込み)
        ▼ ◄─────────────────────────────────────┘
 .cache/geojson/world_{year}_merged.geojson (+ _labels)
        │ (validate → convert)
        ▼
 packages/tiles/src/pmtiles/world_{year}.pmtiles
        │  (git commit → pnpm build → git commit manifest.ts → PR → CI)
        ▼
 R2 bucket (world-history-map-tiles-prod / dev)
```

`index-gen` ステージが全年処理後に `apps/frontend/public/pmtiles/index.json`（年と領土名一覧）を書き出す。

## コマンド早見表

すべて `pnpm pipeline <command>` 形式。

| やりたいこと | コマンド |
|---|---|
| タイルを最新化（convert まで一括） | `pnpm pipeline run` |
| 1 年だけ処理する | `pnpm pipeline run --year 1600` |
| 年範囲だけ処理する | `pnpm pipeline run --years 1600..1800` |
| Notion から領土説明を同期する | `pnpm pipeline territory-sync` |
| 1 年分だけ Notion から同期する | `pnpm pipeline territory-sync --year 1600` |
| 説明 JSON のスキーマ・制約を検証する | `pnpm pipeline territory-validate` |
| 進行状況を表示する | `pnpm pipeline status` |
| 収録年のリストを表示する | `pnpm pipeline list` |

タイル更新後は以下の手順で R2 に反映する：

```bash
# 1. ハッシュ計算 + manifest.ts 更新
pnpm --filter @world-history-map/tiles run build

# 2. コミットして PR を作成
git add packages/tiles/src/
git commit -m "data: update tiles"
git push

# → CI (tiles-deploy.yml) が R2 に差分 upload → Pages deploy
```

## `run` のオプション

| オプション | 用途 |
|---|---|
| `--year N` | 指定 1 年だけ処理する |
| `--years FROM..TO` | 範囲（例: `--years 1600..1800`）だけ処理する |
| `--restart` | 前回の完了状態を捨てて新規実行する |
| `--dry-run` | 処理対象の年を列挙するだけで実行しない |
| `--verbose` | 詳細ログを出す |

## `run` が走らせるステージ

- **fetch** — `historical-basemaps` を git clone（初回）または pull。
- **merge** — 同名領土を turf で統合し、`NAME` と `SUBJECTO` のみ残す。代表点（ラベル用 Point）を別に出す。同年の `descriptions/{year}.json` から日本語名を引いて、ラベル feature の `name_ja` プロパティに焼き込む。
- **validate** — turf でジオメトリを検証し、修復可能なものは clean / rewind / buffer_zero / unkink で直す。修復不能は warning、空コレクションや型違反は error で停止。
- **convert** — tippecanoe で polygons / labels の各レイヤーを別 MVT に焼き、tile-join で 1 つの PMTiles に結合。出力先: `packages/tiles/src/pmtiles/world_{year}.pmtiles`
- **index-gen** — 全年処理後、各年の領土名リストを `apps/frontend/public/pmtiles/index.json` として書き出す。

## 増分処理

状態は `.cache/pipeline-state.json` に保持され、年ごとの各ステージの完了時刻とハッシュを記録する。

- **入力ハッシュ** — `historical-basemaps` の年別 GeoJSON と同年の `descriptions/{year}.json` の合成。どちらかが変わるとその年の merge 以下が無効化される。
- **ロック** — `.cache/pipeline.lock` を取得して並行実行を抑止。SIGINT/SIGTERM で解放。
- **完全リセット** — `.cache/pipeline-state.json` を削除すれば次回 `run` で全年が再ビルドされる。

## 運用シナリオ

### タイルを更新してデプロイしたい

1. `pnpm pipeline run` — convert まで走り `packages/tiles/src/pmtiles/` に新バイナリを出す
2. `pnpm --filter @world-history-map/tiles run build` — hash 計算 + manifest.ts 更新
3. `git add packages/tiles/src/ && git commit && git push` — PR → CI → R2 upload → Pages deploy

### Notion で領土説明を編集してデプロイしたい

1. Notion 側で編集する
2. `pnpm pipeline territory-sync` — `descriptions/{year}.json` を書き換え
3. git commit → push → Pages が description 更新を自動で拾う（タイル再ビルド不要）

### `historical-basemaps` 側の更新を反映したい

1. `pnpm pipeline run` — `fetch` が pull で差分を取り、source hash が変わった年だけ再ビルドされる
2. 上記「タイルを更新してデプロイしたい」の 2〜3 を続ける

### 1 年だけ試行したい

1. `pnpm pipeline run --year 1600` — 対象年だけ全ステージを通す
2. 検証 OK なら `--year` を外して全年に広げる

### 説明 JSON を手で編集した

1. `pnpm pipeline territory-validate` — `context` は 50〜200 文字、`name` は非空など制約をチェック
2. OK なら git commit → push

### checkpoint が壊れた・状態を吹き飛ばしたい

1. `rm apps/pipeline/.cache/pipeline-state.json`
2. `pnpm pipeline run` — 全年がゼロから再ビルドされる

## 外部依存

データソース:

- `aourednik/historical-basemaps` — 年別 GeoJSON の一次情報（GPL-3.0）
- Notion data source — 領土説明の編集母体。data source ID と token は 1Password (`op read`) から取得

外部ツール（PATH 上に必要）:

- `git` — `historical-basemaps` の clone/pull
- `tippecanoe` — GeoJSON → MVT → PMTiles
- `op` — Notion 認証情報を 1Password から取り出す

出力先:

- `packages/tiles/src/pmtiles/` — pipeline が生成する raw PMTiles（git 管理）
- `apps/frontend/public/pmtiles/index.json` — 年と領土名一覧（git 管理）
- `apps/frontend/public/data/descriptions/` — 領土説明 JSON（git 管理）
