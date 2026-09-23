# 世界史地名マップ 設計書（MVP）

- 作成日: 2026-09-23
- 状態: レビュー待ち

## 1. 目的と利用者

受験生・学習者が、世界史に出てくる地名の位置を地図上で確かめられる Web アプリ。一般に公開するので、SEO とモバイル対応は MVP に含める。

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

## 3. 画面と操作

画面は 1 つだけ。全画面の地図の上に、検索窓と選択パネルを重ねる。レイアウトと配色は DESIGN.md で決め、HTML モックを Artifact で公開してレビューしてもらう。

- **初期表示**: 10 都市がすべて収まる範囲（中央アジア〜東アジア）を表示する。都市は点だけで、ラベルは出さない
- **地図の操作**: MapLibre 標準のドラッグ・ホイール・ピンチでパン・ズームする。ズームボタンを表示する。地図の回転と傾きは無効にする
- **地物の選択**: 点をクリック（タップ）すると選択状態になり、点の見た目が変わり、選択パネルに名前を表示する。スマートフォンでも押しやすいように、クリック判定は見た目より広めに取る。地図の何もない所をクリックするか、パネルを閉じると選択が解除される
- **検索**
  - 1 文字入力するたびに候補を最大 10 件表示する
  - 前方一致を先に、部分一致を後に並べる
  - 比較の前に入力と名前・読みの両方を正規化する（NFKC、ひらがな→カタカナ、空白の除去）
  - 例: 「さま」→ サマルカンド、「亀」→ クチャ（亀茲）
  - 候補は ↑↓ キーで移動し、Enter で決定、Esc で閉じる。WAI-ARIA の combobox パターンに従う
  - 決定すると、その都市へ flyTo して選択状態にする
  - 該当がなければ「該当する地名がありません」と表示する
- **読み込み中・エラー**: タイルの読み込みに失敗したら、地図の上に日本語のメッセージを出す。検索と選択は、ベースマップが無くても都市データだけで動く

## 4. データ

### 都市データ

`src/data/cities.ts` に型付きの定数として置き、ビルド時にバンドルする（10 件なので fetch はしない）。

```ts
type City = {
  id: string;        // 英小文字の slug。一意
  name: string;      // 表示名
  reading: string;   // ひらがなの読み（検索用）。複数あれば半角空白で区切る（例: "くちゃ きじ"）
  type: "city";
  lon: number;       // WGS84 経度
  lat: number;       // WGS84 緯度
  source: string;    // 座標の出典（URL など）
};
```

データの作成方針（CLAUDE.md にも書く）:

- 正確性を網羅性より優先する。不確かなものは載せない
- 座標は遺跡や歴史的中心地を指す。現在の同名都市の中心とずれる場合は遺跡を優先する（例: カラコルム = ハルホリン近郊の遺跡、サライ = セリトレンノエ付近）
- 出典は 1 件以上付ける（Wikipedia の座標表記、学術資料など）。精度は小数 2〜4 桁でよい
- unit test で検証する: スキーマに合っているか、id が重複していないか、経度 −180〜180・緯度 −90〜90 に収まるか、`reading` がひらがなと半角空白だけか、名前が空でないか

### ベースマップ

- 出典: Natural Earth v5.1.2 の `ne_{110m,50m,10m}_{land,coastline}.geojson`
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
  - `pmtiles verify` で検証する
  - z7 以上は MapLibre のオーバーズームで表示する
- 生成した `world.pmtiles` はハッシュなしのファイル名でコミットする。目標は 15 MB 未満。超えた場合は最大ズームを 5 に下げる
- クレジット: MapLibre の AttributionControl に「Natural Earth」を表示する

## 5. アーキテクチャ

```
ブラウザ ──▶ Cloudflare Worker（単一）
             ├─ 静的アセット（dist/: HTML・JS・CSS・asset-manifest.json）
             └─ /tiles/* ─▶ src/worker ─▶ R2 バケット whm-assets（Range 対応）
```

### フロントエンド（`src/`）

| モジュール | 責務 |
|---|---|
| `app/` | ルートのコンポーネントとレイアウト。選択中の都市 id を状態として持つ |
| `map/MapView.tsx` | MapLibre の初期化、pmtiles プロトコルの登録、都市レイヤー、クリックの処理、flyTo |
| `map/style.ts` | スタイル定義。海の背景、`land` の塗り、`coastline` の線、都市の circle。glyphs とシンボルレイヤーは持たない |
| `search/match.ts` | 正規化と候補の抽出（純関数） |
| `search/SearchBox.tsx` | combobox の UI |
| `data/cities.ts` | 都市データ |
| `assets/manifest.ts` | `/asset-manifest.json` を取得し、論理名から URL を返す |

