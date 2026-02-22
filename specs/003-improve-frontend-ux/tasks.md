# タスク: フロントエンド情報設計・UX改善

**入力**: `/specs/003-improve-frontend-ux/` の設計ドキュメント
**前提**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**テスト**: quickstart.md で指定されたTDDワークフローに従い含める。

**構成**: 各ユーザーストーリーごとにタスクをグループ化し、ストーリー単位での独立した実装・テストを可能にする。

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[Story]**: タスクが属するユーザーストーリー（例: US1, US2, US3）
- 説明には正確なファイルパスを含める

## パス規約

- **モノレポ**: `apps/frontend/src/`（フロントエンドワークスペース）

---

## Phase 1: セットアップ（共通基盤）

**目的**: 複数のユーザーストーリーで使用する共有ユーティリティの抽出と基盤フックの作成

- [x] T001 `formatYear()` を `apps/frontend/src/components/year-selector/year-selector.tsx` から `apps/frontend/src/utils/format-year.ts` に抽出し、year-selector のインポートを更新
- [x] T002 [P] `useIsMobile` フックを `apps/frontend/src/hooks/use-is-mobile.ts` に作成 — `window.matchMedia('(max-width: 767px)')` と change イベントリスナーを使用
- [x] T003 [P] `useIsMobile` の単体テストを `apps/frontend/src/hooks/use-is-mobile.test.ts` に作成
- [x] T004 [P] `formatYear` の単体テストを `apps/frontend/src/utils/format-year.test.ts` に作成

---

## Phase 2: 基盤（ブロッキング前提条件）

**目的**: ブロッキングタスクなし — すべてのユーザーストーリーは独立したコンポーネントで動作し、既存の `AppState` に必要なフィールド（`selectedYear`, `selectedTerritory`, `isInfoPanelOpen`）がすべて揃っている。各ストーリーは Phase 1 完了後に開始可能。

**チェックポイント**: Phase 1 のユーティリティ準備完了 — ユーザーストーリーの並列実装を開始可能

---

## Phase 3: User Story 1 — 現在の年代を常に把握できる (Priority: P1) 🎯 MVP

**ゴール**: 画面上部中央に現在の年代を目立つように常設表示し、年代切替時にフェードアニメーションで更新する

**独立テスト**: 地図を開いて年代セレクターで年代を切り替えた時、画面上部中央の年代表示がフェードアウト→フェードイン（合計200-300ms）で更新される。紀元前の年代は「前200」形式で表示される。

### US1 のテスト

> **注意: テストを先に書き、実装前に失敗することを確認する**

- [x] T005 [P] [US1] `YearDisplay` コンポーネントの単体テストを `apps/frontend/src/components/year-display/year-display.test.tsx` に作成 — フォーマット済み年代の描画、`aria-live="polite"`、フェードアニメーションの状態遷移、高速な年代切替の処理をテスト

### US1 の実装

- [x] T006 [US1] `YearDisplay` コンポーネントを `apps/frontend/src/components/year-display/year-display.tsx` に作成 — `useEffect` ベースのフェードアウト→フェードイン（150ms+150ms）アニメーション、スクリーンリーダー通知用の `aria-live="polite"` を含む画面上部中央の年代表示
- [x] T007 [US1] `YearDisplay` を `apps/frontend/src/App.tsx` に統合 — `absolute top-4 left-1/2 -translate-x-1/2 z-20` で地図の上に配置、視覚的に目立つ大きなフォントサイズ

**チェックポイント**: 年代表示が表示され、正しくフォーマットされ（紀元前を含む）、年代切替時にアニメーションする

---

## Phase 4: User Story 2 — コントロールボタンが整理されている (Priority: P1)

**ゴール**: 投影法切替・ライセンスボタン・GitHubリンクを画面右上の統合 ControlBar にグループ化し、すべてのブレイクポイントで一貫した位置を維持

**独立テスト**: デスクトップ（1024px以上）とモバイル（375px）の両方で画面右上に3つのコントロールがグループ化されていることを確認。リサイズしてもグループの位置は移動しない。

