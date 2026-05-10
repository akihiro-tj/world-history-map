---

description: "Task list for camera fit on territory select feature implementation"
---

# Tasks: Camera Fit on Territory Select

**Input**: Design documents from `/specs/241-camera-fit-on-territory-select/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/territory-feature-bbox.md, quickstart.md

**Tests**: Behavior-first tests are included per project constitution (Principle III)

**Organization**: Tasks are grouped by user story (US1/US2 = P1, US3 = P2, US4 = P3) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1/US2/US3/US4); omitted for Setup / Foundational / Polish
- All file paths are absolute from repository root

## Path Conventions

このプロジェクトは monorepo 構造：

- Frontend: `apps/frontend/src/`
- Pipeline: `apps/pipeline/src/`
- Static tile artifacts: `packages/tiles/src/`
- Living docs: `docs/`
- Specs: `specs/241-camera-fit-on-territory-select/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 全ストーリーで参照する小さな定数追加。実装変更を伴わないため独立実行可能。

- [X] T001 [P] `apps/frontend/src/styles/map-style.ts` の `MAP_CONFIG` に `MAX_FIT_ZOOM = 5` を追加する

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pipeline → Frontend のデータ契約と純関数ユーティリティを確立する。全ユーザーストーリーがこのフェーズの完了を前提とする。

**⚠️ CRITICAL**: 本フェーズが完了するまで User Story 実装は開始できない。

### Tests for Foundational (Behavior-First)

- [X] T002 [P] `apps/pipeline/src/tiles/merge.test.ts` に `computeMainBbox` の失敗テストを追加する（最大ポリゴンの bbox 算出 + antimeridian 越えの正規化。ケース：単一 Polygon / 飛び地を含む MultiPolygon / 主要ポリゴンが antimeridian をまたぐケース）
- [X] T003 [P] `apps/pipeline/src/tiles/merge.test.ts` に `mergeByName` の Feature.properties 出力に対する失敗テストを追加する（`BBOX_W` / `BBOX_S` / `BBOX_E` / `BBOX_N` / `BBOX_AM` が常に存在し、`contracts/territory-feature-bbox.md` の不変条件を満たすこと）
- [X] T004 [P] `apps/frontend/src/domain/territory/territory-bounds.test.ts` に `parseFeatureBounds` の失敗テストを追加する（正常系 / antimeridian 透過 / プロパティ欠損 / 数値以外 / 値域外）

### Implementation for Foundational

- [X] T005 `apps/pipeline/src/tiles/merge.ts` に `computeMainBbox(largestPoly)` ヘルパーを実装する（`turf.bbox` + research R2 のギャップ検出による antimeridian 正規化）
- [X] T006 `apps/pipeline/src/tiles/merge.ts` の `mergeByName` を拡張し、`computeMainBbox(largestPoly)` を呼んで `BBOX_W` / `BBOX_S` / `BBOX_E` / `BBOX_N` / `BBOX_AM` を `mergedFeature.properties` に書き込む。同 5 キーを `KEPT_PROPERTIES` セットにも追加する
- [X] T007 [P] `apps/frontend/src/domain/territory/territory-bounds.ts` に `TerritoryBounds` 型と `parseFeatureBounds(properties)` を data-model §1 に従って実装する
- [X] T008 動作確認用の代表年（1300 / 1500 / 1600 / 1820 / 1900）について `pnpm pipeline run --year 1300`, `--year 1500`, `--year 1600`, `--year 1820`, `--year 1900` を実行して PMTiles を再生成する（再ハッシュと `manifest.ts` 更新は `predev` で自動）

**Checkpoint**: Foundation ready — pipeline が bbox 契約を出力し、frontend がそれを解釈できる状態になる。

---

## Phase 3: User Story 1 — Desktop visibility (Priority: P1) 🎯 MVP

**Goal**: Desktop ビューポートで領土をクリックしたとき、`TerritoryInfoPanel` の右側可視領域に対象領土の本土がフィット表示される。

**Independent Test**: 幅 1024px 以上で 1600 年フランス王国・1500 年ヴェネツィア共和国・1900 年アメリカ合衆国（飛び地ケース）をクリックし、いずれもパネル背後に隠れず可視領域中央付近に収まることを目視確認（quickstart §5.1）。

### Tests for User Story 1 (Behavior-First) ⚠️

