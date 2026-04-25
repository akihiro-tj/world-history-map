# Implementation Plan: タイル配信アーキテクチャの再設計

**Branch**: `002-tiles-deploy-redesign` | **Date**: 2026-04-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-tiles-deploy-redesign/spec.md`

## Summary

タイル配信を「runtime fetch される manifest」から「frontend バンドルに焼き込まれる manifest」へ転換し、frontend と R2 の状態を同一の git commit で原子的に揃える。
新規 `packages/tiles` ワークスペースが「git にコミットされた raw PMTiles から SHA-256 を決定的に計算 → ハッシュ付き配信成果物 + `manifest.ts` を生成」する責務を担う。
DEV / PROD の R2 バケット 2 系統に分離し、CI が PR/main の差分のみアップロード。ロールバックは `git revert` のみで成立し、GC は git history を辿って参照されないハッシュを月次で削除する。

## Technical Context

**Language/Version**: TypeScript 6.x（既存スタックに準拠）
**Primary Dependencies**: pnpm workspace、Cloudflare R2 / Pages / Workers、wrangler CLI、GitHub Actions、tippecanoe（既存／タイル生成のみ）、`node:crypto`（SHA-256 計算）
**Storage**: Cloudflare R2 — `world-history-map-tiles-dev`（PR preview）/ `world-history-map-tiles-prod`（本番）の 2 バケット
**Testing**: Vitest（packages/tiles のユニット & 統合）、GitHub Actions のワークフロー dry-run、Cloudflare Pages preview デプロイによる手動検証
**Target Platform**: ブラウザ（frontend）、Cloudflare Workers（CDN edge）、Node.js 22（ローカル / CI ビルド）
**Project Type**: monorepo（apps/ + packages/ を併用、本変更で `packages/*` を pnpm workspace に追加）
**Performance Goals**:
- frontend 初回ロード: manifest 取得の RTT が 1 つ消える（改善方向）
- frontend バンドルサイズ: `manifest.ts` 同梱で gzip 後 +5KB 以内
- packages/tiles ビルド: 全年フルビルドで 30 秒以内
- CI 差分アップロード: 典型的な PR（1〜3 年更新）で 2 分以内
- GC スキャン: 月次ジョブが 5 分以内に完了
**Constraints**:
- frontend デプロイと R2 のタイル参照状態が同一コミットで揃うこと（FR-003 / SC-001）
- ハッシュ計算が開発者環境差で揺れないこと（FR-005、`commit 済み binary を入力源`で吸収）
- 移行中も本番ユーザーがダウンタイムを経験しないこと（FR-017）
- ロールバック窓 N=3 内のコミットへ revert するだけで本番が戻ること（SC-003）
**Scale/Scope**:
- 年数: 約 50 年分の PMTiles（現状 54 ファイル / 527MB）
- PR/月: 5〜10（典型的に 1〜3 年更新）
- ロールバック窓: 直近 3 コミット相当（`Assumptions` で定義済み）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 適合状況 | 補足 |
|---|---|---|
| **I. Specification-Driven Change** | ✅ pass | 本変更は spec → plan → tasks → implement のフローで進む。本 plan と spec が durable rationale として残る |
| **II. Automated Quality Gates** | ✅ pass | `pnpm verify` / `pnpm test` を packages/tiles に拡張。GitHub Actions のジョブとして biome / typecheck / vitest / 差分 upload / GC を整備 |
| **III. Behavior-First Testing** | ✅ pass | 観測可能な振る舞い（hash 決定性、manifest 整合、diff upload 正しさ、GC の保持/削除判定）を **テスト先行** で実装する。インフラ配線そのものはテスト対象外（dependency upgrade 同等扱い） |
| **IV. Consistent User Experience** | ✅ pass | エンドユーザー機能の挙動は変えない（FR-016）。フロントエンドの公開 UI に差分なし |
| **V. Performance as a Budget** | ✅ pass | 上記 Performance Goals を本 plan で予算として宣言。回帰時は plan 改訂 or Complexity Tracking 記載 |

**Constitution Check 結果**: 違反なし。Complexity Tracking への記載は不要。

## Project Structure

### Documentation (this feature)

```text
specs/002-tiles-deploy-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── packages-tiles-api.md
│   ├── ci-workflows.md
│   └── r2-objects.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── frontend/                          # 既存 — manifest 参照を packages/tiles に切替
│   └── src/components/map/
│       └── tiles-config.ts            # runtime fetch を削除、build-time import に置換
├── pipeline/                          # 既存 — prepare/upload/publish-manifest を撤去
│   └── src/stages/
│       ├── prepare.ts                 # 削除（責務は packages/tiles/build に移管）
│       ├── upload.ts                  # 削除（責務は CI の tiles-upload workflow に移管）
│       └── ...
└── worker/                            # 既存 — /manifest.json エンドポイントを段階的に削除

packages/
└── tiles/                             # NEW
    ├── package.json                   # name: @world-history-map/tiles
    ├── tsconfig.json
    ├── src/
    │   ├── pmtiles/                   # raw binary（git commit、上書き保存）
    │   │   └── world_{year}.pmtiles
    │   ├── manifest.ts                # build 出力、git commit（GC が history を辿るため）
    │   ├── index.ts                   # 公開 API: manifest, getTilesUrl, availableYears
    │   └── build/
    │       ├── build.ts               # CLI: hash 計算 + dist 生成 + manifest.ts 書き出し
    │       └── hash.ts                # SHA-256 決定的計算
    ├── dist/                          # gitignored — CI と同じ手順でローカル再現可能
    │   └── world_{year}.{hash}.pmtiles
    └── tests/
        ├── build.test.ts
        ├── hash.test.ts
        └── manifest.test.ts

.github/workflows/
├── ci.yml                             # 既存に packages/tiles ジョブを追加
├── tiles-deploy.yml                   # NEW: PR/main 共通 — tile 変更時のみ R2 upload、main は常に Pages Deploy Hook を発火
└── tiles-gc.yml                       # NEW: 月次（手動 trigger 可）の GC

pnpm-workspace.yaml                    # 既存 — `packages/*` を追加
```

**Structure Decision**: monorepo を `apps/` と `packages/` の 2 系統に拡張する。`apps/` は実行可能なアプリケーション（frontend / pipeline / worker）、`packages/` は他から消費される内部資産（今回 tiles）。`packages/tiles` は frontend に `workspace:*` で消費される。CI workflow は既存 `ci.yml` を拡張せず、責務分離のため `tiles-upload.yml` / `tiles-gc.yml` を新規追加する。

## Complexity Tracking

> 違反なしのため記載不要。

## Migration Strategy（移行段取り）

破壊的変更を避けるため、以下の順で段階移行する：

1. **Phase A: packages/tiles 新設 + frontend 切替**（atomic な単一 PR）
   - packages/tiles を新規追加し、既存 `apps/frontend/public/pmtiles/` の binary を `git mv` で移管
   - hash 計算 / manifest.ts 生成 / build スクリプトをテスト先行で実装
   - **同 PR 内で** frontend の `tiles-config.ts` を build-time import に書き換え（dev / prod 双方で動作確認）
   - dev mode のタイル解決は vite plugin or `pnpm dev` 前後の build script で行う（contracts/packages-tiles-api.md 参照）
   - 旧 `worker /manifest.json` エンドポイントはこの段階では残置（古い frontend バンドル保護のため移行猶予期間中は維持）

   > **設計決定**: 当初は「packages/tiles 新設」と「frontend 切替」を別 PR にする案だったが、`apps/frontend/public/pmtiles/` を空にした瞬間に dev mode が壊れる窓ができるため、両者を同 PR に統合した

2. **Phase B: R2 バケット分離 + CI 自動化**
   - DEV / PROD の R2 バケットを新規作成
   - Worker の `wrangler.toml` を `[env.production]` / `[env.preview]` 構成に切替
   - tiles-deploy workflow を整備（main push 時は常に起動、tile 変更がある場合のみ R2 upload を実行、Pages Deploy Hook は常に発火）
   - 既存の `world-history-map-tiles` バケットは PROD 役の `world-history-map-tiles-prod` に中身をコピーして退役

3. **Phase C: 旧パイプラインの撤去**
   - `apps/pipeline/src/stages/{prepare,upload}.ts` と `publish-manifest` コマンドを削除
   - frontend / R2 の最終確認後、Worker `/manifest.json` エンドポイントを削除（移行猶予 2 週間以上経過してから）

4. **Phase D: GC 導入**
   - tiles-gc workflow（月次 cron + workflow_dispatch）を有効化

各フェーズの境界はコミット単位の独立 PR にする（小さくレビュー可能、ロールバック可能）。

## Risks & Mitigations

| リスク | 影響 | 緩和策 |
|---|---|---|
| ハッシュ非決定性で別開発者の dist 差異 | CI / ローカルで build 結果がズレる | hash の入力は **commit 済み binary** に固定（`git ls-files` で取得した実体を使う）。生成プロセスを再実行しても結果が変わらないことをテストで担保 |
| Cloudflare Pages の自動 deploy が PROD upload より早い | PROD R2 に未到達のハッシュを参照 | Pages の自動 deploy を git push 連動から切り離し、`tiles-upload.yml` の PROD upload 完了後に **deploy hook** を叩く方式にする |
| 移行中に旧 frontend バンドルがキャッシュ滞留 | 旧 runtime manifest を読み続ける | Phase B 完了後も Worker `/manifest.json` を一定期間残す。Worker 撤去は frontend バンドルキャッシュ寿命（典型 1 週間）+ 安全マージン後 |
| GC スクリプトのバグで必要な hash を消す | 過去ロールバックが壊れる | dry-run モード必須、削除前に「保持対象」を git history から union 計算したリストをログ出力。本実行前に 1 サイクル dry-run で確認運用 |
| GitHub Actions の Cloudflare API token 漏洩 | 任意の R2 操作が可能になる | Secret は Repository Secret に格納、最小権限（R2 object read/write のみ）。OIDC 連携可能なら優先 |

## Phase 0: Outline & Research

→ [research.md](./research.md) 参照。決定事項：
- ハッシュ: SHA-256（既存 `prepare.ts` と同方式、12文字 truncate も踏襲）
- manifest 形式: `as const` の TypeScript オブジェクトを `manifest.ts` として export
- Cloudflare Pages auto-deploy: GitHub 連携を解除し、CI workflow から deploy hook を叩く方式
- diff upload: `wrangler r2 object get --remote` の HEAD 相当でファイル単位存在チェック
- GC: `git log -- packages/tiles/src/manifest.ts` を辿り直近 N コミットの manifest を union

## Phase 1: Design & Contracts

→ [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md) 参照。

主要な決定:
- packages/tiles の公開 API は 3 つのみ（`manifest`, `getTilesUrl`, `availableYears`）
- CI ワークフローは 2 つ（`tiles-upload.yml`, `tiles-gc.yml`）に責務分離
- R2 バケット名規約: `world-history-map-tiles-{env}` で env = dev | prod

## Post-Design Constitution Re-check

Phase 1 設計後の再評価：

| 原則 | 再評価 |
|---|---|
| I. Specification-Driven Change | ✅ 全設計判断は research.md / data-model.md / contracts/ に durable rationale として記録 |
| II. Automated Quality Gates | ✅ contracts/ci-workflows.md に CI ジョブの責務と gate を明記 |
| III. Behavior-First Testing | ✅ data-model.md の各エンティティに対応するテストケースを quickstart.md と contracts/ に列挙 |
| IV. Consistent User Experience | ✅ frontend 公開 UI に差分なし、a11y 影響なし |
| V. Performance as a Budget | ✅ Technical Context の Performance Goals が予算として確定 |

**結論**: 違反なし、tasks フェーズへ進行可能。
