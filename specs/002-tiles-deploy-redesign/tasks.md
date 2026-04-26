---
description: "Task list for 002-tiles-deploy-redesign implementation"
---

# Tasks: タイル配信アーキテクチャの再設計

**Input**: Design documents from `/specs/002-tiles-deploy-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 本プロジェクトの constitution III（Behavior-First Testing）により、観測可能な振る舞いはテスト先行で実装する。各 user story 内ではテスト記述 → 実装の順とする。

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 別ファイル / 依存なし → 並列実行可
- **[Story]**: 対応する user story（US1, US2, US3, US4）。Setup / Foundational / Polish には付かない
- 各タスクには具体的なファイルパスを含める

## Path Conventions

monorepo（apps/* + packages/*）。本機能で `packages/tiles/` を新設し、`apps/frontend/`、`apps/pipeline/`、`apps/worker/`、`.github/workflows/` を改修する。

---

> **Total tasks**: 72（T001〜T068 + T010a / T024a / T044a / T066a の追加分）
> **MVP scope**: Phase 1 + Phase 2 + Phase 3（US1）= T001〜T036 + T010a / T024a の 38 タスク

## Phase 1: Setup（共有インフラ）

**Purpose**: pnpm workspace の `packages/*` への拡張と、新パッケージの空骨格を整える

- [x] T001 `pnpm-workspace.yaml` に `packages/*` を追加して workspace 範囲を拡張
- [x] T002 `packages/tiles/package.json` を新規作成（name `@world-history-map/tiles`、scripts `build` / `build:check` / `test`、dependencies なし、devDependencies に `vitest`）
- [x] T003 `packages/tiles/tsconfig.json` を新規作成（ルートの tsconfig 設定を継承、`src/` を rootDir、`dist/` を outDir 対象外）
- [x] T004 [P] `packages/tiles/vitest.config.ts` を新規作成（既存 apps の vitest 設定方針を踏襲）
- [x] T005 [P] `packages/tiles/.gitignore` を新規作成し `dist/` を ignore に登録
- [x] T006 [P] ルート `package.json` の `scripts.test` / `scripts.typecheck` がワークスペース全体に行き渡るか確認し、`packages/tiles` を含むよう必要なら更新

---

## Phase 2: Foundational（全 user story の前提）

**Purpose**: 既存 PMTiles binary の物理移管と、共有型・依存の最低限の足場を作る。完了するまで US1〜US4 のいずれも開始できない

**⚠️ CRITICAL**: 本フェーズが完了するまで、全 user story の作業は開始できない

> ⚠️ **重要**: T007（binary 移動）と T024（frontend 切替）は同 PR に含める。`apps/frontend/public/pmtiles/` を空にした瞬間に dev mode が壊れる窓を作らないため、Foundational と US1 の frontend 切替部分を **同一の Phase A PR** として扱う（plan.md Migration Strategy Phase A）

- [x] T007 `git mv apps/frontend/public/pmtiles/world_*.pmtiles packages/tiles/src/pmtiles/` で 53 ファイルを移管（履歴保持）
- [x] T008 `apps/frontend/public/pmtiles/index.json` を **残置**。vite dev middleware が dist/ に存在しないファイルを `next()` でスキップするため、publicDir が `/pmtiles/index.json` を配信し `loader.ts` の参照経路は変更不要
- [x] T009 [P] `packages/tiles/src/types.ts` を新規作成し共有型（`HistoricalYearString`、`HashedFilename`、`Manifest` 型）を定義
- [x] T010 [P] `apps/frontend/package.json` の dependencies に `"@world-history-map/tiles": "workspace:*"` を追加し、`pnpm install` でリンクが張られることを確認
- [x] T010a [P] `apps/frontend/package.json` の `scripts.dev` の前に `predev` フック（`pnpm --filter @world-history-map/tiles run build`）を追加し、dev 起動時に dist が必ず存在する状態を作る
- [x] T011 [P] `CLAUDE.md` の Project Structure と Commands セクションに `packages/tiles/` を反映

**Checkpoint**: 共有 binary が新位置にあり、`@world-history-map/tiles` のリンクが張られ、dev 起動時の build prerequisite が整っている状態。US1 の作業に進める（T024 までで dev mode が再び正常化する）

---

## Phase 3: User Story 1 - 原子的なタイル更新デプロイ (Priority: P1) 🎯 MVP

**Goal**: タイル更新が「commit + push + マージ」だけで原子的に本番反映される。frontend の manifest は build-time に焼き込まれ、PROD R2 への upload と Pages deploy が CI で順序保証される

**Independent Test**: 1 年分のタイルを更新する PR を main にマージし、frontend が新タイルを参照しはじめる瞬間と R2 がそのタイルを返せる瞬間が同時であることを観測。frontend の Network タブで `/manifest.json` への runtime fetch が消えていることを確認

### Tests for User Story 1（テスト先行）

> ⚠️ 以下のテストを先に書き、いずれも fail することを確認してから実装に入る

- [x] T012 [P] [US1] `packages/tiles/tests/hash.test.ts` を新規作成し、SHA-256 計算の決定性テスト（同 binary バイト列に対して同 hash が返る、別 binary では別 hash、truncate 長 12 文字）
- [x] T013 [P] [US1] `packages/tiles/tests/build.test.ts` を新規作成し、build スクリプトの冪等性テスト（同入力で 2 回実行 → dist の bytes と manifest.ts が完全一致）
- [x] T014 [P] [US1] `packages/tiles/tests/manifest.test.ts` を新規作成し、生成された `manifest.ts` が `packages/tiles/src/pmtiles/` 内の全 binary をカバーし、key が year 文字列、value が `world_{year}.{12hex}.pmtiles` 形式であることを assert
- [x] T015 [P] [US1] `packages/tiles/tests/api.test.ts` を新規作成し、`getTilesUrl` の正規化（trailing slash 吸収、未知 year で null）と `availableYears` のソート性をテスト
- [x] T016 [P] [US1] `packages/tiles/tests/build-check.test.ts` を新規作成し、`build --check` が「manifest が現状と一致」のとき exit 0、「不一致」のとき exit 1 を返すことをテスト
- [x] T017 [P] [US1] `apps/frontend/src/components/map/tiles-config.test.ts` を更新（既存）し、build-time import 経由で manifest が解決される状態に追従。runtime fetch ロジックを呼ばないことを assert

### Implementation for User Story 1

- [x] T018 [P] [US1] `packages/tiles/src/build/hash.ts` を新規作成し、`node:crypto` で SHA-256 → 12 文字 truncate の関数 `computeHash(buffer): string` と `truncateHash(full: string): string` を実装（既存 `apps/pipeline/src/state/hash.ts` の方式を踏襲、入力は Buffer / Uint8Array）
- [x] T019 [US1] `packages/tiles/src/build/build.ts` を新規作成し、`computeManifest` と `buildManifest` を実装（依存: T018）。CLI は `src/build/cli.ts` に分離
- [x] T020 [US1] `packages/tiles/src/build/build.ts` に `isManifestFresh` を実装し、`cli.ts` の `--check` モードで呼び出す（依存: T019）
- [x] T021 [P] [US1] `packages/tiles/src/index.ts` を新規作成し、公開 API（`manifest`, `availableYears`, `getTilesUrl`）を export（contracts/packages-tiles-api.md に従う）
- [x] T022 [US1] `packages/tiles/package.json` の scripts に `"build": "tsx src/build/cli.ts"` / `"build:check": "tsx src/build/cli.ts --check"` を登録（依存: T019, T020）
- [x] T023 [US1] 初回 `pnpm --filter @world-history-map/tiles run build` を実行して `manifest.ts` を生成し commit（dist は gitignored、src/manifest.ts のみ追加、依存: T022）
- [x] T024 [US1] `apps/frontend/src/components/map/tiles-config.ts` を改修し、`loadTilesManifest` の runtime fetch を削除して `import { getTilesUrl } from '@world-history-map/tiles'` の build-time import に置き換え（依存: T021）
- [x] T024a [US1] `apps/frontend/vite.config.ts` に dev-only middleware（`apply: 'serve'`）を追加し、`packages/tiles/dist/` を `/pmtiles/` で配信する（contracts/packages-tiles-api.md「Dev mode tile resolution」の通り、依存: T010a）
- [x] T025 [US1] `apps/frontend/src/lib/cached-fetcher.ts` の `tilesManifestFetcher` 関連の import / 利用箇所を削除し、未使用となる `CachedFetcher` の利用範囲を整理（依存: T024）
- [x] T026 [US1] `apps/frontend/src/components/map/use-map-data.ts` 等で `loadTilesManifest()` を呼んでいた部分を、新しい `getTilesUrl(year)` 直呼びに書き換え（依存: T024）
- [x] T027 [US1] `apps/frontend/.env.example` を更新し、`VITE_TILES_BASE_URL` の説明を「manifest は build-time embed、本変数は PMTiles 本体の配信元のみ」に書き換え
- [x] T028 [US1] R2 バケット `world-history-map-tiles-prod` を Cloudflare で新規作成し、packages/tiles/dist/ から 53 ファイルをアップロード完了
- [x] T029 [US1] `apps/worker/wrangler.toml` に `[env.production]` / `[env.preview]` ブロックを追加し、それぞれ `world-history-map-tiles-prod` / `world-history-map-tiles-dev` に設定。既存トップレベル設定は移行期間中残置
- [x] T030 [US1] `wrangler deploy --env production` で Worker の production environment を初回 deploy（URL: https://world-history-map-tiles.akihiro021109.workers.dev/）
- [x] T031 [US1] GitHub Repo Secret に `CLOUDFLARE_API_TOKEN`（R2 object read/write 権限のみ）と `CLOUDFLARE_ACCOUNT_ID` を登録
- [x] T032 [US1] Cloudflare Pages の Production 用 Deploy Hook URL を発行し、Repo Secret `PAGES_DEPLOY_HOOK_PROD` に登録
- [x] T033 [US1] Cloudflare Pages の Production branch の **GitHub auto-deploy を解除**（Pause / disconnect）してから `tiles-deploy.yml` 経由で Deploy Hook で deploy する構成に切替
- [x] T034 [US1] `.github/workflows/tiles-deploy.yml` を新規作成（**paths filter なし**）。`push: main` トリガで checkout → pnpm setup → install → build:check → build → tile 変更検出（`git diff --name-only`）→ `if: has_tile_changes` で PROD R2 への差分 upload → **無条件で** `curl -X POST $HOOK_URL` を実行（PROD upload が失敗した場合のみ Deploy Hook をスキップ。contracts/ci-workflows.md に従う、依存: T028, T031, T032, T033）
- [x] T035 [US1] `tiles-deploy.yml` の差分 upload step を `wrangler r2 object get --pipe > /dev/null` で存在確認し、不在のみ `wrangler r2 object put` する形に実装（依存: T034）
- [x] T036 [US1] `.github/workflows/ci.yml` の `lint` / `typecheck` / `test` ジョブが `packages/tiles` も含めて走ることを確認（`pnpm -r` と `tsc -b` が project references 経由で自動カバー済み）

**Checkpoint**: US1 完了時点で frontend が build-time import の manifest を使い、main マージで PROD R2 への upload と Pages deploy が CI から原子的に実行される。`/manifest.json` は引き続き残置されるが frontend からは参照されない

---

## Phase 4: User Story 2 - PR プレビューでタイルを検証する (Priority: P2)

**Goal**: 各 PR が DEV bucket を見る独立 preview を持ち、本番影響なくタイル変更を検証できる

**Independent Test**: PR を 1 件オープンし、Cloudflare Pages preview URL でその PR のタイル変更が表示されること、本番 URL からは旧タイルが見えること、Network タブで preview が DEV Worker URL を参照していることを確認

### Tests for User Story 2

- [x] T037 [P] [US2] `.github/workflows/tiles-deploy.yml` の冒頭コメントに dry-run 手順（PR job のローカル検証手順、`act` での起動方法、参照する Secret モック例）を記載

### Implementation for User Story 2

- [x] T038 [US2] R2 バケット `world-history-map-tiles-dev` を Cloudflare で新規作成（空でよい）
- [x] T039 [US2] `apps/worker/wrangler.toml` に `[env.preview]` ブロックを追加し、`r2_buckets.bucket_name` を `world-history-map-tiles-dev` に設定
- [x] T040 [US2] `wrangler deploy --env preview` で preview Worker を deploy（URL: https://world-history-map-tiles-preview.akihiro-021109.workers.dev）
- [x] T041 [US2] Cloudflare Pages の Preview 用環境変数 `VITE_TILES_BASE_URL` を T040 の preview Worker URL に設定。Production 用は https://world-history-map-tiles-production.akihiro-021109.workers.dev に更新
- [x] T042 [US2] `.github/workflows/tiles-deploy.yml` に `pull_request` トリガを追加（**paths filter なし**）。PR job では tile 変更検出後 `if: has_tile_changes` で DEV R2 への差分 upload のみ実行（PROD upload と Pages Deploy Hook は触らない。preview deploy は GitHub 連携の Cloudflare Pages 標準機能で別途自動生成、依存: T034, T038）
- [x] T043 [US2] Cloudflare Pages の Preview 設定が PR 単位で自動 deploy（=GitHub 連携の preview のみ有効、production は無効）になっていることを確認
- [x] T044 [US2] PR #219 で検証。`has_tile_changes=true` → DEV bucket upload success、PROD skip、本番未変更を CI ログで確認（PR #219）
- [x] T044a [US2] PR #218 で検証。frontend-only 変更で `has_tile_changes=false` → `Upload new tiles to DEV bucket` が skipped（FR-013 確認済み）

**Checkpoint**: US1 + US2 完了時点で、開発者は PR を上げるだけで preview URL を得られ、本番に影響を与えずレビュー可能

---

## Phase 5: User Story 3 - git revert によるロールバック (Priority: P2)

**Goal**: 不正なタイル更新コミットを `git revert` するだけで本番が安全に元に戻る。手動 R2 操作なし

**Independent Test**: テスト用に「微小な変更」コミットを 1 本入れて main にマージ → revert PR を作成・マージ → frontend が revert 前の状態に戻り、Network タブで旧 hash の PMTiles が R2 から正しく取得されることを確認（旧 hash は R2 に残っているため）

### Tests for User Story 3

- [x] T045 [P] [US3] revert シナリオの統合検証手順（PR 作成 → preview 検証 → マージ → 本番反映確認）を `quickstart.md` の運用者セクションに従って実機で 1 サイクル回す（手動テスト）。**完了条件**: revert PR マージ後、本番 frontend が revert 前の状態に戻る／DevTools で旧 hash の PMTiles が R2 から取得される／所要時間が PR マージから 5 分以内に収まる

### Implementation for User Story 3

- [x] T046 [US3] `quickstart.md` のロールバック節を最終形に書き直し、「ロールバック窓 N=3（manifest.ts が変化したコミット単位）」「窓を超えた場合の手動再 upload 経路（緊急時のみ）」を明記。**用途**: 運用者向けの操作手順書
- [x] T047 [US3] `docs/overview.md` に「タイル配信とロールバック」セクションを追加し、revert によるロールバックが原子的に成立する仕組み（manifest が git で履歴管理 + 旧 hash が R2 に残置）を記載

**Checkpoint**: US1 + US2 + US3 完了で、デプロイ・プレビュー・ロールバックの 3 つの基本フローが原子的に機能する

---

## Phase 6: User Story 4 - 古いタイルの自動 GC (Priority: P3)

**Goal**: ロールバック窓 N=3 を超えた古い HashedTile を月次で自動削除し、R2 ストレージの増大を抑制する

**Independent Test**: GC を `dry_run=true` で手動実行し、保持集合（直近 3 コミットの manifest 参照 hash）と削除候補集合がログに出ること、`dry_run=false` 実行時に候補のみが削除されることを観測

### Tests for User Story 4

- [x] T048 [P] [US4] `scripts/tiles-gc/` 配下に GC スクリプトのユニットテストを置き、保持集合計算（直近 N コミットの `manifest.ts` を git log から union）の関数をテスト（モック git log fixture 使用）
- [x] T049 [P] [US4] 削除候補計算（保持集合と R2 列挙集合の diff）の関数をテスト
- [x] T050 [P] [US4] dry-run モードで delete が呼ばれないことのテスト（wrangler 呼び出しをモック）
- [x] T051 [P] [US4] N=1 / N=3 / N=10 / N=履歴超過 の境界条件テスト

### Implementation for User Story 4

- [x] T052 [US4] `scripts/tiles-gc/{gc,cli}.ts` を新規作成し、保持集合計算 + R2 列挙 + diff + 削除を担う CLI を実装
- [x] T053 [US4] `.github/workflows/tiles-gc.yml` を新規作成し、`schedule: '0 3 1 * *'` と `workflow_dispatch`（input: dry_run / window_size / target_env）を実装
- [x] T054 [US4] 初回 dry-run を `workflow_dispatch` から手動起動し、保持集合と削除候補が想定どおりであることを workflow summary で確認（Retained: 106, Candidates: 0）
- [x] T055 [US4] 確認後、`dry_run=false` で本実行し、想定 object のみ削除されたことを R2 dashboard で検証

**Checkpoint**: 全 user story 完了。タイル運用の自動化サイクルが揃う

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 旧アーキテクチャの撤去と living docs の同期

- [x] T056 [P] `apps/pipeline/src/stages/prepare.ts` および対応するテスト・呼び出し箇所を削除（責務は packages/tiles に移管済み）
- [x] T057 [P] `apps/pipeline/src/stages/upload.ts` および対応するテスト・呼び出し箇所を削除（責務は CI に移管済み）
- [x] T058 [P] `apps/pipeline/src/cli.ts` から `publish-manifest` サブコマンドを削除し、help / README から記述を消去
- [x] T059 [P] `apps/pipeline/src/pipeline.ts` の `loadManifest` / `saveManifest` / `runUploadStage` 呼び出し箇所を整理し、`pipeline run` が PMTiles 生成のみを担う形に簡素化
- [x] T060 旧 R2 bucket `world-history-map-tiles` を退役（PROD バケットへの移管が完了した後、object 削除 → bucket 削除）
- [x] T061 frontend / 運用ドキュメントから `world-history-map-tiles` の言及を削除（新名 `world-history-map-tiles-prod` に統一）
- [ ] T062 移行猶予期間（最低 2 週間）が経過した後、`apps/worker/src/index.ts` の `/manifest.json` ハンドラを削除し、Worker を再 deploy
- [x] T063 [P] `docs/overview.md` を更新し、新アーキテクチャ（packages/tiles、build-time manifest、DEV/PROD R2、CI 自動化、GC）を反映
- [x] T064 [P] `docs/frontend.md` を更新し、tiles-config.ts の build-time import 設計に書き換え
- [x] T065 [P] `docs/pipeline.md` を更新し、prepare/upload/publish-manifest の責務移管を反映
- [x] T066 [P] `docs/worker.md` を更新し、`/manifest.json` 削除と env=production / preview の構成を反映
- [x] T066a [P] `apps/frontend/dist/assets/*.js` を grep し、`/manifest.json` 文字列が **存在しない** ことを Polish 期の自動 smoke test で assert（FR-002 / SC-007 のバンドル側検証、build 後 step として CI に追加）
- [x] T067 `pnpm verify` / `pnpm test` / `pnpm build` を root で走らせ、全ジョブが green であることを確認
- [ ] T068 quickstart.md の「検証ポイント」全項目を実機で実行し、すべてパスすることを確認（frontend-only main マージで本番 deploy が走ること、descriptions が改変されていないことを含む）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1, T001-T006）**: 依存なし、即時開始可
- **Foundational（Phase 2, T007-T011a）**: Setup 完了後。**全 user story を block する**。なお T007（binary 移動）は dev mode を一時的に壊すため、US1 の T024 / T024a までを **同 PR で完了** させる（plan.md Migration Strategy Phase A）
- **US1（Phase 3, T012-T036）**: Foundational 完了後に開始可。本仕様の MVP
- **US2（Phase 4, T037-T044a）**: US1 のうち T029（wrangler.toml）と T034（tiles-deploy.yml）まで進めば並列開始可
- **US3（Phase 5, T045-T047）**: US1 完了後（PROD upload と Pages deploy のループが回ってから検証する）
- **US4（Phase 6, T048-T055）**: Foundational 完了後ならいつでも開始可。実機検証は US1 完了後
- **Polish（Phase 7, T056-T068）**: 全 user story 完了後

### User Story 内の依存

- 各 story 内では「テスト先行」を厳守（テストが fail することを確認してから実装に入る）
- US1 の T019（build.ts）→ T020（--check）→ T022（scripts 登録）→ T023（初回 build commit）→ T024（frontend 切替）の chain は順序固定
- T028（PROD bucket 作成）→ T030（Worker production deploy）→ T034（CI workflow）の chain は順序固定

### 並列実行の機会

- T004 / T005 / T006（Phase 1）は並列可
- T009 / T010 / T011（Phase 2）は T007 完了後に並列可
- US1 のテスト群 T012-T017 はすべて並列可（別ファイル）
- US1 の hash.ts（T018）と index.ts（T021）は並列可
- US2 と US4 は US1 の後半段階から並列開始可（チーム配置次第）
- Polish の docs 系 T063-T066 は並列可

---

## Parallel Example: User Story 1 のテスト群

```bash
# US1 のテストをすべて並列に書き始める（実装はテストが fail することを確認してから）
Task: "T012 hash.test.ts を packages/tiles/tests/ に作成"
Task: "T013 build.test.ts を packages/tiles/tests/ に作成"
Task: "T014 manifest.test.ts を packages/tiles/tests/ に作成"
Task: "T015 api.test.ts を packages/tiles/tests/ に作成"
Task: "T016 build-check.test.ts を packages/tiles/tests/ に作成"
Task: "T017 apps/frontend/src/components/map/tiles-config.test.ts の build-time import 想定への更新"
```

```bash
# 実装側で並列に開始できるもの
Task: "T018 hash.ts 実装"
Task: "T021 index.ts（公開 API）実装"  # hash 結果に依存しないので並列可
```

---

## Implementation Strategy

### MVP First（US1 のみで初回出荷）

1. Phase 1（Setup, T001-T006）を完了
2. Phase 2（Foundational, T007-T011）を完了 — ここで全 story が unblock
3. Phase 3（US1, T012-T036）を完了 — テスト → 実装 → CI / Cloudflare 設定
4. **STOP and VALIDATE**: quickstart.md の「データ更新者」フローを実機で 1 サイクル
5. 問題なければマージし、本番運用は新フローに切替（旧 manifest fetch は使われなくなる）

### Incremental Delivery

1. US1 で MVP 確立 → 既存ユーザーへの可視差分なし、内部的に原子的デプロイ確立
2. US2 を追加 → PR 単位で preview が立つ、レビューが楽になる
3. US3 を追加 → ロールバック手順を文書化、運用者が安心して revert できる
4. US4 を追加 → ストレージ増大が抑制される、長期運用安定
5. Polish で旧資産を撤去し living docs を同期

### Phase-to-Migration の対応

| 本タスクの Phase | plan.md の Migration Phase |
|---|---|
| Phase 1 + Phase 2（Setup + Foundational）+ US1 frontend 切替部（T024 / T024a） | Phase A（packages/tiles 新設 + frontend 切替を atomic に行う単一 PR） |
| Phase 3（US1 残り）+ Phase 4（US2） | Phase B（R2 バケット分離 + CI 自動化） |
| Phase 5（US3） | （docs / 運用整備） |
| Phase 6（US4） | Phase D（GC） |
| Phase 7（Polish） | Phase C（旧パイプライン撤去）+ docs 同期 |

---

## Notes

- [P] タスク = 別ファイル、依存なし
- [Story] ラベルは user story とのトレーサビリティ確保
- 各 user story は独立に完了 / 検証可能
- テスト先行を厳守（constitution III）
- タスク or 論理単位ごとにコミット
- 任意のチェックポイントで止めて story 単独で検証可
- 避けること: 曖昧なタスク、同一ファイルの並列衝突、story 間の依存で独立性を壊すこと
