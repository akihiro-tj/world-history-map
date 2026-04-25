# Phase 0: Research

**Feature**: 002-tiles-deploy-redesign
**Date**: 2026-04-25

## R-1. ハッシュ計算の決定性をどう担保するか

**Decision**: SHA-256 を `node:crypto` で計算し、入力は **`git ls-files -s` で取得する commit 済み binary** に固定する。truncate は既存 `apps/pipeline/src/state/hash.ts` と同じく先頭 12 文字。

**Rationale**:
- SHA-256 は内容バイトに対して決定的なので、入力さえ同一なら全環境で同一ハッシュになる
- ただし「同じ上流データから tippecanoe を再生成すると違うバイトになる可能性」がある（実行環境差・並列処理順）。これを吸収するため、ハッシュ計算は `pipeline run` の出力ではなく **git に保存済みの binary** を入力源とする
- `git ls-files` 経由にすることで、開発者ローカルで未 commit の `pmtiles` 変更があってもハッシュ計算には反映されない（コミットしてはじめて反映）。これにより「自分の手元では違うハッシュが見える」混乱を排除
- 12 文字 truncate は cache busting に十分（衝突確率 2^-48）。既存資産との互換性も保てる

**Alternatives considered**:
- Content-addressed by tippecanoe options のみで決定性を狙う → tippecanoe の内部実装に依存、保証されない
- BLAKE3 など別ハッシュ関数 → 速度メリットはあるが既存環境との互換性を失う、利得なし
- ファイルシステム上の binary を入力源にする → コミット前の変更が紛れ込む。デメリット大

**Test cases**:
- 同一 binary を別マシン / 別 Node バージョンでハッシュした結果が一致すること
- binary 更新後にハッシュが変わること
- truncate 長が 12 文字であること

---

## R-2. Manifest の形式と消費方法

**Decision**: `packages/tiles/src/manifest.ts` を build スクリプトが書き出す。形式は TypeScript の `as const` literal object：

```ts
export const manifest = {
  '-1': 'world_-1.a3f2c1.pmtiles',
  '1600': 'world_1600.b8e4d9.pmtiles',
  // ...
} as const;
```

frontend は `import { manifest } from '@world-history-map/tiles'` で取り込み、Vite が tree-shaking して bundle に焼き込む。

**Rationale**:
- TypeScript の `as const` で year key の型推論が効く（`keyof typeof manifest` で利用可能年が出る）
- 50 エントリ規模なら gzip 後 +5KB 以内に収まる（Performance Goals 達成）
- runtime fetch を排除でき、frontend 初回ロードの RTT が 1 つ減る
- Vite の static analysis が効くので、未使用の export は削除される

**Alternatives considered**:
- JSON ファイル + build-time import → 同等だが TypeScript の型支援が弱い
- runtime fetch with build-time hash 注入 → ラグ問題が完全には消えない
- 環境変数 `VITE_MANIFEST_JSON` に inline → 巨大文字列でビルドツール側に負担、メンテ性低い

**Test cases**:
- manifest.ts の生成出力が決定的（同一 binary → 同一ファイル内容）
- frontend bundle に manifest が埋め込まれていること（grep で検証）

---

## R-3. Cloudflare Pages auto-deploy のオーケストレーション

**Decision**: Cloudflare Pages の **GitHub 連携自動 deploy を解除**し、`tiles-upload.yml` の PROD upload 成功後に GitHub Action から **Pages Deploy Hook**（webhook）を叩いて手動トリガする。

**Rationale**:
- Pages のデフォルトは「main へ push があれば即 deploy」だが、これでは PROD R2 への upload より frontend deploy が先行する可能性がある
- Deploy Hook URL を Cloudflare ダッシュボードで生成し、GitHub Secret に保管。`tiles-upload.yml` の最後で `curl -X POST $PAGES_DEPLOY_HOOK` を叩く
- これにより `tiles upload → frontend deploy` の順序が CI で保証される

**Alternatives considered**:
- GitHub Actions で Pages を直接 build/deploy（Wrangler Pages）→ より制御可能だが Cloudflare 連携の便利機能（preview URL 自動発行など）を失う
- Pages の `@cf-pages/_routes.json` で manifest 配信を遅延 → 仕組みとして複雑、根本解決にならない
- 順序を運用ルールでカバー → 自動化の本旨に反する

**Test cases**:
- PR の preview deploy がいまどおり自動発行されること
- main マージ時、PROD upload 成功 → Deploy Hook 発火 → Pages deploy が観測できること
- PROD upload 失敗時、Deploy Hook が発火しないこと

---

## R-4. R2 への差分 upload アルゴリズム

**Decision**: `packages/tiles/dist/*.pmtiles` の各ファイルについて、対象バケットに対し `wrangler r2 object get <bucket>/<key> --remote --pipe > /dev/null` で存在チェックし、`exit code != 0`（404）のものだけ `wrangler r2 object put` する。

**Rationale**:
- ハッシュ付き名は immutable なので、存在すれば内容も同一が保証される
- 50 ファイル規模なら逐次 HEAD でも 30 秒程度。並列化はオプション
- `wrangler r2 object` はラッパー実装の容易さも含めて十分

