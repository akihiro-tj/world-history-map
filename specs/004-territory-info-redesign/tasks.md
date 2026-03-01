# タスク: 領土情報パネル リデザイン

**入力**: `/specs/004-territory-info-redesign/` の設計ドキュメント
**前提**: plan.md, spec.md, research.md, data-model.md, contracts/

**テスト**: TDD アプローチ — plan.md の Constitution Check で明記。各ユーザーストーリーでテストを先に書き、FAIL を確認してから実装する。

**構成**: タスクはユーザーストーリーごとにグループ化され、各ストーリーの独立した実装・テストを可能にする。

**UI 実装ルール**: UI コンポーネントの新規作成・変更時は `/ui-ux-pro-max` スキルを使用すること（plan.md に記載）。モックアップは plan.md の「UI モックアップ」セクションを参照。

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: 対象ユーザーストーリー（例: US1, US2, US3）
- 各タスクにファイルパスを含める

## パス規則

- **モノレポ**: `apps/frontend/src/`（React UI）, `apps/pipeline/src/`（CLI データパイプライン）
- **テスト**: ソースファイルと同ディレクトリ（例: `foo.ts` の横に `foo.test.ts`）
- **コントラクト**: `specs/004-territory-info-redesign/contracts/`（型定義の参照仕様）

---

## Phase 1: セットアップ（共有基盤）

**目的**: 新規依存関係のインストールと旧データファイルの削除

- [ ] T001 `apps/pipeline/` に `@notionhq/client` 依存関係を追加する（`pnpm add @notionhq/client --filter pipeline`）
- [ ] T002 [P] `apps/frontend/public/data/descriptions/*.json` の既存説明データファイルをすべて削除する（50 ファイル — FR-011: 完全な再作成が必要）

---

## Phase 2: 基盤構築（全ストーリーの前提）

**目的**: 全ユーザーストーリーが依存する型定義、ユーティリティ関数、フックの更新、開発用サンプルデータの作成

**⚠️ 重要**: このフェーズが完了するまでユーザーストーリーの作業を開始できない

- [ ] T003 [P] `apps/frontend/src/types/territory.ts` の TypeScript インターフェースを更新する — 旧 `TerritoryDescription`（`id`, `year`, `facts`, `aiGenerated` を持つ）を `specs/004-territory-info-redesign/contracts/territory-description.ts` の新インターフェース（`TerritoryDescription`, `TerritoryProfile`, `KeyEvent`, `ClassifiedKeyEvent`, `YearDescriptionBundle`, `PROFILE_FIELD_ORDER`, `PROFILE_FIELD_LABELS`）で置き換える
- [ ] T004 [P] イベント分類ユーティリティとテストを作成する: `apps/frontend/src/utils/classify-events.ts` に `classifyEvents(events: KeyEvent[], selectedYear: number): ClassifiedKeyEvent[]` を実装し、`apps/frontend/src/utils/classify-events.test.ts` にユニットテストを書く。テストケース: past/current/future 分類、current の完全一致、空配列、全 past、全 future、負数年（紀元前）のエッジケース
- [ ] T005 [P] `apps/pipeline/src/config.ts` に Notion 設定を追加する — Notion データベース ID（定数として格納）と Integration トークン（`op read` コマンドで 1Password から取得、例: `op read "op://dev/notion-integration/credential"`）の設定
- [ ] T006 `apps/frontend/src/components/territory-info/hooks/use-territory-description.test.ts` の `use-territory-description` フックテストを新スキーマ用に更新する — テストフィクスチャを新 `TerritoryDescription` 形式に変更（`id`, `year`, `facts`, `aiGenerated` を削除、`era`, `profile`, `context`, オプション `keyEvents` を追加）。現在の実装に対してテストが FAIL することを確認
- [ ] T007 `apps/frontend/src/components/territory-info/hooks/use-territory-description.ts` の `use-territory-description` フックを新スキーマに対応させる — 新 `TerritoryDescription` / `YearDescriptionBundle` 型に適応（旧フィールドへの参照を削除）、既存の fetch/キャッシュ/プリフェッチロジックは維持。T006 のテストが PASS することを確認
- [ ] T008 UI 開発用のサンプル説明データ JSON ファイルを作成する — `apps/frontend/public/data/descriptions/1700.json` に data-model.md のデータ例に基づくサンプルデータを手動作成する。データリッチな領土（例: フランス — 全フィールドあり）とデータスパースな領土（例: エチオピア — name + capital のみ）の両方を含め、US-1〜US-4 の開発・テストに使用する

