# 同期チェックリスト

トピックごとに「探索戦略」とチェック項目を定義する。
ソースファイルは固定パスではなく glob パターンで指定し、実行時に動的に解決する。

## architecture

探索戦略:
- `package.json`（ルート）と `pnpm-workspace.yaml` からワークスペース構成を取得
- `apps/*/package.json` から各アプリの依存関係を取得
- `**/wrangler.toml` からデプロイ設定を取得
- ルートの設定ファイル: `biome.json`, `playwright.config.*`, `vitest.{workspace,config}.*`, `tsconfig*.json`

チェック項目:
- モノレポ構成（ワークスペースパッケージ一覧）
- 技術スタックのバージョン
- デプロイ先
- dev/build/test コマンド
- アプリごとの主要依存関係

## data-model

探索戦略:
- `apps/**/types/**/*.ts` で全アプリの型定義を検索
- `apps/**/public/data/**/*.json` でランタイムデータの形状を確認
- `export (type|interface|enum)` を grep で横断検索し、漏れを防ぐ

チェック項目:
- エクスポートされた全 type/interface 定義（フィールドシグネチャ含む）
- 共有型 vs アプリ固有型
- ランタイムデータスキーマ（実行時に読み込む JSON ファイル）
- enum/union 型の値

## frontend

探索戦略:
- `apps/frontend/src/**/*.tsx` で全コンポーネントを検索
- `apps/frontend/src/**/use-*.ts` でカスタム hooks を検索
- `apps/frontend/src/**/*context*.tsx` で Context を検索
- エントリポイント: `apps/frontend/src/{main,app,index}.*`
- `apps/frontend/src/**/lib/**/*.ts` でユーティリティを検索

チェック項目:
- コンポーネントツリー（親子関係）
- カスタム hooks 一覧（用途と戻り値の型）
- Context プロバイダーとその状態の形状
- データ取得パターン
- 主要なユーザー操作とそのデータフロー

## data-pipeline

探索戦略:
- `apps/pipeline/src/**/stages/**/*.ts` でステージを検索
- `apps/pipeline/src/**/{cli,index,main}.*` でエントリポイントを検索
- `apps/pipeline/package.json` の scripts を確認
- `apps/pipeline/src/**/lib/**/*.ts` でユーティリティを検索

チェック項目:
- パイプラインステージ（入出力を含む順序付きリスト）
- CLI 引数とオプション
- 外部ツール依存
- ファイル I/O パス
- データ変換フロー

## worker

探索戦略:
- `apps/worker/src/**/*.ts` で全ソースを検索
- `apps/worker/wrangler.toml` で設定を確認

チェック項目:
- ルート定義と HTTP メソッド
- R2 バケットバインディングとアクセスパターン
- CORS およびキャッシュヘッダー
- エラーハンドリング戦略
