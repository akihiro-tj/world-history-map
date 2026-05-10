# Implementation Plan: 年代サマリーパネル

**Branch**: `003-era-summary-panel` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-era-summary-panel/spec.md`

## Summary

選択中の年代における世界全体の概況を、地域別カード形式で俯瞰できるパネルを `apps/frontend` に追加する。
既存の領土詳細パネル（`territory-info-panel`）と **全デバイスで後勝ち排他** で動作し、
領土詳細パネル内には「{year} 年の世界を見る」遷移帯を常時表示してサマリーへ 1 操作で復帰できる動線を設ける。

データの一次ソースは **Notion 上の "Era Summary" データベース**（既存 Territory Description データベースと対称）。
`apps/pipeline` の新規サブコマンド `era-summary-sync` で Notion → JSON に変換し、
`era-summaries/{year}.json` として `apps/frontend` に静的同梱する。

本 plan のスコープには Notion DB 作成と、動作確認用の代表データ 1 件（**1650 年**：既存アプリのデフォルト表示年）の投入までを含む。
残りの年代の整備はコンテンツ運用工数として本 plan の範囲外。

## Technical Context

**Language/Version**: TypeScript 5.x（既存ワークスペース）
**Primary Dependencies**:
- Frontend: React 18+, MapLibre GL JS, react-map-gl, Tailwind CSS, Vite, Vitest, Storybook
- Pipeline: Node.js, `@notionhq/client`（既存サブコマンド `territory-sync` と同等の構成）
- データソース: Notion 上の "Era Summary" データベース（新規作成）
- 共通: pnpm workspace, Biome（format / lint）

**Storage**:
- 新規：`apps/frontend/public/data/era-summaries/{year}.json`（静的同梱）
- 既存：`apps/frontend/public/data/descriptions/{year}.json`（参照解決用、変更なし）

**Testing**:
- Vitest + Testing Library（コンポーネント単体・状態遷移）
- Storybook（コンポーネントの視覚確認）
- 既存テスト構造を踏襲（`*.test.tsx`、コンポーネント隣接配置）

**Target Platform**: モダンブラウザ（PC・タブレット・モバイル）。SSR なしの SPA。

**Project Type**: 既存の web monorepo（`apps/frontend`、`apps/pipeline`、`apps/worker`、`packages/tiles`）

**Performance Goals**（spec 由来 + 既存実態）:
- 年代切替 → サマリー内容更新の体感待ち時間：通常ネットワークで **1 秒以内**（SC-002）
- 既存機能（地図ズーム / パン / 領土クリック）の操作性に regression を出さない（SC-003）
- パネルの開閉アニメーション：60 fps を維持（T041 の performance check で測定対象に含める）

**Constraints**:
- ランタイムでの AI 推論禁止（spec Out of Scope）
- 既存スタイル言語（`bg-gray-700/95`、`backdrop-blur-sm`、`system-ui` 等）を厳守
- a11y 最低ライン（FR-010）：キーボード操作可・状態のスクリーンリーダー認識可
- bundle size：新規パネル + hook + reducer 拡張による gzipped 増加を **+10KB 以下** に保つ（既存 territory-info-panel が ~5KB 規模であることを参考とした上限。超過時は plan を見直す）

**Scale/Scope**:
- 対象年代：`historical-basemaps` 対応の全年代（既存 `descriptions/` で約 35〜40 年）
- 1 サマリーあたりの地域カード：6〜8 枚（plan で確定する区分集合に依存）
- 1 カードあたりの本文：1〜2 文（150〜400 文字想定）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Posture | Resolution |
|-----------|---------|------------|
| **I. Specification-Driven Change** | ✅ Conform | spec.md と clarifications を経て本 plan を作成。decision log は spec の `Clarifications` に集約済み |
| **II. Automated Quality Gates** | ✅ Conform | 既存の `pnpm test && pnpm check && pnpm typecheck` 一発コマンドで全 gate 実行可能。本機能の追加コードは同じ gate でブロックされる |
| **III. Behavior-First Testing** | ✅ Conform | コンポーネント・状態遷移・データ取得の各層で behavior test を実装より先に書く。既存パターン（`territory-info-panel.test.tsx` 等）を踏襲 |
| **IV. Consistent User Experience** | ✅ Conform | 既存 territory-info-panel・bottom-sheet・control-bar と同じスタイル言語を厳格遵守（v2 mock で確認）。a11y は FR-010 で最低ライン明文化 |
| **V. Performance as a Budget** | ✅ Conform | SC-002（年代切替 1 秒以内）と SC-003（regression なし）が予算。静的 JSON のため fetch + parse は通常 100〜300ms 程度を見込む |

**Initial Constitution Check: PASS**（waiver なし）

## Project Structure

### Documentation (this feature)

```text
specs/003-era-summary-panel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── era-summary-data.md   # JSON schema for era-summaries/{year}.json
├── checklists/
│   └── requirements.md  # 既存
└── spec.md              # 既存
```

### Source Code (repository root)

```text
apps/frontend/
├── src/
│   ├── components/
│   │   ├── era-summary-panel/                    # 新規
│   │   │   ├── era-summary-panel.tsx             # ルート、Desktop/Mobile 分岐
│   │   │   ├── era-summary-panel.test.tsx
│   │   │   ├── era-summary-panel.stories.tsx
│   │   │   ├── region-card.tsx                   # 1 地域カード
│   │   │   ├── summary-trigger.tsx               # 閉時の開閉ボタン（Desktop タブ／Mobile FAB）
│   │   │   ├── summary-references.tsx            # 参照リンク描画
│   │   │   └── hooks/
│   │   │       └── use-era-summary.ts            # データ取得 hook（既存 use-territory-description と同パターン）
│   │   └── territory-info/
│   │       └── territory-info-panel.tsx          # 改修：上部に SummaryNavStrip を追加（FR-011）
│   ├── contexts/
│   │   └── app-state-context.tsx                 # 改修：isSummaryPanelOpen + 後勝ち排他 reducer
│   ├── domain/
│   │   ├── era-summary/                          # 新規
│   │   │   ├── types.ts                          # EraSummary / RegionCard / EraSummaryReference
│   │   │   └── load.ts                           # JSON 読み込み + パース
│   │   ├── territory/                            # 既存
│   │   └── year/                                 # 既存
│   └── types/
│       └── app-state.ts                          # 改修：isSummaryPanelOpen / openedFrom 等
└── public/
    └── data/
        └── era-summaries/                        # 新規
            └── {year}.json                       # 年代ごとのサマリーデータ

