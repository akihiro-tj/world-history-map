# pipeline: データパイプライン

> Last updated: 2026-04-17T21:51:29+09:00

## 役割

`aourednik/historical-basemaps` の年別 GeoJSON と Notion DB の領土説明を取り込み、
frontend が描画する PMTiles と領土説明 JSON に変換する CLI アプリ。
年単位のチェックポイントで差分だけ処理するインクリメンタル設計。最終成果物は R2 または `public/data/` に置かれる。

## データの流れ

タイル系統:

```
 historical-basemaps git repo
        │ (fetch: git clone/pull)
        ▼
 .cache/historical-basemaps/geojson/world_{year}.geojson
        │ (merge: 同名領土を turf で統合)
        ▼
 .cache/geojson/world_{year}_merged.geojson (+ _labels)
        │ (validate: turf で幾何チェック・修復)
        ▼ (convert: tippecanoe + tile-join)
 public/pmtiles/world_{year}.pmtiles
        │ (prepare: SHA-256 付きファイル名で複製)
        ▼
 dist/pmtiles/world_{year}.{hash}.pmtiles ──> R2 (upload)
                                     └─────> manifest.json (publish)
```

領土説明系統:

```
 Notion data source (territory_descriptions)
        │ (territory-sync: Notion SDK で全件 fetch → 年ごとに groupBy)
        ▼
 frontend/public/data/descriptions/{year}.json
        │ (territory-validate: スキーマ・長さ制約チェック)
```

さらに全年処理後、`index-gen` ステージが `public/pmtiles/index.json`（`YearIndex`）を書き出す。

## ステージの責務

`fetch` — `historical-basemaps` を git clone（初回）または pull。オフライン時はキャッシュで継続。commit hash をチェックポイントに記録。

`merge` — GeoJSON を読み、`NAME` プロパティでグルーピングして turf.union で多角形を統合。`NAME` と `SUBJECTO` 以外のプロパティは落とす。同時に代表点（ラベル用 Point）を別コレクションとして書き出す。

`validate` — マージ済み GeoJSON を turf でチェックし、破損ジオメトリは clean/rewind/buffer_zero/unkink で修復を試みる。修復不能なものは warning、空コレクションや型違反は error。error があれば pipeline を止める。

`convert` — マージ済み GeoJSON を tippecanoe で PMTiles に変換。領土（polygons）とラベル（points）を別タイルに焼いてから tile-join で単一 PMTiles に結合。出力は `public/pmtiles/world_{year}.pmtiles`。

`prepare` — PMTiles を SHA-256 でハッシュ化し、`world_{year}.{shortHash}.pmtiles` として `dist/pmtiles/` に複製。ファイル名に hash を混ぜることで R2 配信時の cache busting を成立させる。

`index-gen` — 各年のマージ済み GeoJSON から `NAME` を拾い、年ごとの領土名リストを `index.json`（`YearIndex`）として生成。frontend の YearSelector の表示源。

`upload` — `manifest.json` から年 → ハッシュ付きファイル名のマッピングを構築し、`wrangler r2 object put` でアップロード。既存 manifest と hash が一致するものはスキップ。

`territory-sync` — Notion data source を全件クエリ（`--year` 指定で 1 年分のみも可能）し、1Password 経由で token を取得。ページを `TerritoryDescription` に変換して年ごとに groupBy し、`descriptions/{year}.json` に書き出して個別検証する。

`territory-validate` — 既存の `descriptions/*.json` をスキーマと制約（`context` は 50〜200 文字など）に照らして検証する。

## 増分処理

状態は `.cache/pipeline-state.json`（`PipelineState`）に保持され、年ごとに `source / merge / validate / convert / prepare / upload` 各ステージの完了時刻とハッシュを記録する。

`YearProcessor.runStage` は各ステージ実行前に `checkpoint.shouldProcess(year, stage, sourceHash)` を問い合わせ、既に記録されたハッシュと現在の sourceHash が一致し、かつ当該ステージが記録済みなら skip する。sourceHash が変わっていれば `invalidateDownstream` で下流ステージを消し、強制再実行に倒す。

チェックポイントは起動時に `loadOrCreate` — `status` が `running` のまま残っていれば再開、`completed`/`failed` なら新規作成。

- 強制的に全年を再ビルド: `.cache/pipeline-state.json` を削除
- 前回の完了状態を捨てて仕切り直し: `--restart` を付ける
- 全年ではなく一部だけ回す: `--year 1600` / `--years 1600..1800`
- アップロードを省いてローカル確認のみ: `--skip-upload`

並行実行抑止のため `.cache/pipeline.lock` を取り、SIGINT/SIGTERM で解放する。

## 外部依存

データソース:
- `aourednik/historical-basemaps` — GPL-3.0 の公開リポジトリ。年別 GeoJSON の一次情報
- Notion data source — 領土説明の編集母体。data source ID と token は 1Password (`op read`) から取得

外部ツール:
- `git` — `historical-basemaps` の clone/pull
- `tippecanoe`（別途インストール） — GeoJSON → MVT → PMTiles
- `wrangler` — R2 へのオブジェクトアップロード（`wrangler r2 object put`）
- `op` — Notion 認証情報の 1Password からの取り出し

出力先:
- `apps/frontend/public/pmtiles/` — dev で直接読まれる PMTiles
- `apps/pipeline/dist/pmtiles/` — ハッシュ付き PMTiles と `manifest.json` の一時置き場（R2 にアップロードされる）
- `apps/frontend/public/data/descriptions/` — 領土説明 JSON

## 運用シナリオ

タイルを最新化する: `pipeline run` を引数なしで実行する。`fetch` が upstream を更新し、`YearProcessor` が各年についてステージを回す。source hash が変わった年だけ `merge → validate → convert → prepare` が再実行され、出力 PMTiles が `dist/pmtiles/` に新ハッシュ名で出る。`upload` が差分だけ R2 に投げ、`manifest.json` を書き戻す。

特定年だけ更新を試す: `pipeline run --year 1600`。対象年以外は触らない。差分検知は働いたまま。

領土説明を Notion から同期する: `pipeline territory-sync`。Notion 全ページを取って年ごとに `descriptions/{year}.json` を丸ごと書き換える。書き換えごとに `territory-validate` が走り、スキーマ違反があれば失敗する。単一年だけ同期したい場合は `--year` を付ける。

説明 JSON を手修正したあと整合性だけ確かめる: `pipeline territory-validate`。すべての `descriptions/*.json` を読んで検証し、失敗した年だけ列挙する。

manifest をアップロードし直す: PMTiles 本体のアップロードは済んでいるが `manifest.json` だけ R2 に反映したい場合、`pipeline publish-manifest` を使う。
