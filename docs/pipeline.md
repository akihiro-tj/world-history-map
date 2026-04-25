# pipeline: データパイプライン

> Last updated: 2026-04-25T10:31:49+09:00

## 役割

`aourednik/historical-basemaps` の年別 GeoJSON と Notion DB の領土説明を取り込み、frontend が描画する PMTiles と領土説明 JSON を生成する CLI。年単位のチェックポイントで差分だけ処理する。

## データの流れ

```
 historical-basemaps git repo            descriptions/{year}.json
        │ (fetch)                              │ (territory-sync)
        ▼                                      │
 .cache/historical-basemaps/geojson/world_{year}.geojson
        │ (merge: 同名領土を統合 + name_ja を焼き込み)
        ▼ ◄─────────────────────────────────────┘
 .cache/geojson/world_{year}_merged.geojson (+ _labels)
        │ (validate → convert → prepare)
        ▼
 frontend/public/pmtiles/world_{year}.pmtiles  (dev で読まれる)
 dist/pmtiles/world_{year}.{hash}.pmtiles      (R2 にアップロードされる)
```

`index-gen` ステージが全年処理後に `index.json`（年と領土名一覧）を書き出す。`upload` が `dist/pmtiles/` を R2 に同期し、`publish-manifest` が `manifest.json`（年 → ハッシュ付きファイル名のマップ）を更新する。

## コマンド早見表

すべて `pnpm pipeline <command>` 形式。

| やりたいこと | コマンド |
|---|---|
| タイルを最新化（fetch から upload まで一括） | `pnpm pipeline run` |
| 1 年だけ処理する | `pnpm pipeline run --year 1600` |
| 年範囲だけ処理する | `pnpm pipeline run --years 1600..1800` |
| ローカル動作確認のみ（R2 にアップロードしない） | `pnpm pipeline run --skip-upload` |
| アップロードだけやり直す | `pnpm pipeline upload` |
| `manifest.json` だけ R2 に投入する | `pnpm pipeline publish-manifest` |
| Notion から領土説明を同期する | `pnpm pipeline territory-sync` |
| 1 年分だけ Notion から同期する | `pnpm pipeline territory-sync --year 1600` |
| 説明 JSON のスキーマ・制約を検証する | `pnpm pipeline territory-validate` |
| 進行状況を表示する | `pnpm pipeline status` |
| 収録年のリストを表示する | `pnpm pipeline list` |

## `run` のオプション

| オプション | 用途 |
|---|---|
| `--year N` | 指定 1 年だけ処理する |
| `--years FROM..TO` | 範囲（例: `--years 1600..1800`）だけ処理する |
| `--restart` | 前回の完了状態を捨てて新規実行する |
| `--skip-upload` | R2 アップロードを省く |
| `--dry-run` | 処理対象の年を列挙するだけで実行しない |
| `--verbose` | 詳細ログを出す |

## `run` が走らせるステージ

`run` は上から順に各年について処理する（1 ステージずつ単独で呼ぶ CLI は提供していない）。

- **fetch** — `historical-basemaps` を git clone（初回）または pull。オフライン時はキャッシュで継続。
- **merge** — 同名領土を turf で統合し、`NAME` と `SUBJECTO` のみ残す。代表点（ラベル用 Point）を別に出す。同年の `descriptions/{year}.json` から日本語名を引いて、ラベル feature の `name_ja` プロパティに焼き込む。
- **validate** — turf でジオメトリを検証し、修復可能なものは clean / rewind / buffer_zero / unkink で直す。修復不能は warning、空コレクションや型違反は error で停止。
- **convert** — tippecanoe で polygons / labels の各レイヤーを別 MVT に焼き、tile-join で 1 つの PMTiles に結合。
- **prepare** — PMTiles を SHA-256 でハッシュ化し、`world_{year}.{shortHash}.pmtiles` として `dist/pmtiles/` に複製。R2 配信での cache busting のため。
- **index-gen** — 全年処理後、各年の領土名リストを `index.json` として書き出す。frontend の YearSelector の表示源。
- **upload** — `--skip-upload` が無ければ R2 に差分同期する。

`upload` と `publish-manifest` は `run` の一部であると同時に、独立したコマンドとしても呼べる（「アップロードが落ちた時」シナリオ参照）。

## 増分処理

状態は `.cache/pipeline-state.json` に保持され、年ごとの各ステージの完了時刻とハッシュを記録する。

- **入力ハッシュ** — `historical-basemaps` の年別 GeoJSON と同年の `descriptions/{year}.json` の合成（`hash(sourceFileHash + ":" + descriptionsHash)`）。`descriptions/{year}.json` が無い年は descriptionsHash を空文字列として扱う。どちらかが変わるとその年の merge 以下が無効化される。
- **ロック** — `.cache/pipeline.lock` を取得して並行実行を抑止。SIGINT/SIGTERM で解放。
- **完全リセット** — `.cache/pipeline-state.json` を削除すれば次回 `run` で全年が再ビルドされる。
- **完了済みからの仕切り直し** — `--restart` で前回の completed 状態を捨ててやり直す。

## 運用シナリオ

### Notion で領土説明を編集してデプロイしたい

1. Notion 側で編集する
2. `pnpm pipeline territory-sync` — `descriptions/{year}.json` を書き換え
3. `pnpm pipeline run` — descriptions が変わった年だけ自動で再ビルドされ R2 まで配信される

### `historical-basemaps` 側の更新を反映したい

1. `pnpm pipeline run` — `fetch` が pull で差分を取り、source hash が変わった年だけ再ビルドされる

### ローカルで地図を確認したい（R2 触りたくない）

1. `pnpm pipeline run --skip-upload` — `frontend/public/pmtiles/` まで生成して止まる
2. `pnpm dev` — Vite が `public/` から PMTiles を直接配信する

### 1 年だけ試行したい

1. `pnpm pipeline run --year 1600` — 対象年だけ全ステージを通す
2. 検証 OK なら `--year` を外して全年に広げる

### アップロードが落ちた時に再投入したい

タイル本体だけ再アップロード:

1. `pnpm pipeline upload`

`manifest.json` だけ更新（タイルは投入済み）:

1. `pnpm pipeline publish-manifest`

### 説明 JSON を手で編集した

1. `pnpm pipeline territory-validate` — `context` は 50〜200 文字、`name` は非空など制約をチェック
2. OK なら `pnpm pipeline run` — 該当年が合成ハッシュ経由で再ビルド対象になる

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
- `wrangler` — R2 へのオブジェクトアップロード
- `op` — Notion 認証情報を 1Password から取り出す

出力先:

- `apps/frontend/public/pmtiles/` — dev で直接読まれる PMTiles
- `apps/pipeline/dist/pmtiles/` — ハッシュ付き PMTiles と `manifest.json` の置き場（R2 にアップロードされる）
- `apps/frontend/public/data/descriptions/` — 領土説明 JSON
