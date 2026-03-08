# 同期チェックリスト

トピックごとに「探索戦略」とチェック項目を定義する。
ソースファイルは固定パスではなく glob パターンで指定し、実行時に動的に解決する。

## data-flow

探索戦略:
- `apps/pipeline/src/**/*.ts` でパイプラインのステージと入出力を把握
- `apps/worker/src/**/*.ts` + `apps/worker/wrangler.toml` で Worker の処理内容を把握
- `apps/frontend/src/**/*.ts{,x}` でデータ取得・表示のエントリポイントを把握
- `apps/pipeline/package.json` の scripts で CLI エントリポイントを確認

チェック項目:
- データの起点（Notion DB など外部ソース）と終点（ブラウザ描画）
- 各境界でのデータ形式変換（例: Notion Page → GeoJSON Feature → PMTiles）
- アプリ間の通信方法（ファイル I/O, HTTP, R2 バインディング等）
- パイプラインのステージ順序と各ステージの入出力
- 外部ツール依存（tippecanoe, wrangler 等）の役割

## data-model

探索戦略:
- `apps/**/types/**/*.ts` で全アプリの型定義を検索
- `export (type|interface|enum)` を grep で横断検索
- `apps/**/public/data/**/*.json` でランタイムデータの形状を確認

チェック項目:
- ドメインの中核モデル（Territory, Period 等）の型定義
- 同じ概念の各アプリでの型表現（変換チェーン）
- 共有型 vs アプリ固有型の境界
- ランタイムデータスキーマ（JSON ファイル）の形状

## frontend-state

探索戦略:
- `apps/frontend/src/**/*context*.tsx` で Context を検索
- `apps/frontend/src/**/use-*.ts` でカスタム hooks を検索
- `apps/frontend/src/**/*.tsx` で状態を消費するコンポーネントを把握
- URL パラメータ管理を grep（`useSearchParams`, `URLSearchParams` 等）

チェック項目:
- 状態の管理手法（URL params, React Context, MapLibre 内部状態）と役割分担
- 主要なユーザー操作フロー（年代選択 → レイヤー更新等）
- 状態間の同期ポイント（例: URL ↔ Context ↔ MapLibre state）
- Context プロバイダーの構成と提供する状態の概要