> **NOTE**: 実装より先にこれらのテストを書き、failing を確認してから実装に着手すること。

- [X] T009 [P] [US1] `apps/frontend/src/hooks/use-prefers-reduced-motion.test.ts` に `usePrefersReducedMotion` の失敗テストを追加する（初期値 / `change` イベントによる切替）
- [X] T010 [P] [US1] `apps/frontend/src/components/map/hooks/use-panel-padding.test.tsx` に `usePanelPadding` の Desktop 分岐の失敗テストを追加する（`useIsMobile()===false` のとき `{top:24, right:24, bottom:24, left:416}` を返す / `window` リサイズに追随する）
- [X] T011 [P] [US1] `apps/frontend/src/components/map/hooks/use-camera-fit-on-selection.test.tsx` に `useCameraFitOnSelection` の失敗テストを追加する。観点：(a) 選択発火で `fitBounds` が一度だけ呼ばれ、引数に解析した bounds + Desktop padding + `MAX_FIT_ZOOM` が含まれる、(b) 同一選択のまま `selectedYear` が変化したら再フィット、(c) `selectedTerritory → null` のときは `fitBounds` を呼ばない、(d) `prefers-reduced-motion: reduce` のとき `duration: 0` が渡される、(e) 初回 `querySourceFeatures` が空配列を返した場合 `sourcedata` イベントで一度だけ再試行する、(f) antimeridian 越えの bounds（`east > 180`）がそのまま渡される、(g) 2 連続選択（territory A → 直後に B）で `fitBounds` が 2 度呼ばれ、2 度目の引数が territory B 由来の bounds であること（最後の選択に収束する FR-011 の保証）

### Implementation for User Story 1

- [X] T012 [P] [US1] `apps/frontend/src/hooks/use-prefers-reduced-motion.ts` に `usePrefersReducedMotion` を実装する（既存 `useIsMobile` の matchMedia パターンを踏襲）
- [X] T013 [US1] `apps/frontend/src/components/map/hooks/use-panel-padding.ts` に `usePanelPadding` を実装する（Desktop 分岐 + Mobile 分岐の両方を含む。Mobile 分岐は US2 のテストで検証）
- [X] T014 [US1] `apps/frontend/src/components/map/hooks/use-camera-fit-on-selection.ts` に `useCameraFitOnSelection` を実装する。`state.activePanel.selectedTerritory` と `state.selectedYear` を観測し、`null` ガード後に `mapRef.getMap().querySourceFeatures(...)` を呼び、`parseFeatureBounds` で解釈、空のときは `sourcedata` イベントで一度再試行、最後に `usePanelPadding()` と `MAP_CONFIG.MAX_FIT_ZOOM` と `usePrefersReducedMotion` 由来の `duration` を渡して `fitBounds` を呼ぶ
- [X] T015 [US1] `apps/frontend/src/components/map/map-view.tsx` に `useCameraFitOnSelection(mapRef)` の呼び出しを追加する（既存 `usePMTilesProtocol` などの並びに配置。`state.mapView` には触れない）

**Checkpoint**: quickstart §5.1 の Desktop シナリオ（小さな領土 / オフセンター / 大領土 / 飛び地 / antimeridian / 連続選択 / パネル close）がすべて期待通り動作する。

---

## Phase 4: User Story 2 — Mobile visibility (Priority: P1)

**Goal**: Mobile ビューポートで領土をタップしたとき、`BottomSheet`（half snap）より上の可視領域に対象領土の本土がフィット表示される。

**Independent Test**: 幅 768px 未満で 1900 年オーストラリア・1820 年アルゼンチンをタップし、領土が BottomSheet に重ならない上部領域に収まることを目視確認（quickstart §5.2）。

### Tests for User Story 2 (Behavior-First) ⚠️

- [X] T016 [P] [US2] `apps/frontend/src/components/map/hooks/use-panel-padding.test.tsx` に Mobile 分岐の失敗テストを追加する。`useIsMobile()===true` のとき `{top:16, right:16, bottom: window.innerHeight*0.4 + 16, left:16}` を返す / ビューポート高さの変化に追随する / BottomSheet snap の状態変化は無視する（FR-010）
- [X] T017 [P] [US2] `apps/frontend/src/components/map/hooks/use-camera-fit-on-selection.test.tsx` に Mobile 経路の失敗テストを追加する。`useIsMobile()===true` のとき `fitBounds` に渡される padding が Mobile 形状であること