### US2 のテスト

> **注意: テストを先に書き、実装前に失敗することを確認する**

- [x] T008 [P] [US2] `ControlBar` コンポーネントの単体テストを `apps/frontend/src/components/control-bar/control-bar.test.tsx` に作成 — 投影法切替・ライセンスボタン・GitHubリンクが描画されること、`onOpenLicense` コールバックが発火することをテスト

### US2 の実装

- [x] T009 [US2] `ControlBar` コンポーネントを `apps/frontend/src/components/control-bar/control-bar.tsx` に作成 — `ProjectionToggle`、ライセンスボタン（情報アイコン）、GitHubリンクをグループ化。控えめなアイコンスタイル（`text-white/60`）、`flex-col gap-2` レイアウト、`absolute right-4 top-4 z-20` 配置
- [x] T010 [US2] `apps/frontend/src/App.tsx` をリファクタリング — インラインの `<footer>` を `<ControlBar>` に置換し、`onOpenLicense` コールバックを渡す。インラインのライセンス/GitHubボタンを削除
- [x] T011 [US2] `apps/frontend/src/components/map/map-view.tsx` をリファクタリング — `<ProjectionToggle>` の描画を削除し、`projection`/`setProjection` 状態を `App.tsx` にリフトアップするか props で渡して `ControlBar` が使用できるようにする

**チェックポイント**: すべてのコントロールが右上にグループ化され、すべてのビューポート幅で一貫した位置。控えめなビジュアルスタイルが適用されている

---

## Phase 5: User Story 3 — 選択中の領土がマップ上で分かる (Priority: P2)

**ゴール**: 選択中の領土をマップ上で白色アウトライン（3.5px）と半透明白フィル（opacity 0.15）でハイライト表示する

**独立テスト**: 領土をクリック — 白色アウトラインと薄いフィルオーバーレイが表示される。別の領土をクリック — ハイライトが移動する。パネルを閉じる — ハイライトが消える。

### US3 のテスト

> **注意: テストを先に書き、実装前に失敗することを確認する**

- [x] T012 [P] [US3] `TerritoryHighlightLayer` コンポーネントの単体テストを `apps/frontend/src/components/map/territory-highlight-layer.test.tsx` に作成 — 2つの `<Layer>` コンポーネント（fill + line）が正しいフィルター式 `['==', ['get', 'NAME'], selectedTerritory]` とペイントプロパティで描画されることをテスト

### US3 の実装

- [x] T013 [US3] `TerritoryHighlightLayer` コンポーネントを `apps/frontend/src/components/map/territory-highlight-layer.tsx` に作成 — react-map-gl の `<Layer>` コンポーネントを2つ描画: `territory-highlight-fill`（白、opacity 0.15）と `territory-highlight-outline`（白ライン、3.5px幅）。NAME プロパティでフィルタリング、`territory-fill` と `territory-label` レイヤーの間に配置
- [x] T014 [US3] `TerritoryHighlightLayer` を `apps/frontend/src/components/map/map-view.tsx` に統合 — `state.selectedTerritory` が非 null の場合に `<Source>` 内で条件付き描画し、`sourceId`、`sourceLayer`、`selectedTerritory` props を渡す

**チェックポイント**: 領土選択時にハイライトが正しく描画され、再選択時に移動し、パネルクローズ時および年代切替時に領土が存在しない場合に消える

---

## Phase 6: User Story 4 — 初回訪問時の操作ガイダンス (Priority: P3)

**ゴール**: 初回訪問時にガイダンスメッセージ付きのオンボーディングヒントトーストを表示。10秒後に自動非表示。非表示状態を localStorage に永続化

**独立テスト**: localStorage をクリアしてアプリを開く — 画面下部にヒントトーストが表示される。閉じるか10秒待つ — 消える。リロード — ヒントは表示されない。

### US4 のテスト

> **注意: テストを先に書き、実装前に失敗することを確認する**

