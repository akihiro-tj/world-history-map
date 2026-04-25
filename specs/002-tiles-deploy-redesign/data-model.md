# Phase 1: Data Model

**Feature**: 002-tiles-deploy-redesign
**Date**: 2026-04-25

本機能は永続化スキーマを変えない。「データモデル」とは git・R2・frontend バンドルにまたがる **資産（artifact）の定義と関係性** を指す。

## エンティティ一覧

### 1. RawTile（マスター binary）

ハッシュなしの年単位 PMTiles ファイル。

| 属性 | 値 | 備考 |
|---|---|---|
| 配置 | `packages/tiles/src/pmtiles/world_{year}.pmtiles` | git 管理、年ごと 1 ファイル |
| ファイル命名 | `world_{year}.pmtiles` | year は 1〜4 桁の整数（負数=BC） |
| 入力 | `pipeline run` の `convert` ステージ出力 | tippecanoe による生成 |
| 更新ルール | 同名ファイルに上書き保存 | git 差分は変わった年だけ |
| サイズ目安 | 1〜25MB / 年 | 全 50 年で 約 500MB |

**Validation**:
- ファイル拡張子は `.pmtiles` のみ
- year は `index.json` の収録範囲と一致

**State transitions**: なし（単純な上書き保存）

---

### 2. HashedTile（配信成果物）

RawTile から決定的に派生するハッシュ付きファイル。

| 属性 | 値 | 備考 |
|---|---|---|
| 配置 | `packages/tiles/dist/world_{year}.{hash}.pmtiles` | gitignored、build 出力 |
| ファイル命名 | `world_{year}.{hash}.pmtiles` | hash は SHA-256 の先頭 12 文字 |
| 派生元 | 対応する RawTile | `git ls-files` で取得した binary |
| Immutability | 同名ファイルは内容不変 | hash と内容が 1:1 |
| アップロード先 | DEV / PROD R2 バケット | CI が差分のみ upload |

**Validation**:
- hash は `[0-9a-f]{12}` の正規表現に合致
- bytes が RawTile と完全一致（ハッシュ計算入力との同一性）

**State transitions**:
1. **Created** — build スクリプトが RawTile からハッシュ計算 → dist にコピー
2. **Uploaded(DEV)** — PR の CI が DEV バケットへ PUT
3. **Uploaded(PROD)** — main マージ時の CI が PROD バケットへ PUT
4. **Tombstoned** — GC により bucket から削除（ロールバック窓外）

---

### 3. Manifest（マッピング情報）

年 → HashedTile ファイル名のマッピング。

| 属性 | 値 | 備考 |
|---|---|---|
| 配置 | `packages/tiles/src/manifest.ts` | **git 管理**（GC が history を辿る） |
| 形式 | TypeScript `as const` オブジェクト | year(string) → filename(string) |
| 生成元 | build スクリプトが RawTile 一覧から自動生成 | コミット前に diff 確認 |
| 消費者 | frontend bundle（build 時 import） | runtime fetch しない |
| 履歴 | git log で過去版を取得可能 | GC が直近 N 件を union |

**Validation**:
- key は year 文字列（`-100` 〜 `2025` の範囲）
- value は `world_{key}.{hash}.pmtiles` パターン
- key の集合 = `packages/tiles/src/pmtiles/` 内の RawTile 集合

**State transitions**:
1. **Generated** — build スクリプトが書き出す（毎回 deterministic）
2. **Committed** — 開発者が `git commit` で git 管理下に置く
3. **Historical** — 後続コミットで上書きされ、`git log` でのみ参照可能

---

### 4. R2Bucket（配信ストレージ）

DEV / PROD の 2 バケット。

| 属性 | 値 | 備考 |
|---|---|---|
| 名前 | `world-history-map-tiles-dev` / `world-history-map-tiles-prod` | env サフィックスで命名統一 |
| 内容物 | HashedTile の集合 | manifest は持たない（移行中の `/manifest.json` のみ残置） |
| 書き込み権限 | CI のみ（Cloudflare API token） | 手動 wrangler はフォールバック |
| 読み取り | Worker 経由で frontend に配信 | Range request 対応 |
| 識別子 | object key = HashedTile のファイル名 | フラット階層、prefix なし |