**Checkpoint**: quickstart §5.2 の Mobile シナリオ（南半球選択 / シート拡縮で再フィットしない / 南米南部選択）がすべて期待通り動作する。

---

## Phase 5: User Story 3 — Programmatic selection triggers fit (Priority: P2)

**Goal**: 地図クリック以外（年代サマリーパネル / `SummaryNavStrip` / 将来の URL 復元など）で領土が選択された際も、地図クリックと同等のフィット挙動になる。

**Independent Test**: 領土が未選択の状態から `actions.selectTerritory(name)` を直接 dispatch し、対象領土に対して `fitBounds` が一度だけ呼ばれることをテストで確認。

### Tests for User Story 3 (Behavior-First) ⚠️

- [X] T018 [P] [US3] `apps/frontend/src/components/map/hooks/use-camera-fit-on-selection.test.tsx` に失敗テストを追加する。クリックイベントを介さずに `selectTerritory` を dispatch して `fitBounds` が解析した bounds を引数に呼ばれること（選択経路で実装が分岐していないことを保証）

**Checkpoint**: US3 受入シナリオがテストで合格する（実装は US1 で完成済みのため新規実装タスクなし）。

---

## Phase 6: User Story 4 — Closing panel keeps camera (Priority: P3)

**Goal**: ユーザーが情報パネルを閉じても、カメラ位置・ズームは選択時に移動した状態を維持する。

**Independent Test**: 領土を選択して `fitBounds` を発火させた後、`actions.clearSelection()` を dispatch し、`fitBounds` がそれ以上呼ばれず、MapLibre インスタンスの `getCenter()` / `getZoom()` が変化しないことをテストで確認。

### Tests for User Story 4 (Behavior-First) ⚠️

- [X] T019 [P] [US4] `apps/frontend/src/components/map/hooks/use-camera-fit-on-selection.test.tsx` に失敗テストを追加する。選択 → フィット → `clearSelection` の遷移をシミュレートし、`fitBounds` モックが二度目に呼ばれず、`null` 遷移によるカメラ変更も発生しないことを検証する

**Checkpoint**: US4 受入シナリオがテストで合格する（実装は US1 のガード節で完成済みのため新規実装タスクなし）。

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 性能予算、a11y、living documentation、quality gates の最終確認。

- [X] T020 [P] Desktop の dev ビルドで quickstart §7 に従い SC-003（クリックからカメラ停止までが 800ms 以内）を手動計測する
- [X] T021 [P] quickstart §5.3 に従い `prefers-reduced-motion: reduce` の挙動（アニメーションなし、即座にジャンプ）を手動確認する
- [X] T022 [P] Desktop と Mobile（Responsive モード）で quickstart §5.1 / §5.2 の代表シナリオをひと通り通し、既存のクリック・パネル開閉・年代切替に regression がないことを目視確認する
- [X] T023 リポジトリルートで `pnpm test && pnpm check && pnpm typecheck` を実行し、すべての gate が通ることを確認する
- [X] T024 `docs/frontend.md` に新しいカメラフィット挙動を追記する（map / interaction セクションに短いサブセクションを追加し、それ以外は変更しない）
- [X] T025 [P] `docs/pipeline.md` に `mergeByName` が出力する `BBOX_W` / `BBOX_S` / `BBOX_E` / `BBOX_N` / `BBOX_AM` Feature プロパティを追記する（`specs/241-camera-fit-on-territory-select/contracts/territory-feature-bbox.md` を参照リンクとして付ける）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし、即時開始可
- **Foundational (Phase 2)**: Setup 完了後。全 User Story の前提（特に T008 のタイル再生成は frontend 動作確認の前提）
- **User Stories (Phase 3+)**: Foundational 完了後。US1 完了で実装の大半が完成し、US2/US3/US4 は主に追加テスト
- **Polish (Phase 7)**: 全 User Story 完了後

### User Story Dependencies

- **US1 (P1, Desktop)**: Foundational 完了後即時開始可。MVP 最小単位
- **US2 (P1, Mobile)**: T013 (`usePanelPadding`) と T014 (`useCameraFitOnSelection`) の完了後に実行可（追加テスト中心）。実装ファイル共有のため US1 と直列推奨
- **US3 (P2, Programmatic)**: T014 完了後即時。テストのみ
- **US4 (P3, Panel close)**: T014 完了後即時。テストのみ