- [x] T015 [P] [US4] `useOnboardingHint` フックの単体テストを `apps/frontend/src/hooks/use-onboarding-hint.test.ts` に作成 — localStorage の読み書き、自動非表示タイマー（10秒）、`dismiss()` コールバック、localStorage が利用不可時のグレースフルデグラデーションをテスト
- [x] T016 [P] [US4] `OnboardingHint` コンポーネントの単体テストを `apps/frontend/src/components/onboarding-hint/onboarding-hint.test.tsx` に作成 — 表示状態、閉じるボタン、フェードイン/フェードアウトアニメーション、メッセージ内容をテスト

### US4 の実装

- [x] T017 [US4] `useOnboardingHint` フックを `apps/frontend/src/hooks/use-onboarding-hint.ts` に作成 — マウント時に localStorage キー `"world-history-map:hint-dismissed"` をチェック、`isVisible` と `dismiss()` を公開、10秒自動非表示タイマーをクリーンアップ付きで管理、localStorage エラーをキャッチ
- [x] T018 [US4] `OnboardingHint` コンポーネントを `apps/frontend/src/components/onboarding-hint/onboarding-hint.tsx` に作成 — 画面下部中央のトースト（年代セレクターの上）、ヒントメッセージ（「領土をクリックして詳細を見る」/「下部で年代を切り替え」）を表示、閉じるボタン、フェードイン/フェードアウトアニメーション
- [x] T019 [US4] `OnboardingHint` を `apps/frontend/src/App.tsx` に統合 — `<main>` 内に `<OnboardingHint />` を描画、年代セレクターと他のUI要素の間のz-indexレイヤリングを確保

**チェックポイント**: 初回訪問時にオンボーディングヒントが表示され、正しく非表示になり、セッション間で永続化される

---

## Phase 7: User Story 5 — モバイルでの情報パネルが使いやすい (Priority: P3)

**ゴール**: モバイル（768px未満）で領土情報をスワイプクローズ可能なボトムシートとして表示し、デスクトップではサイドパネルを維持する

**独立テスト**: モバイル幅（375px）で領土をクリック — パネルが下部からスライドアップ（60dvh）。ハンドルを下方向にスワイプ — 閉じる。デスクトップ幅（1024px）— サイドパネルとして表示（既存動作）。

### US5 のテスト

> **注意: テストを先に書き、実装前に失敗することを確認する**

- [x] T020 [P] [US5] `useSwipeToClose` フックの単体テストを `apps/frontend/src/hooks/use-swipe-to-close.test.ts` に作成 — ハンドル要素へのタッチイベントリスナー、80px距離閾値、0.5px/ms速度閾値、アンマウント時のクリーンアップをテスト
- [x] T021 [P] [US5] `BottomSheet` コンポーネントの単体テストを `apps/frontend/src/components/ui/bottom-sheet.test.tsx` に作成 — 開閉アニメーション、バックドロップクリックでのクローズ、ポータル描画、`aria-labelledby`、Escapeキークローズ、フォーカストラップをテスト

### US5 の実装

- [x] T022 [US5] `useSwipeToClose` フックを `apps/frontend/src/hooks/use-swipe-to-close.ts` に作成 — ハンドル ref に `touchstart`/`touchend` リスナーをアタッチ、下方向スワイプ（80px距離 OR 0.5px/ms速度）を検知して `onClose` を呼び出す、ハンドルに `touch-action: none` を設定
- [x] T023 [US5] `BottomSheet` コンポーネントを `apps/frontend/src/components/ui/bottom-sheet.tsx` に作成 — ポータル描画（`createPortal` で `document.body`）、高さ 60dvh（最大 80dvh）、ドラッグハンドルバー、タップクローズ付きバックドロップオーバーレイ、スライドアップアニメーション（`translateY(100%) → translateY(0)`、300ms、`cubic-bezier(0.32, 0.72, 0, 1)`）、`useEscapeKey` と `useFocusTrap` フックを再利用
- [x] T024 [US5] `apps/frontend/src/components/territory-info/territory-info-panel.tsx` をリファクタリング — `useIsMobile()` で描画を分岐: デスクトップ（768px以上）は既存の `PanelWrapper` を維持、モバイル（768px未満）はパネルコンテンツを `BottomSheet` でラップ。共有パネルコンテンツを内部 `PanelContent` コンポーネントとして抽出

