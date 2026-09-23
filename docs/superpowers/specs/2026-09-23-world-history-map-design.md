# 世界史地図 設計書（MVP）

- 作成日: 2026-09-23
- 状態: レビュー待ち

## 1. 目的と利用者

受験生・学習者が、世界史に出てくる地名の位置を地図上で確かめられる Web アプリ。一般に公開するので、モバイル対応は MVP に含める。SEO は最低限の設定にとどめる（§6）。

成功の基準:

- 都市名の一部を入力すると候補が出て、選ぶと地図がその都市に移動する
- 地図上の点を選ぶと、その都市の名前が表示される
- PC とスマートフォンの実ブラウザで、パン・ズーム・検索・選択が問題なく動く

## 2. スコープ

### MVP に含めるもの

- 地物の種別は「都市」のみ
- 次の 10 都市。名前は主名称 1 つだけを持つ

| id | 表示名 | 備考 |
|---|---|---|
| samarkand | サマルカンド | |
| bukhara | ブハラ | |
| dunhuang | 敦煌 | |
| kucha | クチャ（亀茲） | 表示名に漢字名を括弧で含める |
| karakorum | カラコルム（和林） | 同上 |
| dadu | 大都 | 元の首都（現在の北京） |
| emil | エミール | オゴデイの根拠地（葉密立） |
| almaliq | アルマリク | |
| sarai | サライ | 旧サライ（バトゥが建設、Sarai Batu） |
| tabriz | タブリーズ | イル＝ハン国の首都 |

- ベースマップは陸地と海岸線のみ
- 検索（候補を表示する）、地物の選択、パン・ズーム

### MVP に含めないもの

- 別名・現在の地名・時代ごとの名称。同じ場所で名前が被る問題は、実際に起きた時点で検討する
- 国境、河川、湖、地名ラベルなどの背景レイヤー
- 時代フィルタ、都市以外の種別
- E2E テスト（UI 操作は実ブラウザで確認する）
- 独自ドメイン（まず workers.dev で公開する）
- §7 の「UI 文言一覧」に載っていない文言。メタディスクリプション、OGP、favicon、robots.txt も作らない

## 3. 画面と操作

画面は 1 つだけ。全画面の地図の上に、検索窓と選択パネルを重ねる。レイアウトと配色は DESIGN.md で決め、HTML モックを Artifact で公開してレビューしてもらう。

- **初期表示**: 10 都市がすべて収まる範囲（中央アジア〜東アジア）を表示する。都市は点だけで、ラベルは出さない
- **地図の操作**: MapLibre 標準のドラッグ・ホイール・ピンチ・ダブルクリック（ダブルタップ）でパン・ズームする。ズームボタンは表示しない（デザインレビューで不要と判断）。地図の回転と傾きは無効にする。帰属表示は出さない（`attributionControl: false`。Natural Earth はパブリックドメインで、帰属表示は不要）
- **地物の選択**: 点をクリック（タップ）すると選択状態になり、点の見た目が変わり、選択パネルに名前を表示する。スマートフォンでも押しやすいように、クリック判定は見た目より広めに取る。地図の何もない所をクリックするか、パネルを閉じると選択が解除される
- **検索**
  - 1 文字入力するたびに候補を最大 10 件表示する
  - 前方一致を先に、部分一致を後に並べる
  - 比較の前に入力と名前・読みの両方を正規化する（NFKC、ひらがな→カタカナ、空白の除去）
  - 例: 「さま」→ サマルカンド、「亀」→ クチャ（亀茲）
  - 候補は ↑↓ キーで移動し、Enter で決定、Esc で閉じる。WAI-ARIA の combobox パターンに従う
  - 決定すると、その都市へ flyTo して選択状態にする
  - 該当がなければ、その旨を表示する（文言は §7）
- **エラー**: タイルや都市データの読み込みに失敗したら、地図の上にメッセージを出す（文言は §7）。ベースマップの読み込みに失敗しても、都市データが読めていれば検索と選択は動く

## 4. データ

### 都市データ

`public/data/cities.json` に置き、実行時に fetch する。JS にはバンドルしない。これにより、データを更新しても JS のキャッシュが無効にならず、件数が増えても初期表示の JS が大きくならない。配信はタイルと同じ仕組み（§5 アセットの解決）で、ハッシュ付きの URL を immutable で返す。

クライアントは JSON を読み込んだあと GeoJSON に変換して地図に渡し、同じ配列を検索にも使う。