### Within Each User Story

- 実装より先にテストを書き、failing を確認してから実装に着手（Constitution III）
- 同一ファイルを編集するタスクは [P] マーカー無し
- 異なるファイルを触るタスクは [P] で並列可

### Parallel Opportunities

- **Phase 2**: T002 / T003 / T004 / T007 は別ファイルのため並列実行可。T005 と T006 は同 `merge.ts` を編集するため直列。T008 は I/O 待ちのため他フェーズと並列可
- **Phase 3**: T009 / T010 / T011 / T012 は別ファイルのため並列実行可。T013 / T014 / T015 は依存関係あり直列
- **Phase 4**: T016 / T017 は別ファイルのため並列。新規実装タスクは無し
- **Phase 7**: T020 / T021 / T022 / T025 は手動確認 / 別ファイルで並列。T023 / T024 は他作業の完了後

---

## Parallel Example: Phase 2 Foundational

```bash
# 失敗テストを並列で書く（別ファイル単位）：
Task: "apps/pipeline/src/tiles/merge.test.ts に computeMainBbox の失敗テスト"
Task: "apps/pipeline/src/tiles/merge.test.ts に mergeByName の Feature.properties 失敗テスト"
Task: "apps/frontend/src/domain/territory/territory-bounds.test.ts に parseFeatureBounds の失敗テスト"
# (上 2 本は同 merge.test.ts のため直列にすること)

# テストが揃ったら実装：
Task: "apps/frontend/src/domain/territory/territory-bounds.ts に parseFeatureBounds を実装"
Task: "apps/pipeline/src/tiles/merge.ts に computeMainBbox を実装し mergeByName を拡張"
```

## Parallel Example: User Story 1

```bash
# 失敗テストを並列で用意（別ファイル）：
Task: "apps/frontend/src/hooks/use-prefers-reduced-motion.test.ts に失敗テスト"
Task: "apps/frontend/src/components/map/hooks/use-panel-padding.test.tsx に Desktop 失敗テスト"
Task: "apps/frontend/src/components/map/hooks/use-camera-fit-on-selection.test.tsx に失敗テスト"

# 並列で実装可能なもの：
Task: "apps/frontend/src/hooks/use-prefers-reduced-motion.ts を実装"
# 続いて直列 (依存)：
# usePanelPadding → useCameraFitOnSelection → MapView 統合
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

両方とも P1 のため、ミニマムリリースは US1 と US2 の両方を含む。順序：

1. Setup (Phase 1)
2. Foundational (Phase 2) — pipeline 拡張・タイル再生成
3. US1 (Phase 3) — Desktop の主要動線完成
4. US2 (Phase 4) — Mobile の確認テスト追加（実装は US1 で完了済み）
5. **STOP and VALIDATE**: Desktop / Mobile 両方で quickstart §5 のシナリオを目視確認
6. Deploy / merge if ready

### Incremental Delivery

1. Setup + Foundational → bbox を持つタイル + parser が揃う
2. US1 → Desktop で本機能が動く（MVP の半分）
3. US2 → Mobile で動くことを保証（MVP の残り）
4. US3 → 非クリック経路でも動くことを保証
5. US4 → パネル close 時にカメラを動かさないことを保証
6. Polish → docs sync + quality gates

各ステップで quickstart の対応シナリオが通ることを確認しながら進める。

---

## Notes

- [P] tasks = 別ファイル、依存なし
- [Story] label = どの user story に紐付くかのトレーサビリティ
- 各 user story は独立して完了・テスト可能（US2/US3/US4 はテストのみで成立する点に注意）
- 実装より先にテストを書き、failing を確認してから実装（Constitution III. Behavior-First Testing）
- 各タスクまたは論理的グループの完了後に commit する（Conventional Commits + Co-Authored-By: Claude）
- Checkpoint で停止して quickstart の対応シナリオを目視確認すること
- `pnpm test && pnpm check && pnpm typecheck` を merge 前に必ず通す（Constitution II. Automated Quality Gates）
- `docs/` 系の更新は merge 前に完了させる（Constitution IV. Living Documentation）