**チェックポイント**: 基盤完了 — 型システム更新済み、分類ユーティリティはテスト済み、フック適応済み、サンプルデータあり。ユーザーストーリーの実装を開始できる。

---

## Phase 3: ユーザーストーリー 1 — 領土のすばやい識別（優先度: P1）🎯 MVP

**ゴール**: パネルヘッダーに領土名、時代ラベル（era）、選択年を表示し、クリック直後に「これは何？」がわかる

**独立テスト**: 任意の領土をクリックし、パネルヘッダーに name, era（存在する場合）, year が表示されることを確認。era がない領土では省略される

### US-1 テスト

> **注意: テストを先に書き、実装前に FAIL することを確認する**

- [ ] T009 [US1] `apps/frontend/src/components/territory-info/territory-info-panel.test.tsx` にヘッダー表示のテストを書く — テストケース: (1) データリッチな領土で name + era + year が表示される、(2) データスパースな領土で name + year のみ表示（era なし）、(3) ヘッダーに "不明" が表示されない

### US-1 実装

- [ ] T010 [US1] `apps/frontend/src/components/territory-info/territory-info-panel.tsx` のヘッダーセクションを再設計する — `name` をメインタイトル、`era` をサブタイトル（存在時のみ条件付きレンダリング）、選択 `year` を "年" 接尾辞付きで表示。旧 `facts` リストのレンダリングを削除。`/ui-ux-pro-max` スキルでスタイリング。レイアウトは plan.md の UI モックアップを参照

**チェックポイント**: US-1 完了 — ヘッダーで領土のアイデンティティが一目でわかる

---

## Phase 4: ユーザーストーリー 2 — 構造化されたプロフィール概要（優先度: P1）

**ゴール**: 首都・政体・王朝・指導者・宗教を一貫した順序のキー・バリューペアで表示。データのないフィールドは省略

**独立テスト**: データリッチな領土でプロフィールフィールドが `PROFILE_FIELD_ORDER` 順に表示されること。データスパースな領土で不明フィールドが省略されること

### US-2 テスト

> **注意: テストを先に書き、実装前に FAIL することを確認する**

- [ ] T011 [P] [US2] `apps/frontend/src/components/territory-info/territory-profile.test.tsx` に `TerritoryProfile` コンポーネントのテストを書く — テストケース: (1) 全 5 フィールドが正しい順序で表示される（capital → regime → dynasty → leader → religion）、(2) 部分的なフィールドは存在するもののみ表示、(3) profile が undefined の場合何もレンダリングしない、(4) フィールドラベルが `PROFILE_FIELD_LABELS` と一致する

### US-2 実装

- [ ] T012 [US2] `apps/frontend/src/components/territory-info/territory-profile.tsx` に `TerritoryProfile` コンポーネントを作成する — `profile?: TerritoryProfile` プロップを受け取り、`PROFILE_FIELD_ORDER` を反復して定義済みフィールドのみラベル・値ペアとして表示。profile が undefined の場合は null を返す。`/ui-ux-pro-max` スキルを使用。plan.md モックアップの「プロフィール」セクションを参照
- [ ] T013 [US2] `apps/frontend/src/components/territory-info/territory-info-panel.tsx` に `TerritoryProfile` を統合する — 旧 facts リストを `<TerritoryProfile profile={description.profile} />` で置き換え

**チェックポイント**: US-1 & US-2 完了 — ヘッダー + プロフィールで構造化概要を提供

