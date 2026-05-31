---
name: create-issue
description: >-
  GitHub Issue を対話的に起票する。用途（機能提案 / バグ報告 / リファクタリング / 調査・検討）を
  判定し、コードベースの文脈を踏まえて壁打ちしながら不足情報を補い、.github/ISSUE_TEMPLATE の
  骨格に沿って本文を組み立てて起票する。speckit で詳細化する前段階の軽量な起票フローとして、
  「issue を起票」「バグ報告」「機能提案」「リファクタリング提案」「調査イシュー」などで使う。
argument-hint: "[<用途や課題の説明>]"
user-invocable: true
disable-model-invocation: false
allowed-tools: ["Bash", "Read", "Grep", "Glob", "Write", "AskUserQuestion"]
---

# GitHub Issue 起票

**引数**: "$ARGUMENTS"（用途や課題の説明、任意）

対話的に情報を集め、用途別の骨格に沿って issue を起票する。情報を小出しに何度も聞くと壁打ちが途切れるので、**聞くのは「用途確認＋初期情報」と「深掘りの取捨選択」の 2 回にまとめる**。発言から埋まる項目は聞かない。

本文の骨格（セクション構成）の正本はリポジトリの `.github/ISSUE_TEMPLATE/<用途>.md`。スキルはそれに沿って中身を組み立てる。

## Step 1: 用途を判定して初期情報を集める

発言から用途を推定する。曖昧なら確認に含める。用途が確定したら **`Read` ツールで対応するリファレンスファイルを読む**。その「収集する情報」のうち発言から埋まらない項目だけを、用途確認とあわせて 1 回の AskUserQuestion で聞く。

| 用途 | リファレンス（Read で読む） | ラベル |
|------|-------------|--------|
| 機能提案 | `.claude/skills/create-issue/references/proposal.md` | `proposal` |
| バグ報告 | `.claude/skills/create-issue/references/bug.md` | `bug` |
| リファクタリング | `.claude/skills/create-issue/references/refactor.md` | `refactor` |
| 調査・検討 | `.claude/skills/create-issue/references/investigation.md` | `investigation` |

## Step 2: コードベースを調べて深掘りする

リファレンスの「深掘り」に従い、コードベースや既存機能の文脈を踏まえた提案を 2〜3 個に絞る。追加のアイデア・制約・関連情報があるかとあわせて、1 回の AskUserQuestion で取捨選択してもらう。すべて不要ならそのまま進む。

ここで壁打ちの価値が出る。要件理解に必要な範囲で調べ、起票の根拠にならない深読みはしない。

## Step 3: タイトルと本文を組み立てて確認する

**`Read` ツールで `.github/ISSUE_TEMPLATE/<用途>.md` を読んでから**本文を組み立てる（ファイル名は用途に対応: `proposal.md` / `bug.md` / `refactor.md` / `investigation.md`）。

タイトルはリファレンスの「タイトル」ガイドに従う。共通ルール:

- **動詞で終わる**: 「〜する」「〜できない」「〜を調査する」。体言止め（名詞止め）にしない
  - OK: 「projection 状態管理を Context に分離する」 / NG: 「projection 状態管理の Context 化」
- **プレフィックス不要**: `feat:` / `fix:` / `refactor:` は付けない。種別はラベルで表す

本文は対応する `.github/ISSUE_TEMPLATE/<用途>.md` のセクション骨格に沿って組み立てる。各セクションの `<!-- -->` ヒントは内容に置き換えて残さない。情報が無いセクションは省く。末尾に次のフッターを付ける（テンプレート自体には入っていない。人間が UI から起票したものと区別するため、エージェントが起票するときだけ付ける）。

```
---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

タイトルと本文をユーザーに提示し、起票前に確認を取る。

## Step 4: 起票する

本文を `/tmp/issue-body.md` に `Write` ツールで書き出してから起票する。

```bash
gh issue create --title "<title>" --body-file /tmp/issue-body.md --label "<label>" --assignee @me
```

ラベルはリポジトリに整備済みなので新規作成しない。作成された issue の URL を表示する。