```ts
type City = {
  id: string;        // 英小文字の slug。一意
  name: string;      // 表示名
  reading: string;   // ひらがな（長音符を含む）の読み（検索用）。複数あれば半角空白で区切る（例: "くちゃ きじ"）
  type: "city";
  lon: number;       // WGS84 経度
  lat: number;       // WGS84 緯度
  source: string;    // 座標の出典（URL など）
};
```

型は `src/data/city.ts` に置き、JSON を読み込む箇所で実行時にも検証する。

データの作成方針（CLAUDE.md にも書く）:

- 正確性を網羅性より優先する。不確かなものは載せない
- 座標は遺跡や歴史的中心地を指す。現在の同名都市の中心とずれる場合は遺跡を優先する（例: カラコルム = ハルホリン近郊の遺跡、サライ = セリトレンノエ付近）
- 出典は 1 件以上付ける（Wikipedia の座標表記、学術資料など）。精度は小数 2〜4 桁でよい
- unit test で `public/data/cities.json` を検証する: スキーマに合っているか、id が重複していないか、経度 −180〜180・緯度 −90〜90 に収まるか、`reading` がひらがな・長音符（ー）・半角空白だけか、名前が空でないか

### ベースマップ

- 出典: Natural Earth v5.1.2 の `ne_{110m,50m,10m}_{land,coastline}.geojson`（パブリックドメイン）
  - GitHub `nvkelso/natural-earth-vector` のタグ `v5.1.2` から取得する（naciscdn は環境によってアクセスできないため）
  - スクリプトに sha256 を書いておき、取得したファイルを検証する
- 変換手順（`scripts/build-tiles.sh`、nix devShell で実行する）

  | 縮尺 | ズーム |
  |---|---|
  | 110m | z0–1 |
  | 50m | z2–3 |
  | 10m | z4–6 |

  - 縮尺ごとに tippecanoe で `land`（ポリゴン）と `coastline`（ライン）の 2 レイヤーを作る
  - `tile-join` で `public/tiles/world.pmtiles` に結合する
  - `scripts/verify-tiles.ts`（pmtiles の JS ライブラリでヘッダーを読む）でズーム範囲・レイヤー・サイズを検証する
  - z7 以上は MapLibre のオーバーズームで表示する
- 生成した `world.pmtiles` はハッシュなしのファイル名でコミットする。目標は 15 MB 未満。超えた場合は最大ズームを 5 に下げる

## 5. アーキテクチャ

```
ブラウザ ──▶ Cloudflare Worker（単一）
             ├─ 静的アセット（dist/: HTML・JS・CSS・asset-manifest.json）
             └─ /tiles/*, /data/* ─▶ src/worker ─▶ R2 バケット whm-assets（Range 対応）
```

### R2 から直接配信しない理由

R2 から直接配信すること自体は可能で、PMTiles の公式ドキュメントも R2 を推奨している。ただし、

- r2.dev のサブドメインはレート制限があり、Cloudflare は開発用途に限るとしている。キャッシュも効かない
- 本番で使うには R2 にカスタムドメインを割り当てる必要があり、そのドメインが同じ Cloudflare アカウントのゾーンになっていなければならない

MVP は workers.dev で公開するので、Worker で中継する。Worker 経由にすると同一オリジンになるので CORS の設定が要らず、PR プレビューでも同じ仕組みで動く。独自ドメインを導入したときに、直接配信に切り替えるかをあらためて検討する。

### フロントエンド（`src/`）

| モジュール | 責務 |
|---|---|
| `app/` | ルートのコンポーネントとレイアウト。都市データの読み込みと、選択中の都市 id を状態として持つ。`theme.css` は DESIGN.md から生成する（§9） |
| `map/MapView.tsx` | MapLibre の初期化、pmtiles プロトコルの登録、都市レイヤー、クリックの処理、flyTo |
| `map/style.ts` | スタイル定義。海の背景、`land` の塗り、`coastline` の線、都市の circle。glyphs とシンボルレイヤーは持たない。色は `theme.css` の CSS 変数を `getComputedStyle` で読んで使う |
| `search/match.ts` | 正規化と候補の抽出（純関数） |
| `search/SearchBox.tsx` | combobox の UI |
| `data/city.ts` | `City` 型と、JSON の実行時検証 |
| `assets/manifest.ts` | `/asset-manifest.json` を取得し、論理名から URL を返す |

- 都市は GeoJSON ソースの circle レイヤーで描く。選択状態は `feature-state` で持つ。名前は DOM のパネルに出すので、MapLibre のラベルや CJK グリフは使わない
- 選択の状態は App が一元管理する。地図のクリックと検索の決定は、どちらも App の選択中の都市 id を更新する。検索で決定したときだけ flyTo もする

### アセットの解決