**チェックポイント**: モバイルでスワイプクローズ付きボトムシートが表示され、デスクトップではサイドパネルが維持される。両方のレスポンシブ状態が正しく動作する

---

## Phase 8: User Story 6 — UI要素の視覚的階層が明確 (Priority: P3)

**ゴール**: 明確なビジュアル階層を確立 — 年代表示が最も目立ち、年代セレクターが次、コントロールバーは控えめな補助ツール

**独立テスト**: 画面全体を見る — 年代表示が最大/最も目立つ要素、年代セレクターが次、コントロールバーのアイコンは明確に控えめ（`text-white/60`）。

### US6 の実装

- [x] T025 [US6] `apps/frontend/src/App.tsx` と `apps/frontend/src/components/control-bar/control-bar.tsx` にビジュアル階層スタイルを適用 — `YearDisplay` は大きなテキスト（text-3xl/text-4xl, font-bold, text-white）、`ControlBar` のアイコンは `text-white/60` で不透明なボタン背景、情報パネルの前面における優位性をコントロールバーと比較して確認

**チェックポイント**: 主要ナビゲーション（年代表示/セレクター）と補助コントロール（コントロールバー）の間に明確な視覚的差異

---

## Phase 9: ポリッシュ & 横断的関心事

**目的**: すべてのストーリーにわたる最終検証とクリーンアップ

- [x] T026 [P] 既存の `apps/frontend/src/components/map/map-view.test.tsx` を更新 — 投影法トグル削除とハイライトレイヤー統合に対応
- [x] T027 [P] 既存の `apps/frontend/src/components/territory-info/territory-info-panel.test.tsx` を更新 — レスポンシブなデスクトップ/モバイル描画に対応
- [x] T028 `pnpm test && pnpm check` を実行 — すべての既存テストと新規テストが通り、型エラーなし、Lint違反なしを確認
- [x] T029 `pnpm --filter @world-history-map/frontend build` を実行 — プロダクションビルドの成功を確認
- [x] T030 quickstart.md の検証を実行 — デスクトップ（1024px以上）とモバイル（375px）ビューポートでの目視確認（quickstart.md の手順に従う）

---

## 依存関係と実行順序

### フェーズ間の依存関係

- **セットアップ（Phase 1）**: 依存なし — 即座に開始可能
- **基盤（Phase 2）**: Phase 1 に依存 — ブロッキングタスクなし
- **ユーザーストーリー（Phase 3-8）**: すべて Phase 1 の完了に依存（`formatYear`, `useIsMobile`）
  - US1 と US2 は両方 P1 で並列実行可能
  - US3 は Phase 1 後に独立して実行可能
  - US4 は Phase 1 後に独立して実行可能
  - US5 は `useIsMobile`（Phase 1, T002）に依存
  - US6 は US1（T006-T007）と US2（T009-T011）の完了に依存（それらのスタイルを仕上げるため）
- **ポリッシュ（Phase 9）**: すべてのユーザーストーリーの完了に依存

### ユーザーストーリー間の依存関係

- **US1 (P1)**: 独立 — Phase 1 の `formatYear` が必要
- **US2 (P1)**: 独立 — `App.tsx` と `map-view.tsx` のリファクタリングが必要
- **US3 (P2)**: 独立 — `map-view.tsx` を変更（並列実行時は US2 と調整）
- **US4 (P3)**: 独立 — `App.tsx` に新コンポーネントを追加
- **US5 (P3)**: 独立 — Phase 1 の `useIsMobile` が必要、`territory-info-panel.tsx` を変更
- **US6 (P3)**: US1 + US2 の完了に依存（それらの出力にスタイルを適用するため）

### 各ユーザーストーリー内の順序

- テストは実装前に書いて失敗することを確認する（TDD）
- 親への統合前にコンポーネントを作成
- スタイル調整の前にコア実装を完了

### 並列実行の機会

