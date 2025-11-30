# Quickstart: インタラクティブ世界史地図

**Date**: 2025-11-29
**Feature**: 001-interactive-history-map

## Prerequisites

- Node.js 22.x (LTS)
- pnpm 9.x 以上
- Git

## Setup

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd world-history-map
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. historical-basemapsデータの取得と変換

```bash
# GeoJSONデータをダウンロードしPMTilesに変換
pnpm fetch-geodata
```

このスクリプトは以下を実行します:
- historical-basemapsリポジトリからGeoJSONファイルを取得
- Tippecanoeを使用してPMTiles形式に変換
- `public/pmtiles/` ディレクトリに配置
- index.jsonを生成

### 4. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで http://localhost:5173 を開く

## Development Commands

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | プロダクションビルド |
| `pnpm preview` | ビルド結果のプレビュー |
| `pnpm test` | ユニットテスト実行 |
| `pnpm test:e2e` | E2Eテスト実行 |
| `pnpm check` | Biome lint + format チェック |
| `pnpm typecheck` | TypeScript型チェック |

## Project Structure

```
world-history-map/
├── public/
│   └── pmtiles/           # PMTiles形式の地図データ
├── src/
│   ├── components/        # Reactコンポーネント
│   │   ├── map/          # 地図関連
│   │   ├── year-selector/ # 年代選択
│   │   ├── territory-info/# 領土情報
│   │   └── legal/        # ライセンス・免責
│   ├── hooks/            # カスタムフック
│   ├── types/            # 型定義
│   ├── data/             # 静的データ（説明文等）
│   └── utils/            # ユーティリティ
├── tests/
│   ├── unit/             # ユニットテスト
│   ├── integration/      # 統合テスト
│   └── e2e/              # E2Eテスト
└── specs/                # 仕様書
```

## Key Technologies

- **React 19.x**: UIフレームワーク
- **TypeScript 5.9.x**: 型安全性
- **MapLibre GL JS + react-map-gl v8 + PMTiles**: 地図描画
- **shadcn/ui + Tailwind v4**: UIコンポーネント
- **Vite 7.x**: ビルドツール
- **Biome 2.x**: Linter/Formatter
- **Vitest 4.x**: ユニットテスト
- **Playwright 1.57.x**: E2Eテスト

## Basic Usage

### 地図の操作

- **ズーム**: マウスホイール or ピンチ操作
- **パン**: ドラッグ操作
- **領土選択**: 領土をクリック

### 年代の変更

画面下部の年代セレクターで年代ボタンをクリック

### 領土情報の表示

地図上の領土をクリックすると、右側に情報パネルが表示される

## Troubleshooting

### 地図データが表示されない

```bash
# データを再取得
pnpm fetch-geodata

# キャッシュクリア
rm -rf node_modules/.vite
pnpm dev
```

### 型エラーが発生する

```bash
# 型定義を再生成
pnpm typecheck
```

### テストが失敗する

```bash
# 依存関係を再インストール
rm -rf node_modules
pnpm install
pnpm test
```

## Next Steps

1. `pnpm dev` で開発サーバーを起動
2. http://localhost:5173 でアプリケーションを確認
3. `src/components/` 以下のコンポーネントを編集
4. `pnpm test` でテストを実行

## Resources

- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)
- [react-map-gl Documentation](https://visgl.github.io/react-map-gl/)
- [historical-basemaps Repository](https://github.com/aourednik/historical-basemaps)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
