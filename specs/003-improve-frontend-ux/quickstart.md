# クイックスタート: フロントエンド情報設計・UX改善

**ブランチ**: `003-improve-frontend-ux`

## 前提条件

- Node.js 22.x LTS
- pnpm（パッケージマネージャー）

## セットアップ

```bash
git checkout 003-improve-frontend-ux
pnpm install
```

## 開発

```bash
# 開発サーバーの起動
pnpm --filter @world-history-map/frontend dev

# 単体テストの実行（ウォッチモード）
pnpm --filter @world-history-map/frontend test -- --watch

# 全テストの実行
pnpm test

# Lint + 型チェック
pnpm check

# Storybook（コンポーネント開発）
pnpm --filter @world-history-map/frontend storybook
```

## 検証

各改善の実装後、以下で検証する:

```bash
# 1. 全テストが通ること
pnpm test

# 2. 型チェック + Lint
pnpm check

# 3. ビルド成功
pnpm --filter @world-history-map/frontend build

# 4. 目視確認（開発サーバー）
pnpm --filter @world-history-map/frontend dev
# http://localhost:5173 を開く
# デスクトップ (1024px以上) とモバイル (375px) のビューポートで確認
```

## 理解すべき主要ファイル

| ファイル | 役割 |
|---------|------|
| `apps/frontend/src/App.tsx` | ルートレイアウト — YearDisplay, ControlBarを配置する場所 |
| `apps/frontend/src/components/map/map-view.tsx` | マップコンテナ — TerritoryHighlightLayerを統合する場所 |
| `apps/frontend/src/components/territory-info/territory-info-panel.tsx` | 情報パネル — モバイルボトムシート対応に変更 |
| `apps/frontend/src/contexts/app-state-context.tsx` | アプリ状態 (selectedYear, selectedTerritory) — 変更不要 |
| `apps/frontend/src/index.css` | グローバルスタイル — アニメーションキーフレームを追加する場所 |

## TDDワークフロー

各改善について:

1. 先に失敗するテストを書く
2. `pnpm --filter @world-history-map/frontend test -- --watch` でRed（失敗）を確認
3. テストを通す最小限のコードを実装
4. 必要に応じてリファクタリング
5. 既存の全テストが引き続き通ることを確認

## モバイルテスト

ブラウザのDevToolsでモバイルビューポートをシミュレート:
- iPhone SE: 375 x 667
- iPhone 14: 390 x 844
- DevToolsのタッチシミュレーションでタッチ操作をテスト