- 対象は `public/tiles/world.pmtiles` と `public/data/cities.json`。原本はハッシュなしでコミットする
- デプロイ時に `scripts/publish-assets.ts` が次を行う
  - 対象ファイルの sha256 の先頭 12 桁でキー（例: `tiles/world.<hash>.pmtiles`、`data/cities.<hash>.json`）を決める
  - `wrangler r2 object put` で R2 にアップロードする。Content-Type（`application/vnd.pmtiles` / `application/json`）と Cache-Control（`public, max-age=31536000, immutable`）もここで付ける
  - `dist/asset-manifest.json` を出力する。例: `{"tiles/world.pmtiles": "/tiles/world.<hash>.pmtiles", "data/cities.json": "/data/cities.<hash>.json"}`
- アプリは起動時に manifest を取得し、都市データを fetch する。pmtiles のソース URL は `pmtiles://` + 同じオリジンの絶対 URL として組み立てる
- manifest は `public/_headers` で `Cache-Control: no-cache` にする
- `public/.assetsignore` で `tiles/` と `data/` を静的アセットのアップロード対象から外す
- 開発時は Vite プラグイン（`vite/plugins/assetManifestDev.ts`）がローカルパスを指す manifest を返す。`public/` は Vite がそのまま配信するので、R2 なしで動く。Range にも対応している

### Worker（`src/worker/`）

- `/tiles/*` と `/data/*` の GET と HEAD だけを受け持つ（`assets.run_worker_first: ["/tiles/*", "/data/*"]`）。それ以外はすべて静的アセットが返す
- `env.ASSETS_BUCKET.get(key, { range: request.headers, onlyIf: request.headers })` で取得する
- 処理は `serve.ts` にまとめ、Range の範囲計算は純関数 `resolveRange` に切り出す

  | 状況 | 応答 |
  |---|---|
  | Range 指定あり | 206、`Content-Range: bytes s-e/size` |
  | Range 指定なし | 200 |
  | 条件付きリクエストで変更なし | 304 |
  | 条件付きリクエストで条件不一致 | 412 |
  | 範囲外 | 416、`Content-Range: bytes */size` |
  | キーが存在しない | 404 |

- すべての応答に `Accept-Ranges: bytes` と強い ETag（`httpEtag`）を付ける。Content-Type と Cache-Control は、アップロード時に保存したものを `writeHttpMetadata` で付ける
- `serve.ts` は R2 のフェイクを使って unit test する

### デプロイ設定（`wrangler.jsonc`。ダッシュボードでは設定しない）

- `main: src/worker/index.ts`
- `assets: { directory: "./dist", binding: "ASSETS", run_worker_first: ["/tiles/*", "/data/*"] }`（`not_found_handling` は指定しない。対象外のパスは Worker が 404 を返す）
- `r2_buckets: [{ binding: "ASSETS_BUCKET", bucket_name: "whm-assets" }]`
- `workers_dev: true`、`preview_urls: true`（どちらも明示的に書く）
- `previews: { r2_buckets: [{ binding: "ASSETS_BUCKET", bucket_name: "whm-assets" }] }`
  - プレビューは本番の設定を引き継がないので、ここに書き直す必要がある
  - 本番と同じバケットを使う。キーにハッシュが入るので衝突しない
- `observability.enabled: true`

## 6. SEO とモバイル対応

- `index.html` に入れるのは `lang="ja"`、`<title>`、viewport だけ
- メタディスクリプションは空にする。OGP、Twitter Card、canonical、favicon、robots.txt、sitemap、構造化データは作らない
- レイアウトは 375px 幅から崩れないようにする。検索窓は上部、選択パネルは PC では右上、スマートフォンでは下部のシートにする（DESIGN.md で確定する）

## 7. UI 文言一覧

画面に出す文言はここに挙げたものだけにする。追加や変更が必要になったら、先にこの一覧を更新して承認を得る。

| 場所 | 文言 |
|---|---|
| `<title>` | 世界史地図 |
| 検索窓のプレースホルダーと aria-label | 地名を検索 |
| 候補が無いとき | 該当する地名がありません |
| タイルの読み込み失敗 | 地図の読み込みに失敗しました |
| 都市データの読み込み失敗 | 地名データの読み込みに失敗しました |
| 選択パネルの閉じるボタン（aria-label） | 閉じる |
| noscript | このページを表示するには JavaScript を有効にしてください |

選択パネルには都市の表示名（`name`）だけを表示する。

## 8. 開発環境・ツール