**Validation**:
- bucket 内のすべての object は `world_*.{hash}.pmtiles` 形式
- env=`dev` の bucket には main マージ前のハッシュも含まれうる
- env=`prod` の bucket には main にマージされたコミットの参照ハッシュのみ

**State transitions**:
- bucket 内の object は immutable（PUT は冪等、DELETE のみ GC）

---

### 5. CommitVersion（バージョン識別子）

git commit がそのまま「タイル状態の版」を表す。

| 属性 | 値 | 備考 |
|---|---|---|
| 識別子 | git commit SHA | 40 文字 hex |
| 関連付け | (Manifest, RawTile 集合) のスナップショット | コミット時点の状態 |
| ロールバック | `git revert <SHA>` で過去版に戻る | manifest.ts が戻る |
| GC 保持 | 直近 N 件の commit が「保持窓」 | manifest.ts の git log 由来 |

**Validation**: 通常の git 整合性のみ（追加バリデーションなし）

**State transitions**:
- **Active** — 直近 N コミット内、関連 HashedTile は R2 に保持される
- **Expired** — 窓外、HashedTile は GC 対象（ただし他コミットからも参照されていれば保持される）

---

### 6. RollbackWindow（ロールバック窓）

GC で残す最近のコミット世代数。

| 属性 | 値 | 備考 |
|---|---|---|
| 値 | 既定 N=3、`workflow_dispatch` の input で上書き可 | 運用しながら調整 |
| 入力 | `git log -n N -- packages/tiles/src/manifest.ts` | manifest が変わったコミットのみ数える |
| 保持集合 | 各コミットの manifest.ts に列挙される HashedTile の union | |

**Validation**: N >= 1（ゼロ以下は無効）

---

## エンティティ間関係図

```text
RawTile (git: src/pmtiles/)
   │  build 入力
   ▼
HashedTile (gitignored: dist/) ──────┐
   │                                  │
   │  manifest 化                     │ R2 upload (CI)
   ▼                                  ▼
Manifest (git: src/manifest.ts)   R2Bucket (DEV/PROD)
   │                                  ▲
   │  build-time import               │ frontend が読む
   ▼                                  │
Frontend bundle ─────────────────────┘
                                       (Worker 経由)

CommitVersion = (Manifest snapshot, RawTile snapshot)
   │
   ▼
RollbackWindow（直近 N CommitVersion）
   │
   ▼
GC: 保持集合 ⊂ 全 R2Bucket 内 HashedTile
   │
   ▼
削除候補 = 全 - 保持
```

## 不変条件（Invariants）

1. **I-1**: 任意のコミットにおいて、`manifest.ts` の各 entry の hash は同コミット時点の対応する RawTile の SHA-256 truncate と一致する
2. **I-2**: HashedTile のファイル名（hash 部）は内容に対して 1:1 対応する。同名異内容は存在しない
3. **I-3**: Frontend bundle に焼き込まれた manifest と、その bundle が deploy された commit の `manifest.ts` は内容が一致する
4. **I-4**: PROD バケットには、main の直近 N コミットの manifest が参照する HashedTile すべてが存在する
5. **I-5**: DEV バケットには、open 中の PR の manifest が参照する HashedTile すべてが存在する（ただし既に PROD に存在するものは DEV にも存在することを要さない、Worker は PROD/DEV を別系統として扱う）

## テスト先行で書く対象

| 不変条件 / 状態遷移 | テスト対象 | テスト種別 |
|---|---|---|
| I-1（hash 計算の整合） | `build.ts` のハッシュ計算ロジック | unit |
| I-2（immutability） | build → upload → 同 hash の冪等性 | integration |
| HashedTile.Created | build スクリプトの出力 | unit |
| Manifest.Generated | build スクリプトが書き出す `manifest.ts` の決定性 | unit |
| R2Bucket diff upload | 既存ファイルが skip され不在のみ upload される | integration |
| GC 保持集合 | 直近 N コミットからの union 計算 | unit |
| GC 削除候補 | 保持集合と R2 列挙集合の差分 | unit |
| Frontend manifest 同梱 | bundle に hash 付き名が含まれる | integration（grep） |
