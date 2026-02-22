# 実装計画: フロントエンド情報設計・UX改善

**ブランチ**: `003-improve-frontend-ux` | **日付**: 2026-02-21 | **仕様書**: [spec.md](./spec.md)
**入力**: `/specs/003-improve-frontend-ux/spec.md` のフィーチャー仕様書

## 概要

フロントエンドに対する5つのUX改善: 現在年の常設表示、コントロールバー統合、選択領土マップハイライト、モバイルInfoPanelボトムシート化、ビジュアル階層見直し。すべてフロントエンドのみの変更で、`apps/frontend/` ワークスペース内の既存Reactコンポーネントの修正と新規コンポーネントの追加で構成される。バックエンドやAPIの変更は不要。

## 技術コンテキスト

**言語/バージョン**: TypeScript 5.9.x (strict mode)
**主要依存関係**: React 19.x, MapLibre GL JS 5.x, react-map-gl 8.x, Tailwind CSS v4, clsx, tailwind-merge
**ストレージ**: なし（クライアントサイドのみ）
**テスト**: Vitest 4.x + @testing-library/react 16.x + @testing-library/user-event 14.x（単体/コンポーネント）, Playwright 1.57.x（E2E）
**対象プラットフォーム**: Web（レスポンシブ — デスクトップ 1024px以上、タブレット 768-1023px、モバイル 375px以上）
**プロジェクト種別**: Web（モノレポ: `apps/frontend/`）
**パフォーマンス目標**: ハイライトレイヤー追加後も地図操作60fps維持
**制約**: WCAG 2.1 AA準拠、キーボード操作対応、`prefers-reduced-motion`尊重（グローバルCSSで対応済み）
**規模/スコープ**: SPA、変更後コンポーネント数 約20、既存テストファイル 約16

## コンスティチューションチェック

*ゲート: Phase 0リサーチ前に合格必須。Phase 1設計後に再チェック。*

| 原則 | 状態 | 備考 |
|------|------|------|
| I. テストファースト | ✅ 合格 | 5つの改善すべてでTDDを実施。テストを先に記述してから実装する。 |
| II. シンプルさと型安全性 | ✅ 合格 | 外部アニメーション/ジェスチャーライブラリの追加なし。スワイプはネイティブタッチイベントで実装。`any`型の使用なし。 |
| III. コンポーネント駆動とアクセシビリティ | ✅ 合格 | 新コンポーネント（YearDisplay, ControlBar, TerritoryHighlightLayer, BottomSheet）は独立・再利用可能。WCAG 2.1 AA: 年代表示に`aria-live`、ボトムシートにキーボードクローズ、既存フックからフォーカストラップを再利用。 |
| IV. 歴史的正確性 | ✅ 該当なし | UIのみの変更であり、歴史データの変更なし。 |
| V. パフォーマンス | ✅ 合格 | MapLibreハイライトレイヤーはGPUアクセラレーションされたfill/lineレンダリングを使用。CSSトランジションはコンポジタースレッドで実行。地図操作中のJSアニメーションなし。 |

**Phase 1設計後の再チェック結果**: 違反なし。すべての設計判断がコンスティチューション原則に適合。

## プロジェクト構造

### ドキュメント（本フィーチャー）

```text
specs/003-improve-frontend-ux/
├── plan.md              # 本ファイル
├── research.md          # Phase 0: 技術リサーチ結果
├── data-model.md        # Phase 1: 状態モデルとコンポーネント設計
├── quickstart.md        # Phase 1: 開発セットアップと検証手順
└── tasks.md             # Phase 2出力（/speckit.tasks — 本コマンドでは作成しない）
```

### ソースコード（リポジトリルート）

```text
apps/frontend/src/
├── components/
│   ├── map/
│   │   ├── map-view.tsx                    # 変更: ハイライトレイヤー統合、ProjectionToggle削除
│   │   ├── territory-highlight-layer.tsx   # 新規: 選択領土ハイライト（fill + outline）
│   │   ├── territory-layer.tsx             # 既存（変更なし）
│   │   ├── territory-label.tsx             # 既存（変更なし）
│   │   ├── projection-toggle.tsx           # 既存（コンポーネント自体は変更なし）
│   │   └── hooks/                          # 既存フック（変更なし）
│   ├── territory-info/
│   │   ├── territory-info-panel.tsx        # 変更: レスポンシブなデスクトップ/モバイル分岐
│   │   └── hooks/                          # 既存フック（変更なし）
│   ├── year-selector/
│   │   └── year-selector.tsx               # 既存（変更なし）
│   ├── year-display/
│   │   └── year-display.tsx                # 新規: 画面上部中央の常設年代表示
│   ├── control-bar/
│   │   └── control-bar.tsx                 # 新規: コントロールボタン統合（投影法切替 + 情報 + GitHub）
│   ├── ui/
│   │   ├── bottom-sheet.tsx                # 新規: モバイル用ボトムシートコンテナ
│   │   └── close-button.tsx                # 既存（変更なし）
│   └── legal/
│       └── license-disclaimer.tsx          # 既存（変更なし）
├── hooks/
│   ├── use-bottom-sheet-snap.ts           # 新規: 3段階スナップ制御（collapsed/half/expanded）
│   ├── use-is-mobile.ts                   # 新規: matchMediaによるブレイクポイントフック
│   ├── use-escape-key.ts                  # 既存（再利用）
│   └── use-focus-trap.ts                  # 既存（再利用）
├── contexts/
│   └── app-state-context.tsx              # 既存（変更不要 — selectedTerritoryは既にステートに存在）
├── utils/
│   └── format-year.ts                     # 新規: year-selector.tsxから抽出して共有化
├── styles/
│   └── map-style.ts                       # 既存（変更なし）
├── App.tsx                                # 変更: YearDisplay, ControlBarを配置する新レイアウト
└── index.css                              # 変更: フェードインキーフレームアニメーション追加
```

**構造の判断**: 既存の `apps/frontend/` モノレポ構造をそのまま使用。新コンポーネントは `components/` 配下のフィーチャーベースディレクトリという確立済みのパターンに従う。共有フックは `hooks/`、共有ユーティリティは `utils/` に配置。新しいワークスペースパッケージは不要。

## 複雑性トラッキング

コンスティチューション違反なし。複雑性の正当化は不要。