---

## Phase 5: ユーザーストーリー 6 — データパイプライン & データ品質（優先度: P1）

**ゴール**: Notion データベースからデータを取得し、Zod バリデーション後に年別 JSON ファイルとして保存する CLI コマンドを提供。"不明" を含むデータを拒否

**独立テスト**: `pnpm pipeline sync-descriptions` で Notion から JSON を同期。`pnpm pipeline validate-descriptions` で既存 JSON のバリデーション。"不明" を含むエントリがエラーとして報告される

### US-6 テスト

> **注意: テストを先に書き、実装前に FAIL することを確認する**

- [ ] T014 [P] [US6] `apps/pipeline/src/stages/validate-descriptions.test.ts` に説明データバリデーションのテストを書く — `specs/004-territory-info-redesign/contracts/validation-schema.ts` の Zod スキーマを検証: (1) 完全な有効エントリが通過、(2) 最小限の有効エントリ（name のみ）が通過、(3) 任意のフィールドに "不明" を含むと拒否、(4) 空文字列を拒否、(5) context が 50〜200 字の範囲外で拒否、(6) 未ソートの keyEvents を拒否、(7) 空の profile オブジェクトを拒否、(8) 空の keyEvents 配列を拒否
- [ ] T015 [P] [US6] `apps/pipeline/src/stages/sync-descriptions.test.ts` に sync-descriptions ステージのテストを書く — Notion API レスポンス変換の検証: (1) 単一ページが正しい TerritoryDescription を生成、(2) 同一年の複数ページが 1 つの YearDescriptionBundle にグループ化、(3) Notion のリレーション/リッチテキストプロパティが正しくプレーン文字列に変換される、(4) 空のプロパティが undefined になる（空文字列ではない）、(5) バリデーションエラーが領土名と年で報告される

### US-6 実装

- [ ] T016 [US6] `apps/pipeline/src/stages/validate-descriptions.ts` にバリデーションステージを作成する — `specs/004-territory-info-redesign/contracts/validation-schema.ts` に基づく Zod スキーマを実装、`validateDescriptionFile(filePath: string)` と `validateAllDescriptions(dir: string)` 関数をエクスポートし、構造化されたエラーレポートを返す
- [ ] T017 [US6] `apps/pipeline/src/stages/sync-descriptions.ts` に sync-descriptions ステージを作成する — `@notionhq/client` で Notion データベースからページを取得、プロパティを `TerritoryDescription` に変換、年ごとに `YearDescriptionBundle` にグループ化、Zod スキーマでバリデーション、`apps/frontend/public/data/descriptions/` に `{year}.json` ファイルを書き出す
- [ ] T018 [US6] `apps/pipeline/src/cli.ts` に `sync-descriptions` と `validate-descriptions` CLI コマンドを追加する — 既存の CLI パターンに従ってサブコマンドを登録。`sync-descriptions` はオプション `--year` フラグを受け付ける。`validate-descriptions` は descriptions ディレクトリの全 JSON ファイルをスキャンする

**チェックポイント**: US-6 パイプライン実装完了 — sync/validate コマンドが利用可能。本番データ作成は Phase 9 で実施

---

## Phase 6: ユーザーストーリー 3 — 選択年における時代文脈（優先度: P2）

**ゴール**: 選択年におけるその領土の時間的状況を客観的事実で記述した 2〜3 文のテキストを表示。データなしならセクション省略

**独立テスト**: フランス 1700 年で context テキストが表示される。context がない領土ではセクションが表示されない

### US-3 テスト

> **注意: テストを先に書き、実装前に FAIL することを確認する**

- [ ] T019 [US3] `apps/frontend/src/components/territory-info/territory-context.test.tsx` に `TerritoryContext` コンポーネントのテストを書く — テストケース: (1) context が提供された場合にテキストが表示される、(2) context が undefined の場合に何もレンダリングしない、(3) テキストが段落要素として表示される

### US-3 実装

