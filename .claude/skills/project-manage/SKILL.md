---
name: project-manage
description: >
  GitHub Project をベースにしたプロジェクト管理スキル。
  定期的なボードレビューを1つの統合フローで実行する：
  ボード概要 → In Progress 進捗確認 → 新規イシューのトリアージ → WIP制限チェックと次の着手。
  個人開発向けの軽量 Kanban プロセス。
  トリガー: "プロジェクト管理", "project manage", "ボード確認",
  "次の作業", "イシュー整理", "review board"
---

# プロジェクト管理

GitHub Project を使った定期ボードレビュー。3ステップの統合フローを上から順に実行する。

## 前提

- GitHub Project: `world-history-map`（オーナー: `@me`）
- プロジェクト番号: **2**
- プロジェクト ID: **PVT_kwHOAwgG-M4BRMBb**
- フィールド定義: [references/field-definitions.md](references/field-definitions.md)
- WIP ポリシー: [references/wip-policy.md](references/wip-policy.md)

## gh CLI の注意点

### リポジトリ指定
`gh issue list` はカレントディレクトリのリポジトリを自動検出する。`--repo` を明示する場合は **`akihiro-tj/world-history-map`** と正確に指定すること（`akihiro/` ではない）。

### `gh project item-list` の制限
`gh project item-list 2 --owner "@me" --format json` は **Priority / Size などのカスタムフィールド値を返さない**（`status`, `labels`, `title` のみ）。

カスタムフィールドの確認・設定には `gh project field-list` を使う：
```bash
gh project field-list 2 --owner "@me" --format json
```
出力から Priority / Size / Status の `id` と各 `options[].id` を取得し、`gh project item-edit` に渡す。

## 各ステップ間のルール

- 対象0件のステップは自動スキップし、次のステップに進む
- 各ステップの冒頭でヘッダーを表示する（例: `## Step 1/3: In Progress の進捗確認`）

---

## Step 0: ボード概要の取得

フローの冒頭で一度だけ実行する。

```bash
gh project item-list 2 --owner "@me" --format json
```

Status ごとにグループ化して概要を表示する：

```
## 📋 Board Overview

### 🔴 In Progress (n/2)
- #XX: Title [P1] [M]

### 📌 Todo (n/5)
- #XX: Title [P2] [S]

### 📦 Backlog (n)
- #XX: Title [P3] [M]

### 🆕 No Status (n)
- #XX: Title

### ✅ Done (n)
- #XX: Title
```

---

## Step 1/3: In Progress の進捗確認

### 対象
In Progress ステータスのアイテム。0件ならこのステップをスキップする。

### 手順

1. In Progress の各アイテムについて、AskUserQuestion で現在の状況を確認する：
   - **完了** → Done に移動
   - **ブロック中** → Backlog に戻す
   - **継続中** → ステータス維持

2. 選択に基づき `gh project item-edit` でステータスを更新する：
```bash
gh project item-edit --project-id PVT_kwHOAwgG-M4BRMBb --id <ITEM_ID> --field-id <STATUS_FIELD_ID> --single-select-option-id <OPTION_ID>
```

---

## Step 2/3: 新規イシューのトリアージ

### 対象
Status 未設定（No Status）のアイテム。0件ならこのステップをスキップする。

### 手順

1. Status 未設定のアイテムを一覧表示する

2. [references/field-definitions.md](references/field-definitions.md) の判断基準に基づき、各アイテムの Priority / Size / Status を提案する。一覧テーブル形式で提示する：

```
| # | Title | Priority | Size | Status | 理由 |
|---|-------|----------|------|--------|------|
```

3. Status の振り分けルール：
   - **P0/P1** → Todo（ただし Todo 上限5件を超えない範囲）
   - **P2/P3** → Backlog

4. AskUserQuestion で提案を確認する。修正があれば反映する。

5. 承認された内容で `gh project item-edit` を実行する。**Priority, Size, Status の3つすべてを設定すること。**

```bash
gh project item-edit --project-id PVT_kwHOAwgG-M4BRMBb --id <ITEM_ID> --field-id <FIELD_ID> --single-select-option-id <OPTION_ID>
```

---

## Step 3/3: WIP 制限の確認と次の着手

### 手順

1. 最新のボード状態を再取得する（Step 1/2 でステータスが変わっている可能性があるため）：
```bash
gh project item-list 2 --owner "@me" --format json
```

2. WIP 状況を表示する：
```
- In Progress: n/2
- Todo: n/5
```

3. **超過がある場合**: 警告を表示し、対処を提案する
   - In Progress 超過 → 完了 or Backlog 戻しを提案
   - Todo 超過 → Priority 低のものを Backlog に戻すことを提案

4. **In Progress に空きがある場合**: Todo → Backlog の順に候補を提示する（Priority 順 → 同一 Priority 内は Size 小さい順）：

```
| # | Title | Priority | Size | Status |
|---|-------|----------|------|--------|
```

   AskUserQuestion で選択してもらい、選択されたアイテムを In Progress に更新する。

5. **In Progress に空きがない場合**: 「既存作業に集中しましょう」と報告して終了する。
