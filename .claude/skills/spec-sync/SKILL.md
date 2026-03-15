---
name: spec-sync
description: >
  仕様書（specs/current/overview.md）とコードの同期管理スキル。
  コードを走査し、overview.md の乖離を検出・更新する。
  トリガー: "spec sync", "仕様を更新", "スペック同期",
  "spec overview", "仕様概要"
---

# 仕様書同期

`specs/current/overview.md` をコードと同期する。
仕様書の目的は「コードベースのガイドツアー」— AI 生成コードの全体像を人間が素早く把握するためのもの。

原則:
- コードを見ればわかる情報（バージョン、コマンド一覧、ファイルの網羅的リスト）は書かない
- 書くのは「流れ」「構造」「関係」— コードを読む前に頭に入れたい概要
- 図は ASCII アートで描ける程度のシンプルさに留める。Mermaid は使わない
- 表は使わない。箇条書きか散文で書く

## ワークフロー

### 1. コード走査

[sync-checklist.md](references/sync-checklist.md) を読み、チェック項目に従ってコードを走査する。

### 2. 乖離検出

走査結果と `specs/current/overview.md` を比較し、乖離を箇条書きで報告する。

```
## 乖離レポート

- **追加**: ○○ が新たに追加されている
- **変更**: △△ の仕組みが変わっている（旧: ×× → 新: □□）
- **削除**: ◇◇ が削除されている
```

乖離がなければその旨を報告して終了。

### 3. ユーザー承認

レポートを提示し、AskUserQuestion で更新の承認を得る:
- 全件更新
- 選択して更新（項目を指定）
- スキップ

### 4. overview.md 更新

[overview-template.md](references/overview-template.md) のフォーマットに従い更新する。

記述ルール:
- バージョン番号、コマンド一覧、ファイルの網羅的リストは書かない
- 図は ASCII アートのみ。1 図あたりノード 7 個以内
- 表は使わない。箇条書きか短い散文で記述する
- 「よくある問い」セクションは実際の開発シナリオに基づく内容にする

更新後、`Last synced` の日付を当日に設定する。

### 5. 結果サマリ

更新した箇所を箇条書きで表示する。

## リファレンスファイル

- [sync-checklist.md](references/sync-checklist.md) — 乖離検出チェックリスト
- [overview-template.md](references/overview-template.md) — overview.md のフォーマット