apps/pipeline/
└── src/
    ├── cli.ts                                    # 改修：`era-summary-sync` ケースを追加
    └── stages/
        └── sync-era-summaries.ts                 # 新規：Notion → era-summaries/{year}.json
        └── sync-era-summaries.test.ts            # 新規：Notion レスポンスのモック → JSON 出力検証
```

加えて **Notion 上に "Era Summary" データベースを作成** し、動作確認用に **1650 年の代表データ 1 件**（地域カード 6〜8 件）を投入する。Notion DB のプロパティ構造は [contracts/era-summary-data.md](./contracts/era-summary-data.md) で確定。

**Structure Decision**:
本機能は **frontend + pipeline の 2 コンポーネントへの追加** で完結する。`apps/worker`、`packages/tiles`
には触れない。frontend では既存のドメイン軸ディレクトリ（`territory/`、`year/`）に揃えて
`era-summary/` を新設し、コンポーネントも既存命名規則（kebab-case）を踏襲する。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

該当なし（initial check で全 principle が PASS）。

## Phase 0: Research Topics

以下のトピックを `research.md` で解決する：

1. **地域区分の具体集合**：spec で例示した区分群を見直し、世界史の俯瞰に適した区分集合を確定する（オセアニアを独立区分にするか、東南アジアを独立区分にするか等）。確定版は research.md 決定 1 を参照
2. **後勝ち排他の reducer 設計**：既存 `SELECT_TERRITORY` の自動 `isInfoPanelOpen: true` を踏まえて、サマリー開閉と排他の動きを 1 つの状態機械にまとめる方法
3. **遷移帯の年代表記の動的更新**：年代切替時に領土詳細パネルが開いている場合、遷移帯ラベル「{year} 年の世界を見る」をどう更新するか
4. **Pipeline の era-summary 連携戦略**：Notion を一次ソースとし、`era-summary-sync` で取得・変換する流れ（既存 `territory-sync` と対称）。AI 一次生成は Notion 投入前のオフライン作業として分離
5. **データ未提供時の表示**（FR-007）：fallback UI の文言・既存パターン（`RoleErrorMessage`）の流用可否
6. **モバイル bottom-sheet との統合**：既存 `BottomSheet` コンポーネントが summary / territory どちらにも使われる際の制御フロー（同時に出ない・後勝ち排他を bottom-sheet レベルで担保するか、上位で担保するか）

## Phase 1: Design Outputs

- **`data-model.md`**：`EraSummary`、`RegionCard`、`EraSummaryReference` のフィールド定義・バリデーション・関係。AppState への追加プロパティ
- **`contracts/era-summary-data.md`**：`era-summaries/{year}.json` の JSON 構造仕様（フロントとパイプラインの間の契約）
- **`quickstart.md`**：開発者向けに「era-summaries データを 1 年分追加してパネルに反映する」までの最短手順

## Out of Plan Scope

- 領土詳細パネル `territory-info-panel` の根幹改修（既存機能の整理・refactor）。本 plan では遷移帯の追加のみ
- ホバー時のツールチップ表示（spec Out of Scope）
- 多言語対応・実行時 AI 生成（spec Out of Scope）
- CI/CD でのサマリーデータ自動更新パイプライン（spec Out of Scope）

## Post-Design Constitution Check

**Re-evaluated after Phase 1 (2026-05-07)**

| Principle | Posture | Notes |
|-----------|---------|-------|
| **I. Specification-Driven Change** | ✅ Conform | research.md / data-model.md / contracts/ にすべての設計判断を記録。spec の clarifications も更新済み |
| **II. Automated Quality Gates** | ✅ Conform | 新規追加コードは既存の Biome / Vitest / TypeScript gate でブロックされる。新規 contract（era-summary-data.md）の JSON Schema は将来の build-time validation 候補（plan 範囲外） |
| **III. Behavior-First Testing** | ✅ Conform | quickstart.md の手順 5 で必要なテスト（panel 表示、後勝ち排他遷移、参照リンク解決）を列挙。実装より先に書く |
| **IV. Consistent User Experience** | ✅ Conform | data-model.md の AppState 不変条件（`NOT (isSummaryPanelOpen AND isInfoPanelOpen)`）で「両方開きっぱなし」が観測不能になる。a11y は FR-010 + quickstart 手順 6 で網羅 |
| **V. Performance as a Budget** | ✅ Conform | 静的 JSON のため fetch + parse は ~100〜300ms 想定。SC-002（1 秒以内）に対し十分な余裕あり。bundle size は新規パネル 1 つ + 軽量 hook で既存 territory-info-panel と同等規模を維持 |

**Post-Design Constitution Check: PASS**（waiver なし、Complexity Tracking の追記不要）

Phase 2（`tasks.md`）への移行可能。