- **nix flake の devShell**: nodejs_24、pnpm、tippecanoe
  - Natural Earth は GeoJSON を直接使うので gdal は不要。タイルの検証は JS で行うので pmtiles CLI も不要
  - 1Password CLI（`op`）は含めない。ローカルでデプロイするときだけ使うので、端末にグローバルインストールしたものを使う
- **パッケージ**: 現時点の最新安定版を exact 指定で固定する（`.npmrc` に `save-exact=true`）
  - `package.json` の `packageManager` に `pnpm@12.5.1` を書く
  - 主なもの: React 19 / Vite 8 / TypeScript 7 / Tailwind 4 / maplibre-gl 6 / pmtiles 4 / Biome 2 / Vitest 5 / wrangler 4 / @google/design.md
  - TypeScript 7 で周辺ツールとの互換問題が出たら 6.x に固定し、この spec を更新する
- **lint・format**: Biome（`biome ci`）
- **テスト**: Vitest の unit test のみ
  - 対象: `cities.json`、`city.ts` の検証、`match.ts`、`serve.ts`、`manifest.ts`、Vite の dev プラグイン
  - UI は実ブラウザで確認する
- **型検査**: `tsc --noEmit`（アプリ用と Worker 用の tsconfig を分ける）
- **npm scripts**

  | 名前 | 内容 |
  |---|---|
  | `dev` | 開発サーバー |
  | `build` | ビルド |
  | `lint` | Biome |
  | `typecheck` | 型検査 |
  | `test` | unit test |
  | `tokens` | DESIGN.md から `src/app/theme.css` を生成 |
  | `tiles:build` | ベースマップの生成 |
  | `publish:assets` | R2 へのアップロードと manifest 出力 |
  | `deploy:cf` | 本番デプロイ |
  | `preview:cf` | プレビューデプロイ |
  | `dev:secrets` | `op run --env-file=.env.op -- <cmd>` |

  - `deploy` という名前は使わない（pnpm の組み込みコマンドに取られるため）
- **シークレット**
  - ローカル: `.env.op` に `op://` の参照だけを書いてコミットし、`op run` で注入する
  - CI: GitHub Secrets の `CLOUDFLARE_API_TOKEN`（Workers Scripts と R2 Storage の Edit 権限）と `CLOUDFLARE_ACCOUNT_ID`

## 9. デザイントークン

DESIGN.md の YAML front matter を、デザイントークンの唯一の定義元にする。Tailwind や MapLibre のスタイルに同じ値を直接書かない。

1. `pnpm tokens` で `@google/design.md export --format css-tailwind DESIGN.md` を実行し、Tailwind v4 の `@theme` ブロックを `src/app/theme.css` に書き出す。その際、次の 2 点を直す
   - `@theme static` にする。Tailwind v4 は未使用のテーマ変数を出力しないので、地図の色を CSS 変数から読めなくなるため
   - フォントの並び（例: `system-ui, sans-serif`）全体が 1 つの名前として引用符で囲まれるので、名前ごとに囲み直す
2. `theme.css` は生成物としてコミットする。CI で `pnpm tokens` をもう一度実行し、差分が出たら失敗させる
3. Tailwind のユーティリティは `theme.css` の変数（`--color-*` など）を使う
4. MapLibre のスタイル（海・陸・海岸線・都市の点の色）も、`style.ts` が同じ CSS 変数を `getComputedStyle` で読んで組み立てる

## 10. CI/CD（GitHub Actions）

すべてのジョブで pnpm と Node をセットアップし、`pnpm install --frozen-lockfile` を明示的に実行する。actions のバージョンは SHA で固定する。

- **`ci.yml`**（pull_request と main への push）
  - `biome ci` → `typecheck` → `test` → `design.md lint` → `tokens` の差分確認 → `build` → `publish:assets --dry-run` → `wrangler deploy --dry-run`（設定の検証）
- **`preview.yml`**（pull_request の opened / synchronize / reopened / closed）
  - 実行条件: `github.actor != 'dependabot[bot]'` かつ fork からの PR ではないこと（Secrets が渡らないため）
  - デプロイ: `build` → `publish:assets` → `wrangler preview --name pr-<番号> --json` → URL を取り出す → `scripts/smoke.sh` で確認 → PR コメント（日本語）を 1 件作り、以降は同じコメントを更新する
  - closed のとき: `wrangler preview delete` でプレビューを削除する
- **`deploy.yml`**（main への push。`concurrency` で同時実行を防ぐ）
  - `build` → `publish:assets` → `wrangler deploy` → `scripts/smoke.sh`
  - 本番 URL（`https://world-history-map.<サブドメイン>.workers.dev`）はワークフローのファイルに書く