**Alternatives considered**:
- `wrangler r2 object list` で全件取得し set diff → 大量バケットでページング必要、複雑
- AWS S3 互換 API 経由で HEAD request → 認証 setup が wrangler より煩雑
- 全ファイル無条件 PUT → コスト面では些細だが、CI 時間が長くなる

**Test cases**:
- 全ファイル既存時、PUT が 0 回呼ばれる
- 一部ファイル不在時、不在ファイルだけが PUT される
- `--dry-run` フラグで実際に PUT せず計画だけ表示できる

---

## R-5. GC アルゴリズム（参照集合の構築と削除）

**Decision**: 月次 cron で `tiles-gc.yml` を実行：

1. `git log -n N --format=%H -- packages/tiles/src/manifest.ts` で直近 N 件のコミットを取得
2. 各コミットで `git show <commit>:packages/tiles/src/manifest.ts` を読み、`world_*.pmtiles` のハッシュ付きファイル名を抽出
3. すべての manifest の hash 付きファイル名を union → **保持集合**
4. 対象 R2 バケットを `wrangler r2 object list` で全件列挙 → **実在集合**
5. `実在集合 - 保持集合` = **削除候補**
6. dry-run モードでは候補を出力するだけ。本実行モードでは `wrangler r2 object delete` を逐次実行

**Rationale**:
- `manifest.ts` を git 管理することで履歴から確定的に保持集合が出る（外部状態に依存しない）
- N=3 を初期値、`workflow_dispatch` の input で変更可能に
- 削除候補の出力をログに残すことで、誤削除発覚時に R2 の Object Lifecycle 機能や手動再 upload で対処可能
- 実装は ~150 行のシェルスクリプト or TypeScript

**Alternatives considered**:
- R2 の Object Lifecycle ルールで N 日後削除 → 「N 日」と「N コミット」の換算が運用に依存、コミット頻度変動でロールバック失敗リスク
- すべて永続化 → ストレージ無限増加（O-1 課題が解消しない）
- 保持タグを object metadata に付与 → wrangler の機能サポートが弱い、複雑度増

**Test cases**:
- 直近 N コミットの manifest を union した集合と、実装が出力する保持集合が一致
- 保持集合に含まれない実在ファイルだけが削除候補に上がる
- dry-run では DELETE が呼ばれない
- N=3 / N=10 / N=1 の境界で正しく動作

---

## R-6. 移行中の Worker `/manifest.json` 互換性

**Decision**: Phase B 完了後も Worker の `/manifest.json` エンドポイントを **一定期間残置**（最低 2 週間）。frontend は build-time import に切り替わるが、過去にデプロイされた古い frontend バンドルが残っていた場合のフォールバックとして機能。

**Rationale**:
- Cloudflare Pages の deploy 履歴は数日〜数週間ブラウザに残ることがある
- Worker の `/manifest.json` を即時削除すると、古いバンドルが永久に動かなくなる
- 残置のコストは Worker のロジック数行と R2 への少量アクセスのみ、軽微
- Phase D で削除する際は frontend の古いバンドルが概ね expire してから

**Alternatives considered**:
- 即時削除 → 古いバンドルが壊れる
- 永続化 → 不要コードが残り、メンテコスト
- 過渡的に Worker が新 manifest.ts を生成して返す → 二重メンテで紛らわしい

**Test cases**:
- Worker `/manifest.json` が引き続き 200 を返すこと（Phase B〜D 期間中）
- Phase D の削除後、`/manifest.json` への request が 404 を返すこと

---

## R-7. pnpm workspace への `packages/*` 追加の影響

**Decision**: `pnpm-workspace.yaml` に `packages/*` を追加し、`packages/tiles` を `@world-history-map/tiles` として登録。frontend の `package.json` に `"@world-history-map/tiles": "workspace:*"` を追加。

**Rationale**:
- 既存の `apps/*` ワークスペース機能はそのまま動作
- `workspace:*` 指定で frontend が常に最新の packages/tiles を参照する（git commit 単位で固定）
- semver 管理は不要（git commit が version）

**Alternatives considered**:
- packages を独立リポジトリ化 → 過剰、原子的更新の利点を失う
- Vite alias で apps/frontend から直接参照 → workspace 機能を活かせず、tooling との親和性が悪い

**Test cases**:
- `pnpm install` 後、frontend の `node_modules/@world-history-map/tiles` が packages/tiles へのシンボリックリンクであること
- frontend の build / dev / test がいずれもエラーなく完了

---

## まとめ

|ID|決定|主な根拠|
|---|---|---|
|R-1|SHA-256 / 12文字 truncate / 入力は git 管理 binary|決定性確保、既存資産互換|
|R-2|`as const` TypeScript object as `manifest.ts`|型支援 + tree-shaking + RTT 削減|
|R-3|Pages auto-deploy 解除 + Deploy Hook 経由|順序保証|
|R-4|wrangler の `object get` で HEAD 相当 → 不在のみ PUT|簡潔・十分な性能|
|R-5|`git log` で manifest.ts 直近 N コミットを union|外部状態非依存、確定的|
|R-6|Worker `/manifest.json` を移行期間残置|古いバンドル保護|
|R-7|pnpm workspace `packages/*`、`workspace:*` で消費|既存パターン踏襲|

すべての NEEDS CLARIFICATION は Phase 0 で resolved。Phase 1 設計に進む。