- [ ] T020 [US3] `apps/frontend/src/components/territory-info/territory-context.tsx` に `TerritoryContext` コンポーネントを作成する — `context?: string` プロップを受け取り、`<p>` 要素として表示。undefined の場合は null を返す。`/ui-ux-pro-max` スキルを使用。plan.md モックアップの「時代の文脈」セクションを参照
- [ ] T021 [US3] `apps/frontend/src/components/territory-info/territory-info-panel.tsx` に `TerritoryContext` を統合する — プロフィールとタイムラインの間に `<TerritoryContext context={description.context} />` を追加

**チェックポイント**: US-3 完了 — 時間的文脈が年ごとの状況を説明する

---

## Phase 7: ユーザーストーリー 4 — 時間的方向付けのあるタイムライン（優先度: P2）

**ゴール**: キーイベントを過去・現在・未来に分類し、視覚的に区別された縦型タイムラインとして表示。選択年マーカーを挿入

**独立テスト**: フランス 1700 年で 1643 年のイベントが past スタイル、1789 年のイベントが future スタイルで表示される。選択年マーカーが正しい位置に表示される

### US-4 テスト

> **注意: テストを先に書き、実装前に FAIL することを確認する**

- [ ] T022 [US4] `apps/frontend/src/components/territory-info/territory-timeline.test.tsx` に `TerritoryTimeline` コンポーネントのテストを書く — テストケース: (1) past イベントに opacity/ミュートスタイリングクラスがある、(2) current イベントに aria-current="true" と太字スタイルがある、(3) future イベントに破線/ミュートスタイルがある、(4) 完全一致イベントがない場合に正しい位置に年マーカーが表示される、(5) keyEvents が undefined の場合に何もレンダリングしない、(6) セマンティック `<ol>` が aria-label 付きでレンダリングされる、(7) 全イベントが past — マーカーが末尾、(8) 全イベントが future — マーカーが先頭

### US-4 実装

- [ ] T023 [US4] `apps/frontend/src/components/territory-info/territory-timeline.tsx` に `TerritoryTimeline` コンポーネントを作成する — `keyEvents?: KeyEvent[]` と `selectedYear: number` プロップを受け取り、T004 の `classifyEvents()` を `useMemo` で使用。`<ol aria-label="主な出来事">` で縦型タイムラインをレンダリング。research.md に基づく視覚的区別を適用（past: 塗りつぶし円 + opacity-50、current: リング + 太字 + aria-current、future: 中空ダイヤモンド + 破線 + opacity-50）。選択年マーカーセパレーターを挿入。`/ui-ux-pro-max` スキルを使用。plan.md モックアップの「主な出来事」と「タイムライン: 時間的分類の視覚表現」セクションを参照
- [ ] T024 [US4] `apps/frontend/src/components/territory-info/territory-info-panel.tsx` に `TerritoryTimeline` を統合する — context セクションの後に `<TerritoryTimeline keyEvents={description.keyEvents} selectedYear={selectedYear} />` を追加

**チェックポイント**: US-3 & US-4 完了 — 文脈 + 時間的タイムライン付きの完全な情報パネル

---

## Phase 8: ユーザーストーリー 5 — レスポンシブな情報優先度（優先度: P3）

**ゴール**: モバイルボトムシートの初期ピーク高さでヘッダー + プロフィールがスクロールなしで表示。展開で context + timeline にアクセス

**独立テスト**: モバイルビューポートでデータリッチな領土のボトムシートを開き、ヘッダーとプロフィールが初期表示で見える

### US-5 実装

- [ ] T025 [US5] `apps/frontend/src/components/territory-info/territory-info-panel.tsx` のモバイルレスポンシブレイアウトを調整する — 情報優先度順（ヘッダー → プロフィール → 文脈 → タイムライン → AiNotice）がボトムシート制約内で動作することを確認。データスパース時にコンテンツが空白スペースなしで適応すること
- [ ] T026 [US5] `apps/frontend/src/components/territory-info/territory-info-panel.tsx` と `apps/frontend/src/components/ui/bottom-sheet.tsx` でボトムシートの初期ピーク高さを検証する — 初期ピークでヘッダー + 少なくとも 2 つのプロフィールフィールドがスクロールなしで表示されることを確認（SC-005）、必要に応じてピーク高さを調整

