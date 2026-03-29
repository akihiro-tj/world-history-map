---
name: worktree
description: >
  Git worktree を使った開発ワークフロー。単一イシューの実装から複数イシューの並行開発まで対応する。
  サブコマンドで機能を切り替える: plan（分析）、setup（環境構築）、dev（実装→PR）。
  サブコマンド省略時はフル実行（分析→承認→並列実装）。
disable-model-invocation: true
---

# Worktree 開発ワークフロー

Git worktree を使った開発を効率化する。サブコマンドで動作モードを切り替える。

## 使い方

```
/worktree plan 158 159 160 161    # 分析・Wave分けのみ
/worktree setup 159               # worktree作成+環境構築のみ
/worktree dev 159                 # 実装→PR作成のみ
/worktree 158 159 160 161         # フル実行（分析→承認→並列実装）
```

## モード判定

引数の先頭が `plan`, `setup`, `dev` のいずれかなら該当モード。
それ以外（数値のみ）ならフル実行モード。

## 単機能モード

サブコマンドに応じて該当する reference を読み、その指示に従う。

| サブコマンド | reference |
|-------------|-----------|
| `plan` | [references/plan.md](references/plan.md) |
| `setup` | [references/setup.md](references/setup.md) |
| `dev` | [references/dev.md](references/dev.md) |

## フル実行モード

サブコマンドなしでイシュー番号のみが渡された場合のオーケストレーションフロー。

### 1. 分析する

[references/plan.md](references/plan.md) を読み、その手順に従って分析・Wave 分けを行う。

### 2. 承認を得る

分析結果をユーザーに提示し、AskUserQuestion で承認を得る。

提示する内容:

- Wave 分けとその理由
- コンフリクトリスクマップ
- 各 Wave 内の推奨マージ順
- Wave 数 × 並列度のサマリ

ユーザーが調整したい場合は修正する。

### 3. Wave ごとにサブエージェントを並列起動する

Wave 内の各イシューに対して Agent ツールを `isolation: "worktree"` で並列起動する。

各サブエージェントへのプロンプト:

```
以下の手順でイシュー #<番号> を実装してください。

1. 依存関係をインストールする（パッケージマネージャのインストールコマンドを実行）
2. `gh issue view <番号> --json title,body,labels` でイシュー情報を取得する
3. イシューの内容を仕様として読み解き、実装する
4. プロジェクトの検証コマンドを実行する（失敗したら修正して再実行、3回失敗したら中断）
5. 変更を適切な粒度でコミットする
6. `closes #<番号>` でイシューをリンクした PR を作成する
```

同一 Wave 内のサブエージェントはすべて同時に起動する。

### 4. 結果を報告し次の Wave へ進む

各サブエージェントの完了を待ち、結果を集約する:

- 作成された PR の URL 一覧
- 成功/失敗のステータス
- 失敗したイシューがあれば原因の概要

次の Wave が前の Wave の変更に依存する場合、ユーザーに PR のマージを促す。
マージ完了を確認してから次の Wave を開始する。

### 5. 最終報告する

全 Wave 完了後、全 PR の一覧とマージ推奨順序を表示する。
