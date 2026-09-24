# 世界史地図

受験生・学習者向けに、世界史の地名を地図で確かめる Web アプリ。

## コマンド

- 開発: `pnpm dev`（manifest は Vite プラグインがローカルパスで返すので R2 は不要）
- 検査: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- 整形: `pnpm format`
- トークン生成: `pnpm tokens`（DESIGN.md を変えたら必ず実行し、`src/app/theme.css` もコミットする）
- タイル生成: `nix develop -c pnpm tiles:build`
- 手元からのデプロイ: `pnpm dev:secrets pnpm deploy:cf`（1Password の `op` を使う）

## 言語

- コミットメッセージと GitHub Actions のワークフロー・ジョブ・ステップ名は英語
- UI 文言・ドキュメント・コード内コメント・テスト名・PR・イシューは日本語

## 守ること

- UI 文言は `src/app/copy.ts` と `index.html` にあるものだけを使う。新しい文言が必要なら、実装する前にユーザーに内容を確認する
- SEO 用のメタ情報・OGP・favicon などを勝手に足さない
- 色・角丸・余白・文字の値は DESIGN.md の front matter だけで管理する。Tailwind のクラスや MapLibre のスタイルに値を直接書かない
- `docs/superpowers/specs/` の spec は作成時点の記録で、書き換えない。新しい機能や大きな変更は新しい spec を作り、変更の理由は PR の本文に書く（ADR は作らない）
- 依存は exact 指定で追加する

## ゴッチャ

- npm script に `deploy` という名前を付けない（pnpm の組み込みコマンドに取られて何も起きない）
- Worker Previews は本番の設定を引き継がない。`wrangler.jsonc` のバインディングを変えたら `previews` 側も直す
- dependabot の PR には Secrets が渡らないので、プレビューは実行されない（CI だけが回る）
- Tailwind v4 は未使用のテーマ変数を出力しない。地図の色は CSS 変数から読むので、`theme.css` は `@theme static` で生成している
- `design.md export` はフォントの並びを 1 つの名前として引用符で囲む。`scripts/lib/themeCss.ts` で直している
- R2 のバケット名 `whm-assets` は `wrangler.jsonc` と `scripts/lib/assetKeys.ts` の 2 か所にある（テストで一致を確認）
- MapLibre 6 は WebGL2 が必須。headless Chromium では `--use-angle=swiftshader --enable-unsafe-swiftshader` を付ける
- 本番ビルドでは MapLibre のワーカーが自動で出力されないので、`vite/plugins/copyMaplibreWorker.ts` が `dist/assets/maplibre-gl-<バージョン>/` に worker と shared を出力し、`MapView.tsx` が `setWorkerUrl` でそこを指す。`vite.config.ts` の `optimizeDeps.exclude: ["maplibre-gl"]` は dev でワーカーが読めなくなるのを防ぐためのもので、外さない。
- `maplibre-gl.css` の `.maplibregl-map { position: relative }` が Tailwind の `absolute` より優先されるので、地図のコンテナは `!absolute` にしている。

## 検証

- ロジックは Vitest（node 環境）で確認する。E2E テストは作らない
- UI を変えたら、実ブラウザで PC 幅と 375px 幅の両方を確認する
- デプロイ先は `bash scripts/smoke.sh <URL>` で確認できる
