# 同期チェックリスト

overview.md の各セクションに対応するチェック項目。

## アプリ構成

探索戦略:
- `apps/` 直下のディレクトリ一覧
- 各アプリの `package.json` の name / description

チェック項目:
- アプリの追加・削除・名称変更がないか
- アプリ間の依存関係に変化がないか

## pipeline: データの流れ

探索戦略:
- `apps/pipeline/src/stages/*.ts` でステージ一覧と入出力を把握
- `apps/pipeline/src/cli.ts` でコマンド一覧を確認

チェック項目:
- ステージの追加・削除・順序変更
- 外部データソースの変更（GitHub リポジトリ、Notion DB 等）
- 出力先の変更（R2, public/data/ 等）
- 外部ツール依存の変更（tippecanoe, wrangler 等）

## frontend: 状態設計

探索戦略:
- `apps/frontend/src/**/*context*.tsx` で Context を検索
- `apps/frontend/src/**/use-*.ts` でカスタム hooks を検索
- `apps/frontend/src/components/**/*.tsx` で主要コンポーネントを把握

チェック項目:
- AppState のフィールド追加・削除
- 新しい Context や hooks の追加
- 状態管理手法の変更（Context → URL params 等）
- コンポーネント構成の大きな変更

## 中核の型

探索戦略:
- `apps/**/types/**/*.ts` で型定義を検索
- `export (type|interface)` を grep で横断検索

チェック項目:
- TerritoryDescription, YearEntry 等の中核型のフィールド変更
- 新しい中核型の追加
- 型の重複・共有パッケージ化の変化

## データファイル

探索戦略:
- `apps/frontend/public/data/**/*.json` で JSON ファイルを確認
- `apps/frontend/public/pmtiles/` でタイル関連ファイルを確認

チェック項目:
- JSON ファイルの追加・削除・形状変更
- ファイルパスの変更

## worker: タイル配信

探索戦略:
- `apps/worker/src/**/*.ts` で Worker の処理を把握

チェック項目:
- エンドポイントの追加・削除
- キャッシュ戦略の変更
- R2 バインディングの変更

## よくある問い

チェック項目:
- 記載されている操作手順がコードの実態と合っているか
- 新しいよくある開発シナリオがないか