- **`scripts/smoke.sh`**（プレビューと本番で共通）: トップが 200、タイルの Range が 206 で強い ETag を持つ、範囲外の Range が 416、都市データが取得できる
- **`dependabot.yml`**
  - npm: 週次、`cooldown`（default 7 日、major 14 日）、dev と prod でグループ化
  - github-actions: 週次、`cooldown`（7 日）
  - pnpm の `minimumReleaseAge` は使わない。公開直後のバージョンを固定した直後だと frozen install が失敗するため

## 11. ドキュメント

- **CLAUDE.md**: Claude Code 公式のベストプラクティスに従う
  - 200 行未満にし、コードを読めば分かることは書かない
  - 書くこと: コマンド、言語ポリシー、データ作成方針、UI 文言は §7 の一覧にあるものだけ使うこと、デザイントークンは DESIGN.md だけを編集すること、ゴッチャ（`deploy` という script 名、previews の設定の書き直し、dependabot の PR には Secrets が渡らないこと等）、検証手順
  - パスごとのルールは `.claude/rules/*.md`（`paths:` で対象を指定）に分ける
  - main 保護の規約は書かない（public 化した後、GitHub のブランチ保護で担保する）
- **DESIGN.md**: google-labs-code/design.md の仕様（alpha）に従う
  - YAML front matter に colors（primary は必須）、typography、rounded、spacing、components のトークンを書く
  - 本文の見出しは Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts の順にする
  - CI で lint する
- **設計変更の記録**: ADR は作らない。スパイクの結果や方針の変更は、この spec を更新してコミットする
- **言語**
  - コミットメッセージは英語
  - UI 文言・ドキュメント・コード内コメント・テスト名・PR・イシューは日本語

## 12. リスクと早期スパイク

実装を積み上げる前に、Cloudflare の実環境で次を確認し、結果に合わせてこの spec を更新する。

| 確認すること | ダメだった場合 |
|---|---|
| Worker 経由の R2 の Range 応答（206 / 416、ETag が強いまま保たれるか）と、pmtiles + MapLibre での描画 | 原因を調べて Worker を直す。どうしても直らなければ、独自ドメインを用意して R2 から直接配信することをユーザーと相談する |
| Worker Previews の作成 → PR コメント → 削除の流れ | `wrangler versions upload --preview-alias` を使う |
| pnpm 12 のロックファイルで Dependabot が PR を作れるか（main にマージした後でないと確認できない） | pnpm 10.34.5 に固定する |

### スパイクの結果（2026-09-23、PR #2）

| 確認したこと | 結果 | 対応 |
|---|---|---|
| Worker 経由の R2 の Range 応答 | プレビュー環境で `scripts/smoke.sh` が成功した（タイルの Range が 206 かつ強い ETag、範囲外が 416、都市データを取得できる） | 変更なし。R2 から直接配信する案は不要 |
| Worker Previews の作成と PR コメント | `wrangler preview --name pr-2` でプレビューを作成でき、URL の PR コメントも付いた。本番の Worker がまだ無くても作成できた | `--json` を付けても、アセットのアップロード進捗が JSON より前に出力される。そのため、ワークフローで最初の `{` 以降だけを取り出してから jq に渡すように直した |
| プレビュー URL の形式 | `https://pr-<番号>-world-history-map.akihiro-tj.workers.dev` | 本番 URL を `https://world-history-map.akihiro-tj.workers.dev` に確定させた |
| pmtiles と MapLibre での描画（プレビュー上） | 未確認（作業環境から workers.dev に接続できない） | ユーザーがプレビュー URL を実機で開いて確認する（Task 14） |
| pnpm 12 と Dependabot | 未確認 | main にマージした後に確認する（Task 14） |
| GitHub Secrets の API トークン | 最初は Cloudflare に拒否された（401 / code 9109）。登録し直したら通った | なし |

その他の注意点:

- MapLibre 6 は WebGL2 が必須で、ESM のみの配布になっている。ビルド後にワーカーのチャンクが出力されているか確認する
- プレビューも本番と同じバケットに書き込むので、古いハッシュのオブジェクトが溜まる。MVP では許容し、後でライフサイクルルールを設定する
- 1 ファイルが 16 KiB 未満の pmtiles はクライアントが 416 経由で読み直す。本番のタイルでは問題ないが、スパイクでは 16 KiB 以上のファイルを使う

## 13. ユーザーの作業・確認が必要な場面

1. Cloudflare の準備: R2 バケットの作成、API トークンの発行、GitHub Secrets と 1Password への登録
2. スパイク結果の確認
3. DESIGN.md と HTML モック（Artifact）のレビュー
4. 本番デプロイ後、実機（PC / スマートフォン）での確認
