---
name: spec-sync
description: >
  仕様書（specs/current/）とコードの同期管理スキル。
  コードを走査し、specs/current/ の乖離を検出・更新する。
  既存ファイルがないトピックは新規生成する。
  トピック: data-flow | data-model | frontend-state（省略時は全トピック）
  トリガー: "spec sync", "仕様を更新", "スペック同期",
  "spec overview", "仕様概要"
argument-hint: "<data-flow|data-model|frontend-state>"
---

# 仕様書同期

`specs/current/` の living docs とコードの同期を管理する。
仕様書の目的は「コードの地図」— AI 生成コードの全体像を人間が把握するためのもの。

原則:
- コードを見ればわかる情報（バージョン、コマンド一覧、ファイルの網羅的リスト）は書かない
- 書くのは「流れ」「構造」「変換」「境界」— コードを読む前に頭に入れたい概要
- Mermaid 図で視覚的に伝える

## 引数

```
/spec-sync [topic]
```

トピック未指定の場合は全トピックを対象にする。

有効なトピック: `data-flow`, `data-model`, `frontend-state`

## ワークフロー

### 0. チェックリストの健全性検証

仕様同期の前に、[sync-checklist.md](references/sync-checklist.md) 自体がコードベースの現状と合っているか検証する。

確認内容:
- 各トピックの探索戦略に記載された glob パターンが実際にファイルにマッチするか
- チェックリストに記載のないディレクトリ慣習が増えていないか

問題を検出した場合はユーザーに報告し、チェックリストの更新を提案する。承認されれば sync-checklist.md を更新してから本編に進む。

### 1. スコープ決定

トピックが指定されていればそのトピックのみ、未指定なら全トピックを対象にする。

### 2. コード走査

[sync-checklist.md](references/sync-checklist.md) を読み、対象トピックのチェック項目に従ってコードを走査する。

各トピックについて:
1. チェックリストの探索戦略に従いコードを読む
2. `specs/current/<topic>.md` が存在するか確認する

### 3. 乖離検出 or 新規生成の判定

| `specs/current/<topic>.md` | 動作 |
|---------------------------|------|
| 存在する | 乖離検出 → ステップ 4 へ |
| 存在しない | 新規生成 → ステップ 6 へ |

### 4. 乖離検出レポート

走査結果と既存ファイルを比較し、乖離を一覧化する。レポート形式:

```
## <topic> の乖離

| 項目 | specs/current の記述 | コードの実態 | 種別 |
|------|---------------------|-------------|------|
| ... | ... | ... | 追加/変更/削除 |
```

乖離がない場合はその旨を報告し、次のトピックへ進む。

### 5. ユーザー承認

レポートを提示し、AskUserQuestion で更新の承認を得る:
- 全件更新
- 選択して更新（項目を指定）
- スキップ（このトピックをスキップ）

### 6. 仕様ファイル更新 / 新規作成

[current-spec-template.md](references/current-spec-template.md) のフォーマットに従い、ファイルを更新または新規作成する。

記述ルール:
- バージョン番号、コマンド一覧、ファイルの網羅的リストは書かない
- Mermaid 図を積極的に使い、テキストを最小限にする
- 1ファイルは 100 行以内を目安とする

更新後、`Last synced` の日付を当日に設定する。

### 7. 結果サマリ

全トピックの処理完了後、サマリを表示する:

```
| トピック | 結果 |
|---------|------|
| data-flow | 更新（3件変更） |
| data-model | 新規作成 |
| frontend-state | 乖離なし |
```

## リファレンスファイル

- [sync-checklist.md](references/sync-checklist.md) — トピック別の乖離検出チェックリスト
- [current-spec-template.md](references/current-spec-template.md) — specs/current/*.md のフォーマット
