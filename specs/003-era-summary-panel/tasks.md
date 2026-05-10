---

description: "Task list for 年代サマリーパネル feature implementation"
---

# Tasks: 年代サマリーパネル

**Input**: Design documents from `/specs/003-era-summary-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/era-summary-data.md, quickstart.md

**Tests**: Behavior-first tests are included per project constitution (Principle III)

**Organization**: Tasks are grouped by user story (US1=P1, US2=P2, US3=P3) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1/US2/US3); omitted for setup/foundational/polish
- All file paths are absolute from repository root

## Path Conventions

このプロジェクトは monorepo 構造：

- Frontend: `apps/frontend/src/`
- Pipeline: `apps/pipeline/src/`
- Static data: `apps/frontend/public/data/`
- Specs/docs: `specs/003-era-summary-panel/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: ディレクトリ作成・Pipeline CLI スキャフォールディング

- [x] T001 Create directory `apps/frontend/src/components/era-summary-panel/` with subdirectory `hooks/`
- [x] T002 Create directory `apps/frontend/src/domain/era-summary/`
- [x] T003 Add `era-summary-sync` case stub to `apps/pipeline/src/cli.ts` (route to new stage, no implementation yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全 user story の前提となるデータ基盤・状態管理・型定義

**⚠️ CRITICAL**: このフェーズが完了するまでどの user story も着手できない

### 2-A. Notion 一次ソースの整備（手作業）

- [x] T004 Notion 上に "Era Summary" データベースを作成し、`specs/003-era-summary-panel/contracts/era-summary-data.md` の Notion DB スキーマに従ってプロパティ（`Year` / `Region` / `Title` / `Context` / `References`）を設定する。`Region` の Select オプション 8 値を登録
- [x] T005 1Password に Notion DB ID を登録する：`op://dev/world-history-map-pipeline/era-summary-database-id`
- [x] T006 1650 年の代表データを Notion に投入（地域カード 6 件）。`specs/003-era-summary-panel/contracts/era-summary-data.md` の「サンプル：1650 年」を参照して各地域を 1 ページずつ作成

### 2-B. 型定義とデータローダ

- [x] T007 [P] Create `apps/frontend/src/domain/era-summary/types.ts` with `EraSummary`, `RegionCard`, `RegionId`, `EraSummaryReference` types per `specs/003-era-summary-panel/data-model.md`
- [x] T008 [P] Create `apps/frontend/src/domain/era-summary/load.ts` with `loadEraSummary(year)` returning `Promise<EraSummary | null>`. Returns `null` on 404, throws on parse failure
- [x] T009 [P] Create `apps/frontend/src/domain/era-summary/load.test.ts` covering: success / 404 → null / malformed JSON → throw

### 2-C. Pipeline sync 実装

- [x] T010 [P] Create `apps/pipeline/src/stages/sync-era-summaries.ts` modeled on `apps/pipeline/src/stages/sync-descriptions.ts`. Query Notion DB → group by `Year` → validate per contract → write `apps/frontend/public/data/era-summaries/{year}.json`
- [x] T011 Create `apps/pipeline/src/stages/sync-era-summaries.test.ts` with mocked Notion response covering: happy path / missing required field / invalid Region enum / malformed References JSON / duplicate Year×Region
- [x] T012 Wire `era-summary-sync` command in `apps/pipeline/src/cli.ts` to invoke `sync-era-summaries.ts` (replace stub from T003)

### 2-D. 初回 sync の実行（動作確認）

- [x] T013 Run `pnpm pipeline era-summary-sync` and verify `apps/frontend/public/data/era-summaries/1650.json` is generated and validates against the schema in `specs/003-era-summary-panel/contracts/era-summary-data.md`

### 2-E. AppState 拡張（後勝ち排他 reducer）

- [x] T014 Extend `apps/frontend/src/types/app-state.ts` with `isSummaryPanelOpen: boolean` field and update `initialAppState`. Add new actions `OPEN_SUMMARY` and `CLOSE_SUMMARY` to `AppStateActions` interface
- [x] T015 Update reducer in `apps/frontend/src/contexts/app-state-context.tsx`: implement `OPEN_SUMMARY` (sets `isSummaryPanelOpen: true`, `isInfoPanelOpen: false`, `selectedTerritory: null`) and `CLOSE_SUMMARY` (sets `isSummaryPanelOpen: false`). Update `SELECT_TERRITORY` to also set `isSummaryPanelOpen: false`
- [x] T016 Create `apps/frontend/src/contexts/app-state-context.test.tsx` (or update existing) verifying invariant `NOT (isSummaryPanelOpen AND isInfoPanelOpen)` across all action sequences

**Checkpoint**: Foundation ready. データフロー（Notion → JSON → frontend）と排他状態機械が動作する状態。User story 着手可能。

---

## Phase 3: User Story 1 - 同時代の世界概況を俯瞰する (Priority: P1) 🎯 MVP

**Goal**: 利用者が年代を選択したとき、その年代の世界全体の概況を地域別カードで俯瞰できる。年代切替に追従する

**Independent Test**: アプリを起動し（または `OPEN_SUMMARY` を dispatch して）サマリーパネルを表示。1650 年の地域別カードが表示される。年代セレクターを別の年に切り替えるとサマリー内容が（データがあれば）更新され、なければ「準備中」表示になる

### 実装

- [x] T017 [P] [US1] Create `apps/frontend/src/components/era-summary-panel/hooks/use-era-summary.ts` with signature `useEraSummary(year): { summary, isLoading, error }`. Uses `loadEraSummary` from T008
- [x] T018 [P] [US1] Create `apps/frontend/src/components/era-summary-panel/region-card.tsx` rendering one `RegionCard` (title + context). References rendering is deferred to US3
- [x] T019 [P] [US1] Create `apps/frontend/src/components/era-summary-panel/region-card.test.tsx` covering: title and context rendered / accepts an optional className
- [x] T020 [US1] Create `apps/frontend/src/components/era-summary-panel/era-summary-panel.tsx` rendering `useEraSummary(selectedYear)` result. Desktop variant: `<aside>` matching v2 mock styling (`bg-gray-700/95`, header with year + close button, scrollable region cards). Mobile variant: existing `BottomSheet` wrapper. Branch by `useIsMobile()`. Returns `null` when `!isSummaryPanelOpen`
- [x] T021 [US1] Mount `<EraSummaryPanel />` inside `apps/frontend/src/App.tsx` so it appears alongside other floating UI elements
- [x] T022 [US1] Implement empty state in `era-summary-panel.tsx`: when `summary === null` (FR-007), render placeholder with `role="status"` and message "この年代のサマリーは準備中です。" (per research.md decision 5)
- [x] T023 [US1] Implement loading state: when `isLoading`, render existing `RoleSpinner` component
- [x] T024 [US1] Implement error state: when `error`, render existing `RoleErrorMessage` component
- [x] T025 [US1] Create `apps/frontend/src/components/era-summary-panel/era-summary-panel.test.tsx` covering: renders title with selected year / renders region cards from data / shows empty state on null / shows loading on isLoading / updates content when year changes
- [x] T026 [P] [US1] Create `apps/frontend/src/components/era-summary-panel/era-summary-panel.stories.tsx` with stories: Default (1650 data), Empty (data missing), Loading, Error, Mobile

**Checkpoint**: US1 単独で MVP として成立。1650 年のサマリーが地図と並んで表示される

---

## Phase 4: User Story 2 - パネルの開閉とレイアウト共存 (Priority: P2)

**Goal**: 利用者がサマリーパネルを開閉でき、territory-info-panel との後勝ち排他が成立。デバイス別の初期状態が機能する

**Independent Test**: 開閉トリガーを操作してサマリーパネルが表示／非表示する。サマリー表示中に地図上の領土をクリック → 領土詳細が開きサマリーが閉じる（後勝ち排他）。逆も成立。デスクトップ初期は開、モバイル初期は閉

### 実装

- [x] T027 [P] [US2] Create `apps/frontend/src/components/era-summary-panel/summary-trigger.tsx` with two variants:
  - Desktop: rounded tab `bg-gray-700/95 px-3 py-2` with list-bullet SVG icon + "{year} 年の世界" text
  - Mobile: rounded-full FAB `px-4 py-2.5` with list-bullet SVG icon + "サマリー" text
  Both `dispatch(OPEN_SUMMARY)` on click. Returns `null` when `isSummaryPanelOpen`
- [x] T028 [P] [US2] Create `apps/frontend/src/components/era-summary-panel/summary-trigger.test.tsx` covering: desktop renders with year label / mobile renders compact / hidden when summary open / dispatches OPEN_SUMMARY on click / has `aria-label="サマリーを開く"`
- [x] T029 [US2] Update `apps/frontend/src/types/app-state.ts` to derive `isSummaryPanelOpen` initial value from device: desktop `true`, mobile `false`. Implement via `AppStateProvider` accepting `initialIsMobile` prop or computing inside provider using `useIsMobile()` (refactor as needed)
- [x] T030 [US2] Mount `<SummaryTrigger />` in `apps/frontend/src/App.tsx`. Desktop: top-left `absolute left-4 top-4 z-30`. Mobile: bottom-right `absolute bottom-20 right-4 z-30`. Branch by `useIsMobile()`
- [x] T031 [US2] Update `apps/frontend/src/contexts/app-state-context.test.tsx`: add scenarios verifying after-wins-exclusion when `SELECT_TERRITORY → OPEN_SUMMARY → SELECT_TERRITORY` cycles occur, and that initial state matches device
- [x] T032 [US2] Manual regression check: verify map zoom/pan and existing territory-info-panel still work with summary panel mounted (SC-003). Document findings in `quickstart.md` if needed

**Checkpoint**: パネルの開閉 UX が完成。デバイス別の初期状態と後勝ち排他が機能する

---

## Phase 5: User Story 3 - サマリーから個別領土への動線 (Priority: P3)

**Goal**: サマリー内の参照リンクから領土詳細・別年代へ遷移できる。領土詳細パネル内には常時サマリーへ戻る遷移帯がある（FR-011）

**Independent Test**: 1650 年サマリー内の「フランス」リンクをクリック → 領土詳細パネル（フランス）が開く（サマリーは閉じる）。領土詳細パネルの上端「1650 年の世界を見る」をクリック → サマリーが再表示される。サマリー内の年代リンクをクリック → 地図がその年代に切り替わる

### 実装

- [x] T033 [P] [US3] Create `apps/frontend/src/components/era-summary-panel/summary-references.tsx`. Given `context: string` and `references: EraSummaryReference[]`, render the text with each `text` occurrence wrapped in an `<a>` (or `<button>` for non-navigation semantics). Click handlers: `kind === "territory"` → `dispatch(SELECT_TERRITORY, target)`; `kind === "year"` → `dispatch(SET_SELECTED_YEAR, target)`. Underline styling per v2 mock (`underline decoration-gray-500 underline-offset-2 hover:decoration-white`)
- [x] T034 [P] [US3] Create `apps/frontend/src/components/era-summary-panel/summary-references.test.tsx` covering: text renders verbatim when no references / first occurrence wrapped per reference / unmatched `text` rendered without link / territory click dispatches SELECT_TERRITORY / year click dispatches SET_SELECTED_YEAR
- [x] T035 [US3] Update `apps/frontend/src/components/era-summary-panel/region-card.tsx` to use `summary-references.tsx` for context rendering when `references` is non-empty
- [x] T036 [US3] Create `apps/frontend/src/components/territory-info/summary-nav-strip.tsx` rendering a full-width button with list-bullet SVG icon + "{year} 年の世界を見る" label (year from `useAppState().state.selectedYear`, formatted via existing year-display formatter). On click `dispatch(OPEN_SUMMARY)`. Styling per v2 mock final layout: same row as close button, `flex-1 min-w-0 truncate` for label, `border-b border-gray-600` on parent row container
- [x] T037 [US3] Update `apps/frontend/src/components/territory-info/territory-info-panel.tsx` to render `<SummaryNavStrip />` at the top. **Existing `PanelHeader` から `<CloseButton>` を削除し、SummaryNavStrip と同じ行（最右上）に統合する**。タイトル行は `<h2>` + 副題のみ。レイアウトは `flex items-stretch` の親 `<div>` に nav strip（`flex-1 min-w-0`）+ close（`shrink-0`）+ 共通の `border-b border-gray-600` で構成。Apply to both Desktop `PanelWrapper` and Mobile `BottomSheet` variants（モバイルでは `BottomSheet` の `header` prop に渡される構造内で同じ統合を行う）
- [x] T038 [US3] Create `apps/frontend/src/components/territory-info/summary-nav-strip.test.tsx` covering: renders with selected year label / dispatches OPEN_SUMMARY on click / has `aria-label` for screen readers / handles year switch (label updates)
- [x] T039 [US3] Update `apps/frontend/src/components/territory-info/territory-info-panel.test.tsx`: verify (a) nav strip is rendered, (b) close button is in nav strip row, (c) title row no longer contains close button, (d) **年代切替時に nav-strip ラベルと領土詳細本文（`useTerritoryDescription(year)` 由来）の両方が新しい年代に追従する**（spec Edge Case「領土詳細パネル表示中に年代を切り替えた場合の更新挙動」を担保）

**Checkpoint**: 「俯瞰 → 詳細 → 俯瞰」の往復が 1 タップずつで完結。全 user story の機能が成立

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 制約原則の達成確認と living documentation の更新

- [x] T040 [P] Accessibility audit per FR-010: keyboard-only navigation through summary panel, summary trigger, references, summary nav strip, close buttons. Verify `role="dialog"` + `aria-labelledby` for both panels, `aria-label` on icon-only buttons, focus visible on all clickable elements. Document findings; fix issues in respective component files
- [x] T041 [P] Performance check covering (a) SC-002：`useEraSummary` を計装し、年代切替 → render 完了までの体感待ち時間を typical broadband で測定（< 1s 確認）、(b) パネルの開閉アニメーションが 60 fps を維持することを Chrome DevTools Performance タブで確認、(c) bundle size の増加が plan.md Constraints の +10KB 上限を超えていないことを `pnpm build` 後の dist サイズで比較。結果を `apps/frontend/docs/performance.md` または feature notes に記録
- [x] T042 Run `pnpm test && pnpm check && pnpm typecheck` from repo root and ensure all gates pass (Constitution Principle II)
- [x] T043 Walk through `specs/003-era-summary-panel/quickstart.md` end-to-end (steps 1〜6) and update any drift between docs and actual behavior
- [x] T044 Update `docs/frontend.md` per project constitution Principle "Living Documentation": add EraSummaryPanel to the component catalog, document the after-wins-exclusion state machine, reference the new pipeline subcommand `era-summary-sync`. Add link to `era-summaries/` data path
- [x] T045 [P] Update `apps/frontend/src/components/era-summary-panel/era-summary-panel.stories.tsx` and `apps/frontend/src/components/territory-info/territory-info-panel.stories.tsx` (if exists) with the new mobile/desktop variants
- [x] T046 [P] Layout verification per SC-004: confirm map center area remains visible at viewport widths 360px (mobile portrait) and 1280px+ (desktop) when summary panel and/or territory-info-panel are open. Use Storybook viewport addon (`mobile1` / `desktop` viewports) or browser DevTools manual check across `apps/frontend/src/components/era-summary-panel/era-summary-panel.stories.tsx`

---

## Dependencies

### Phase ordering

```
Phase 1 (Setup) ─→ Phase 2 (Foundational) ─→ Phase 3 (US1) ─→ Phase 4 (US2) ─→ Phase 5 (US3) ─→ Phase 6 (Polish)
                                            └─ Phase 4 and 5 can begin once Phase 3 is complete; they touch
                                               distinct files and can be developed in parallel by 2 contributors
```

### Within each phase

- **Phase 2 internal**: T004→T005→T006 (Notion setup is sequential). T007/T008/T009 are independent ([P]). T010 **must be preceded by failing test T011** (write failing Notion-mock test first, then sync impl). T012 depends on T010. T013 depends on T004–T012 all done. T015 **must be preceded by failing test T016** (write failing reducer invariant test first, then update reducer). T014 depends on no test (type-only addition).
- **Phase 3 (US1)**: T017/T018/T019 are independent ([P]). T020 **must be preceded by failing test T025** (write failing panel render/year-switch tests first, then impl). T022/T023/T024 are state branches added during T020 impl. T021 depends on T020. T026 depends on T020.
- **Phase 4 (US2)**: T027/T028 are independent ([P]). T029/T030 **must be preceded by failing test T031** (write failing exclusion/initial-state tests first, then impl). T032 is manual verification, last in phase.
- **Phase 5 (US3)**: T033/T034/T036/T038 can run in parallel. T035 depends on T033. T037 **must be preceded by failing test T039** (write failing nav-strip + year-switch follow-through tests first, then territory-info-panel改修 impl).

> **Behavior-First Testing (Constitution III)**: Task ID 順は識別の便宜であり実行順ではない。`*.test.*` task は対応する impl task より **前** に書かれた失敗テストとして存在することが Constitution III の MUST 要件。CI / レビューでこの順序が破られていれば差し戻し対象。

### Story-level independence verification

- US1 alone: User can see era summary panel with region cards for 1650, year switch updates content. Trigger UX is rough (default open or no trigger), but core value delivered. **MVP candidate**.
- US2 atop US1: Adds polished open/close UX, device-aware initial state, and exclusion semantics.
- US3 atop US2: Adds reference links and back-to-summary nav strip. "俯瞰 → 詳細 → 俯瞰" flow complete.

## Parallel execution opportunities per story

### Phase 2 (Foundational)

実行可能な並列バッチ：
- バッチ A：[T007, T008, T010]（domain types / load / pipeline stage を独立に着手可能）
- T009 は T008 完了後
- T011, T012 は T010 完了後

### Phase 3 (US1)

実行可能な並列バッチ：
- バッチ A：[T017, T018, T019]（hook / region-card / region-card test を独立に着手）
- T020 はバッチ A 完了後
- T026 は T020 完了後（並列で T021〜T025 と進められる）

### Phase 5 (US3)

実行可能な並列バッチ：
- バッチ A：[T033, T034, T036, T038]（references components + nav-strip components が独立）
- T035, T037, T039 は依存先タスク完了後

### Phase 6 (Polish)

実行可能な並列バッチ：
- バッチ A：[T040, T041, T045]（a11y / performance / storybook が独立）

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 + Phase 2 完了で **データフロー end-to-end が通る**
2. Phase 3 完了で **1 機能スライスが価値を提供**：1650 年のサマリーが見える、年代切替が機能
3. この時点で deploy 可能。残りの user story は incremental に追加

### Incremental delivery

- **MVP（Phase 3 完了）**: サマリーパネル表示 + 年代追従 + データ未提供時の fallback
- **+ US2（Phase 4 完了）**: 開閉 trigger、デバイス別初期状態、territory との排他
- **+ US3（Phase 5 完了）**: 参照リンク、領土詳細パネル内の遷移帯（FR-011）
- **+ Polish（Phase 6 完了）**: a11y / 性能 / 既存機能 regression なし / docs 更新

### Tests strategy

- Foundational：domain types / load / sync の単体テスト（T009, T011, T016）
- Per US：コンポーネントのレンダリング・イベント・state 反映を `*.test.tsx` で検証（既存 territory-info パターン踏襲）
- Polish：手動 a11y 監査、performance 計測、constitution gate（`pnpm test && pnpm check && pnpm typecheck`）

## Validation checklist

- [x] All tasks follow strict format `- [ ] [TaskID] [P?] [Story?] Description with file path`
- [x] Each user story has Independent Test criteria (US1/US2/US3)
- [x] MVP scope identified (US1)
- [x] All file paths absolute or unambiguous from repo root
- [x] Parallel opportunities marked with [P] for independent files
- [x] Dependencies graph shows incremental delivery path
- [x] Constitution principles addressed (II in Phase 6, III throughout, IV in US3 + Polish, V in Polish)
