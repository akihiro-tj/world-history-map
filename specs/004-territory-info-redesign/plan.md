# 実装計画書: 領土情報パネル リデザイン

**ブランチ**: `004-territory-info-redesign` | **日付**: 2026-03-01 | **仕様書**: [spec.md](./spec.md)
**入力**: `/specs/004-territory-info-redesign/spec.md` の機能仕様書

## 概要

領土情報パネルのデータモデルと UI を再設計する。非構造化の `facts: string[]` を構造化された `profile` フィールドに置き換え、`era`（時代ラベル）と `context`（時代文脈）フィールドを追加し、タイムラインイベントに選択年に対する時間的分類（過去/現在/未来）を導入する。データソースを静的な AI 生成 JSON から Google スプレッドシート（Single Source of Truth）に移行し、CLI 同期コマンドを作成する。既存の説明データをすべて削除し、教科書レベルの主要 50〜70 領土を新フォーマットで再作成する。

## 技術コンテキスト

**言語/バージョン**: TypeScript 5.9.x (strict mode) + React 19.x, Node.js 22.x LTS
**主要依存関係**: React 19.x, MapLibre GL JS 5.x, react-map-gl 8.x, Tailwind CSS v4, clsx, tailwind-merge, csv-parse（新規）
**ストレージ**: ローカルファイルシステム (`public/data/descriptions/`) + Google スプレッドシート（マスターデータ）
**テスト**: Vitest 4.x + @testing-library/react + Playwright 1.57.x
**対象プラットフォーム**: Web（デスクトップ + モバイルブラウザ）
**プロジェクトタイプ**: web（モノレポ: apps/frontend + apps/pipeline + apps/worker）
**パフォーマンス目標**: 地図操作 60fps、クリック後 2 秒以内の領土識別
**制約**: WCAG 2.1 AA、データに "不明" 値なし、すべてのコンテンツは日本語
**規模/スコープ**: 50 年ファイルにわたる 50〜70 領土、総エントリ数 750〜1500 件

## コンスティチューションチェック

*ゲート: Phase 0 リサーチ前に合格必須。Phase 1 設計後に再チェック。*

### Phase 0 前チェック

| 原則 | 状態 | 備考 |
|------|------|------|
| I. テストファースト | PASS | データバリデーションスキーマ、イベント分類ロジック、UI コンポーネントに TDD 適用 |
| II. シンプルさと型安全性 | PASS | CSV エクスポート（ゼロ設定）を Sheets API より優先。strict なオプション型。`any` なし |
| III. コンポーネント駆動とアクセシビリティ | PASS | 再利用可能なプロフィール/タイムライン/コンテキストコンポーネント。WCAG 2.1 AA。複合的な視覚的手がかり |
| IV. 歴史的正確性と出典明記 | PASS | Google スプレッドシートを人的レビュー付き SSOT として使用。`<AiNotice>` を UI に維持。データ実装前に人的レビュー必須（US-6） |
| V. パフォーマンスと継続的改善 | PASS | 仮想化不要（領土あたりイベント 20 件未満）。`useMemo` で分類計算。既存のプリフェッチ/キャッシュを維持 |

### Phase 1 後チェック

| 原則 | 状態 | 備考 |
|------|------|------|
| I. テストファースト | PASS | バリデーションスキーマテスト、分類ユニットテスト、コンポーネントテスト、E2E テストを計画 |
| II. シンプルさと型安全性 | PASS | 新規抽象化なし。新規依存は `csv-parse` のみ。Zod はパイプライン限定 |
| III. コンポーネント駆動とアクセシビリティ | PASS | `TerritoryProfile`, `TerritoryTimeline`, `TerritoryContext` を再利用可能なコンポーネントとして設計。セマンティック HTML `<ol>` + `aria-current` |
| IV. 歴史的正確性と出典明記 | PASS | 同期時にデータバリデーション（Zod スキーマが "不明" を拒否）。スプレッドシートデータに人的レビューゲート |
| V. パフォーマンスと継続的改善 | PASS | バンドルサイズ不変（50 年ファイル）。分類は O(n) + useMemo。新規ネットワークリクエストなし |

違反なし。Complexity Tracking セクションは該当なし。

## プロジェクト構造

### ドキュメント（本機能）

```text
specs/004-territory-info-redesign/
├── plan.md              # 本ファイル
├── research.md          # Phase 0 出力 - 技術リサーチ
├── data-model.md        # Phase 1 出力 - エンティティ定義
├── quickstart.md        # Phase 1 出力 - 開発者ガイド
├── contracts/           # Phase 1 出力 - 型コントラクト
│   ├── territory-description.ts
│   └── validation-schema.ts
└── tasks.md             # Phase 2 出力 (/speckit.tasks コマンド)
```

### ソースコード（リポジトリルート）

```text
apps/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── territory-info/
│   │   │   │   ├── territory-info-panel.tsx       # パネルレイアウト再設計
│   │   │   │   ├── territory-profile.tsx          # 新規: 構造化プロフィール表示
│   │   │   │   ├── territory-timeline.tsx         # 新規: 時間的タイムライン
│   │   │   │   ├── territory-context.tsx          # 新規: 文脈テキスト表示
│   │   │   │   ├── ai-notice.tsx                  # 既存（維持）
│   │   │   │   └── hooks/
│   │   │   │       └── use-territory-description.ts  # 新スキーマ対応に更新
│   │   │   └── ui/
│   │   │       └── bottom-sheet.tsx               # 既存（変更なし）
│   │   ├── types/
│   │   │   └── territory.ts                       # インターフェース更新
│   │   └── utils/
│   │       └── classify-events.ts                 # 新規: 時間的分類ロジック
│   ├── public/
│   │   └── data/
│   │       └── descriptions/                      # JSON ファイル再作成
│   └── tests/
│       └── e2e/                                   # Playwright テスト
├── pipeline/
│   └── src/
│       ├── cli.ts                                 # sync-descriptions コマンド追加
│       ├── config.ts                              # スプレッドシート設定追加
│       └── stages/
│           ├── sync-descriptions.ts               # 新規: Sheets → JSON 同期
│           └── validate-descriptions.ts           # 新規: Zod バリデーション
└── worker/                                        # 変更なし
```

**構造決定**: 既存のモノレポ構造（apps/frontend + apps/pipeline + apps/worker）を維持。変更はフロントエンド（UI + 型）とパイプライン（新規同期コマンド）にまたがる。新規プロジェクトやパッケージは追加しない。

## Complexity Tracking

> コンスティチューションチェックの違反なし。このセクションは該当なし。