- 都市は GeoJSON ソースの circle レイヤーで描く。選択状態は `feature-state` で持つ。名前は DOM のパネルに出すので、MapLibre のラベルや CJK グリフは使わない
- 選択の状態は App が一元管理する。地図のクリックと検索の決定は、どちらも同じ `selectCity(id)` を呼ぶ

### アセットの解決

- `public/` の原本はハッシュなしでコミットする
- デプロイ時に `scripts/publish-assets.ts` が次を行う
  - 対象ファイルの sha256 の先頭 12 桁でキー（例: `tiles/world.<hash>.pmtiles`）を決める
  - `wrangler r2 object put` で R2 にアップロードする（Cache-Control: `public, max-age=31536000, immutable`）
  - `dist/asset-manifest.json`（例: `{"tiles/world.pmtiles": "/tiles/world.<hash>.pmtiles"}`）を出力する
- アプリは起動時に manifest を取得し、pmtiles のソース URL を `pmtiles://` + 同じオリジンの絶対 URL として組み立てる
- manifest は `public/_headers` で `Cache-Control: no-cache` にする
- `public/.assetsignore` で `tiles/` を静的アセットのアップロード対象から外す
- 開発時は Vite プラグイン（`vite/plugins/assetManifestDev.ts`）がローカルパスを指す manifest を返す。`public/tiles` は Vite がそのまま配信するので、R2 なしで動く。Range にも対応している

### Worker（`src/worker/`）

- `/tiles/*` の GET と HEAD だけを受け持つ（`assets.run_worker_first: ["/tiles/*"]`）。それ以外はすべて静的アセットが返す
- `env.TILES.get(key, { range: request.headers, onlyIf: request.headers })` で取得する
- 返すステータスとヘッダーは、純関数 `range.ts` で組み立てる

  | 状況 | 応答 |
  |---|---|
  | Range 指定あり | 206、`Content-Range: bytes s-e/size` |
  | Range 指定なし | 200 |
  | 条件付きリクエストで変更なし | 304 |
  | 条件付きリクエストで条件不一致 | 412 |
  | 範囲外 | 416、`Content-Range: bytes */size` |
  | キーが存在しない | 404 |

- すべての応答に `Accept-Ranges: bytes`、強い ETag（`httpEtag`）、`Content-Type: application/vnd.pmtiles`、immutable の Cache-Control を付ける
- `range.ts` は R2 のモックを使って unit test する

### デプロイ設定（`wrangler.jsonc`。ダッシュボードでは設定しない）

- `main: src/worker/index.ts`
- `assets: { directory: "./dist", binding: "ASSETS", run_worker_first: ["/tiles/*"], not_found_handling: "404-page" }`
- `r2_buckets: [{ binding: "TILES", bucket_name: "whm-assets" }]`
- `workers_dev: true`、`preview_urls: true`（どちらも明示的に書く）
- `previews: { r2_buckets: [{ binding: "TILES", bucket_name: "whm-assets" }] }`
  - プレビューは本番の設定を引き継がないので、ここに書き直す必要がある
  - 本番と同じバケットを使う。キーにハッシュが入るので衝突しない
- `observability.enabled: true`

## 6. SEO とモバイル対応

- `index.html` に次を設定する
  - `lang="ja"`
  - title とメタディスクリプション（日本語）
  - viewport
  - OGP / Twitter Card（`og.png` を用意する）
  - canonical（workers.dev の URL）
  - favicon
- `robots.txt` を置く。ページが 1 つだけなので sitemap は作らない
- 構造化データは MVP では入れない
- レイアウトは 375px 幅から崩れないようにする。検索窓は上部、選択パネルは PC では右上、スマートフォンでは下部のシートにする（DESIGN.md で確定する）
- JS が無効な環境向けに noscript でメッセージを出す

## 7. 開発環境・ツール

- **nix flake の devShell**: nodejs_24、pnpm、tippecanoe、gdal、pmtiles、jq、_1password-cli
- **パッケージ**: 現時点の最新安定版を exact 指定で固定する（`.npmrc` に `save-exact=true`）
  - `package.json` の `packageManager` に `pnpm@12.5.1` を書く
  - 主なもの: React 19 / Vite 8 / TypeScript 7 / Tailwind 4 / maplibre-gl 6 / pmtiles 4 / Biome 2 / Vitest 5 / wrangler 4
  - TypeScript 7 で周辺ツールとの互換問題が出たら 6.x に固定し、ADR に記録する