**チェックポイント**: 全ユーザーストーリー完了 — レスポンシブ対応の完全な領土情報パネル

---

## Phase 9: 本番データ作成（US-6 続き）

**目的**: AI でデータを生成し、人的レビューを経て、パイプラインで本番 JSON を生成する

**⚠️ 前提**: Phase 5（パイプライン実装）および Phase 3〜8（UI 実装）が完了していること。UI が完成した状態で本番データを投入することで、実際の表示でデータの問題に気付ける

- [ ] T027 [US6] Notion MCP を使用して Notion データベースに教科書レベルの主要領土データを投入する — spec.md の選定基準に従い 50〜70 領土を選定（高校世界史教科書レベル、地域バランス、時代カバレッジ）。Notion DB のプロパティ（year, territory_id, name, era, capital, regime, leader, dynasty, religion, context, key_events）に従って全ページを作成。"不明" は使用しない。すべて日本語で記述（FR-015）
- [ ] T028 [US6] 人的レビュー完了後に `pnpm pipeline sync-descriptions` を実行し、全 JSON ファイルを生成する — Notion 上のデータのレビュー・承認を経てからパイプラインを実行。`pnpm pipeline validate-descriptions` でバリデーションが全件通過することを確認。T008 で作成したサンプルデータは本番データで上書きされる

**チェックポイント**: 本番データ完成 — 高品質な教科書レベルのデータが全 UI コンポーネントで表示される

---

## Phase 10: 仕上げ & 横断的関心事

**目的**: エンドツーエンドテストと全ストーリー横断の最終検証

- [ ] T029 `apps/frontend/tests/e2e/` に領土情報パネルの E2E テストを書く — Playwright テスト: (1) 領土クリック → 構造化情報（ヘッダー + プロフィール + 文脈 + タイムライン）がパネルに表示される、(2) データスパースな領土クリック → "不明" 非表示・セクション省略、(3) モバイルビューポート → 正しい情報優先度のボトムシート
- [ ] T030 全体バリデーションを実行する: `pnpm test && pnpm check` — 全ユニットテスト、コンポーネントテスト、リンティングが通過すること

---

## 依存関係と実行順序

### フェーズ依存関係

- **セットアップ（Phase 1）**: 依存なし — 即座に開始可能
- **基盤構築（Phase 2）**: セットアップに依存（T001 の @notionhq/client） — 全ユーザーストーリーをブロック
- **ユーザーストーリー（Phase 3〜8）**: 基盤構築フェーズの完了に依存
  - US-1, US-2, US-6 は並列実行可能（すべて P1）
  - US-3, US-4 は基盤構築後に並列実行可能（P2）
  - US-5 は US-1 + US-2 の完了に依存（レイアウト調整のため）
- **本番データ作成（Phase 9）**: Phase 5（パイプライン実装）+ Phase 3〜8（UI 実装）の完了に依存
- **仕上げ（Phase 10）**: 本番データ作成の完了に依存

### ユーザーストーリー依存関係

- **US-1（P1）**: 基盤構築後に開始可能 — 他のストーリーへの依存なし
- **US-2（P1）**: 基盤構築後に開始可能 — 他のストーリーへの依存なし
- **US-6（P1）**: 基盤構築後に開始可能 — 他のストーリーへの依存なし（パイプラインは UI から独立）
- **US-3（P2）**: 基盤構築後に開始可能 — 独立してテスト可能
- **US-4（P2）**: 基盤構築後に開始可能 — Phase 2 の `classifyEvents` を使用
- **US-5（P3）**: US-1 + US-2 に依存 — 既存レイアウトのモバイル調整

### 各ユーザーストーリー内の順序

