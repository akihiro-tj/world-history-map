# Implementation Plan: インタラクティブ世界史地図

**Branch**: `001-interactive-history-map` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-interactive-history-map/spec.md`

## Summary

historical-basemapsのデータをPMTiles形式に変換し、世界史の各年代における領土変遷をインタラクティブに可視化するWebアプリケーションを構築する。ユーザーは地図のズーム・パン操作、年代選択、領土クリックによる詳細表示が可能。フロントエンドのみで完結する静的Webアプリケーションとして実装する。

## Technical Context

**Language/Version**: TypeScript 5.9.x (strict mode)
**Primary Dependencies**: React 19.x, MapLibre GL JS + react-map-gl v8, PMTiles
**UI Components**: shadcn/ui (Tailwind v4)
**Build Tool**: Vite 7.x
**Package Manager**: pnpm
**Linter/Formatter**: Biome 2.x
**Storage**: N/A（静的データ、バックエンド不要）
**Testing**: Vitest 4.x + React Testing Library + Playwright 1.57.x (E2E)
**Target Platform**: モダンブラウザ（Chrome, Firefox, Safari, Edge 最新2バージョン）
**Runtime**: Node.js 22.x (LTS)
**Project Type**: Web application (frontend only)
**Hosting**: Cloudflare Pages
**Performance Goals**: 初期表示3秒以内、地図操作60fps、年代切替2秒以内
**Constraints**: 静的ホスティング可能、オフライン対応不要
**Scale/Scope**: 約50年代分のPMTilesデータ、日本語UI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 要件 | 対応方針 | 状態 |
|------|------|----------|------|
| I. テストファースト | TDD必須、テスト先行 | Vitest + RTL + Playwrightでテスト先行開発 | ✅ Pass |
| II. シンプルさと型安全性 | YAGNI、strict TypeScript、any禁止 | strict: true、必要最小限の機能のみ実装 | ✅ Pass |
| III. コンポーネント駆動とアクセシビリティ | 再利用可能コンポーネント、WCAG 2.1 AA | コンポーネント分離、キーボード操作対応、色覚配慮 | ✅ Pass |
| IV. 歴史的正確性と出典明記 | 出典必須、信頼できるソース | historical-basemaps帰属表示、AI生成コンテンツ明記、免責事項表示 | ✅ Pass |
| V. パフォーマンスと継続的改善 | 60fps、応答性確保 | 地図ライブラリのパフォーマンス最適化、遅延ロード | ✅ Pass |

**品質ゲート**:
- テストカバレッジ目標: 80%以上 → CI設定で担保
- TypeScriptコンパイルエラー: 0 → strict modeで担保
- Biomeエラー: 0 → Biome設定で担保
- アクセシビリティ自動チェック: パス必須 → axe-core/Playwrightで担保

## Project Structure

### Documentation (this feature)

```text
specs/001-interactive-history-map/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no backend API)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── Map/
│   │   ├── MapView.tsx           # 地図表示コンポーネント
│   │   ├── TerritoryLayer.tsx    # 領土レイヤー
│   │   └── TerritoryLabel.tsx    # 領土ラベル
│   ├── YearSelector/
│   │   └── YearSelector.tsx      # 年代選択UI
│   ├── TerritoryInfo/
│   │   └── TerritoryInfoPanel.tsx # 領土情報パネル
│   └── Legal/
│       └── LicenseDisclaimer.tsx  # ライセンス・免責事項
├── hooks/
│   ├── useMapData.ts             # 地図データ取得
│   └── useYearNavigation.ts      # 年代ナビゲーション
├── types/
│   └── index.ts                  # 型定義
├── data/
│   └── descriptions/             # AI生成の領土説明JSON
├── utils/
│   └── mapUtils.ts               # 地図ユーティリティ
├── App.tsx
└── main.tsx

tests/
├── unit/
│   └── components/
├── integration/
└── e2e/

public/
└── pmtiles/                      # PMTiles形式の地図データ
```

**Structure Decision**: フロントエンドのみの静的Webアプリケーション。バックエンドは不要（PMTilesは静的ファイルとして配置）。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

該当なし - 全ての原則に準拠