- **lint・format**: Biome（`biome ci`）
- **テスト**: Vitest の unit test のみ
  - 対象: 都市データ、`match.ts`、`range.ts`、`manifest.ts`、Vite の dev プラグイン
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
  | `tiles:build` | ベースマップの生成 |
  | `publish:assets` | R2 へのアップロードと manifest 出力 |
  | `deploy:cf` | 本番デプロイ |
  | `preview:cf` | プレビューデプロイ |
  | `dev:secrets` | `op run --env-file=.env.op -- <cmd>` |

  - `deploy` という名前は使わない（pnpm の組み込みコマンドに取られるため）
- **シークレット**
  - ローカル: `.env.op` に `op://` の参照だけを書いてコミットし、`op run` で注入する
  - CI: GitHub Secrets の `CLOUDFLARE_API_TOKEN`（Workers Scripts と R2 Storage の Edit 権限）と `CLOUDFLARE_ACCOUNT_ID`

## 8. CI/CD（GitHub Actions）

すべてのジョブで pnpm と Node をセットアップし、`pnpm install --frozen-lockfile` を明示的に実行する。actions のバージョンは SHA で固定する。

- **`ci.yml`**（pull_request と main への push）
  - `biome ci` → `typecheck` → `test` → `design.md lint` → `build`
- **`preview.yml`**（pull_request の opened / synchronize / reopened / closed）
  - 実行条件: `github.actor != 'dependabot[bot]'` かつ fork からの PR ではないこと（Secrets が渡らないため）
  - デプロイ: `build` → `publish:assets` → `wrangler preview --name pr-<番号> --json` → URL を取り出す → `/tiles/...` に Range リクエストを送り、206 が返ることを確認 → PR コメント（日本語）を 1 件作り、以降は同じコメントを更新する
  - closed のとき: `wrangler preview delete` でプレビューを削除する
- **`deploy.yml`**（main への push。`concurrency` で同時実行を防ぐ）
  - `build` → `publish:assets` → `wrangler deploy` → スモークテスト（トップが 200、タイルが 206）
- **`dependabot.yml`**
  - npm: 週次、`cooldown`（default 7 日、major 14 日）、dev と prod でグループ化
  - github-actions: 週次、`cooldown`（7 日）
  - pnpm の `minimumReleaseAge` は使わない。公開直後のバージョンを固定した直後だと frozen install が失敗するため

## 9. ドキュメント

- **CLAUDE.md**: Claude Code 公式のベストプラクティスに従う
  - 200 行未満にし、コードを読めば分かることは書かない
  - 書くこと: コマンド、言語ポリシー、データ作成方針、ゴッチャ（`deploy` という script 名、previews の設定の書き直し、dependabot の PR には Secrets が渡らないこと等）、検証手順
  - パスごとのルールは `.claude/rules/*.md`（`paths:` で対象を指定）に分ける
  - main 保護の規約は書かない（public 化した後、GitHub のブランチ保護で担保する）
- **DESIGN.md**: google-labs-code/design.md の仕様（alpha）に従う
  - YAML front matter に colors（primary は必須）、typography、rounded、spacing、components のトークンを書く
  - 本文の見出しは Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts の順にする
  - CI で lint する
- **docs/adr/**: スパイクの結果など、重要な判断を記録する
- **言語**
  - コミットメッセージは英語
  - UI 文言・ドキュメント・コード内コメント・テスト名・PR・イシューは日本語

## 10. リスクと早期スパイク

実装を積み上げる前に、Cloudflare の実環境で次を確認し、結果を ADR に残す。

| 確認すること | ダメだった場合 |
|---|---|
| R2 経由の Range 応答（206 / 416、ETag が強いまま保たれるか）と、pmtiles + MapLibre での描画 | R2 のカスタムドメインで公開したバケットを直接参照する |
| Worker Previews の作成 → PR コメント → 削除の流れ | `wrangler versions upload --preview-alias` を使う |
| pnpm 12 のロックファイルで Dependabot が PR を作れるか | pnpm 10.34.5 に固定する |

その他の注意点:

- MapLibre 6 は WebGL2 が必須で、ESM のみの配布になっている。ビルド後にワーカーのチャンクが出力されているか確認する
- プレビューも本番と同じバケットに書き込むので、古いハッシュのオブジェクトが溜まる。MVP では許容し、後でライフサイクルルールを設定する
- 1 ファイルが 16 KiB 未満の pmtiles はクライアントが 416 経由で読み直す。本番のタイルでは問題ないが、スパイクでは 16 KiB 以上のファイルを使う

## 11. ユーザーの作業・確認が必要な場面

1. Cloudflare の準備: R2 バケットの作成、API トークンの発行、GitHub Secrets と 1Password への登録
2. スパイク結果の確認
3. DESIGN.md と HTML モック（Artifact）のレビュー
4. 本番デプロイ後、実機（PC / スマートフォン）での確認