- T002, T003, T004 はすべて並列実行可能（異なるファイル）
- T005, T008, T012, T015, T016, T020, T021（すべてテストタスク）は並列実行可能
- US1（T005-T007）と US2（T008-T011）は並列実行可能
- US3（T012-T014）は US1/US2 と並列実行可能
- US4（T015-T019）は US3 と並列実行可能
- US5（T020-T024）は Phase 1 の後に開始可能（`useIsMobile` が必要）
- T026 と T027（テスト更新）は並列実行可能

---

## 並列実行例: Phase 1

```bash
# Phase 1 のすべてのタスクを同時に起動:
Task: "formatYear を apps/frontend/src/utils/format-year.ts に抽出"  # T001
Task: "useIsMobile フックを apps/frontend/src/hooks/use-is-mobile.ts に作成"  # T002 [P]
Task: "useIsMobile テストを apps/frontend/src/hooks/use-is-mobile.test.ts に作成"  # T003 [P]
Task: "formatYear テストを apps/frontend/src/utils/format-year.test.ts に作成"  # T004 [P]
```

## 並列実行例: User Story 1 + User Story 2

```bash
# 両方の P1 ストーリーを同時に起動:
# エージェント A: US1
Task: "YearDisplay テスト作成"  # T005
Task: "YearDisplay コンポーネント作成"  # T006
Task: "YearDisplay を App.tsx に統合"  # T007

# エージェント B: US2
Task: "ControlBar テスト作成"  # T008
Task: "ControlBar コンポーネント作成"  # T009
Task: "App.tsx を ControlBar 用にリファクタリング"  # T010
Task: "map-view.tsx から ProjectionToggle を削除"  # T011
```

---

## 実装戦略

### MVPファースト（User Story 1 のみ）

1. Phase 1 完了: セットアップ（`formatYear` 抽出、`useIsMobile` フック）
2. Phase 3 完了: User Story 1（フェードアニメーション付き YearDisplay）
3. **停止して検証**: すべてのビューポートで年代表示が動作し、正しくフォーマットされ、スムーズにアニメーションすることを確認
4. コミットし、準備ができればデプロイ

### インクリメンタルデリバリー

1. Phase 1 → 基盤準備完了
2. US1（年代表示）→ 独立テスト → コミット（最も目に見える改善）
3. US2（ControlBar）→ 独立テスト → コミット（レイアウト整理）
4. US3（領土ハイライト）→ 独立テスト → コミット（マップインタラクション）
5. US4（オンボーディングヒント）→ 独立テスト → コミット（新規ユーザー体験）
6. US5（ボトムシート）→ 独立テスト → コミット（モバイル体験）
7. US6（ビジュアル階層）→ 独立テスト → コミット（ビジュアルポリッシュ）
8. Phase 9 → 最終検証とクリーンアップ → コミット

### 並列チーム戦略

複数の開発者がいる場合:

1. チームで Phase 1 を完了
2. Phase 1 完了後:
   - 開発者A: US1（年代表示）→ US4（オンボーディングヒント）
   - 開発者B: US2（ControlBar）→ US3（領土ハイライト）
   - 開発者C: US5（ボトムシート）→ US6（ビジュアル階層、US1+US2 完了後）
3. 各ストーリーが独立して完了・統合
4. Phase 9 のポリッシュをチームで実施

---

## 注意事項

- [P] タスク = 異なるファイル、依存なし
- [Story] ラベルはタスクを特定のユーザーストーリーにマッピング（トレーサビリティ用）
- 各ユーザーストーリーは独立して完了・テスト可能であるべき
- 実装前にテストが失敗することを確認する（quickstart.md の TDD ワークフロー）
- 各ユーザーストーリー完了後にコミット（英語の conventional commit）
- 任意のチェックポイントで停止してストーリーを独立検証可能
- `prefers-reduced-motion` は `index.css` でグローバルに対応済み — コンポーネントごとの JS 対応は不要
- 既存の `AppState` は変更不要 — `selectedYear`, `selectedTerritory`, `isInfoPanelOpen` はすでに利用可能