- テストを先に書き、実装前に FAIL することを確認する
- コンポーネント実装 → パネルへの統合
- 次の優先度に進む前にストーリーを完了する

### 並列実行の機会

- T001 と T002 は並列可能（セットアップ）
- T003, T004, T005 は並列可能（基盤構築 — 異なるファイル）
- T014 と T015 は並列可能（US-6 テスト — 異なるファイル）
- US-1（T009〜T010）、US-2（T011〜T013）、US-6（T014〜T018）は基盤構築後に並列可能
- US-3（T019〜T021）と US-4（T022〜T024）は並列可能

---

## 並列実行例: 基盤構築フェーズ完了後

```
# 開発者 A: US-1 → US-2（フロントエンド UI、同一ファイルのため逐次実行）
Task T009: "territory-info-panel.test.tsx にヘッダー表示テストを書く"
Task T010: "territory-info-panel.tsx のヘッダーを再設計する"
Task T011: "territory-profile.test.tsx に TerritoryProfile テストを書く"
Task T012: "TerritoryProfile コンポーネントを作成する"
Task T013: "TerritoryProfile をパネルに統合する"

# 開発者 B: US-6（パイプライン、完全に独立）
Task T014: "バリデーションスキーマのテストを書く"
Task T015: "sync-descriptions ステージのテストを書く"
Task T016: "validate-descriptions ステージを作成する"
Task T017: "sync-descriptions ステージを作成する"
Task T018: "CLI コマンドを追加する"

# Phase 9 完了後（本番データ作成）:
Task T027: "Notion MCP で Notion DB にデータを投入する"
Task T028: "人的レビュー後にパイプラインを実行して JSON を生成する"
```

---

## 実装戦略

### MVP ファースト（US-1 + US-2 のみ）

1. Phase 1: セットアップを完了
2. Phase 2: 基盤構築を完了（重要 — 全ストーリーをブロック）
3. Phase 3: US-1（name, era, year のヘッダー）
4. Phase 4: US-2（構造化プロフィール）
5. **停止して検証**: サンプル JSON データ（T008）でテスト — ヘッダー + プロフィールで即座に価値を提供
6. 準備ができたらデプロイ/デモ

### インクリメンタルデリバリー

1. セットアップ + 基盤構築 → 基盤完了（サンプル JSON で開発可能）
2. US-1 + US-2 → 構造化概要（MVP!）
3. US-6 パイプライン → sync/validate コマンド利用可能
4. US-3 + US-4 → 文脈 + タイムライン（完全な情報パネル）
5. US-5 → モバイル最適化
6. 本番データ作成 → AI 生成 → 人的レビュー → パイプライン実行 → 高品質データ
7. 各ストーリーが前のストーリーを壊さずに価値を追加

### データ戦略

- **T008（基盤構築）**: UI 開発用のサンプル JSON を手動作成（例: `1700.json` にフランス + エチオピア）
- **T014〜T018（US-6）**: パイプライン（sync + validate）を実装（Notion API で読み取り）
- **T027（本番データ）**: AI が Notion MCP で Notion データベースに 50〜70 領土のデータを直接投入
- **人的レビューゲート**: Notion 上でデータをレビュー・承認（仕様要件）
- **T028（本番データ）**: レビュー完了後にパイプラインを実行し全 JSON ファイルを生成

---

## 補足

- [P] タスク = 異なるファイル、依存関係なし
- [Story] ラベルはタスクを特定のユーザーストーリーに対応付ける
- 各ユーザーストーリーは独立して完了・テスト可能であるべき
- 実装前にテストが FAIL することを確認する
- 各タスクまたは論理的グループの完了後にコミット
- チェックポイントで停止してストーリーを独立検証可能
- UI コンポーネント: 常に `/ui-ux-pro-max` スキルを使用し plan.md モックアップを参照
- コントラクト参照: `specs/004-territory-info-redesign/contracts/` に TypeScript インターフェースと Zod スキーマの実装参照仕様を格納
