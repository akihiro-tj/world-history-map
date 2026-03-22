---
name: create-issue
description: >
  GitHub Issue を対話的に起票する汎用スキル。用途に応じたテンプレートで情報を収集し、
  コードベースの文脈を踏まえた深掘りで壁打ち相手にもなる。
  対応する用途: 機能提案 / バグ報告 / リファクタリング / 調査・検討。
  speckit で詳細化する前段階の軽量な起票フロー。
  トリガー: "イシューを起票", "issue を作成", "create issue", "バグ報告",
  "機能提案", "リファクタリング提案", "調査イシュー", "file an issue",
  "report a bug", "propose a feature"
---

# GitHub Issue 起票

対話的に情報を収集し、用途別テンプレートで GitHub Issue を起票する。

## フロー

### 1. 用途を判定する

ユーザーの発言から用途を推定する。曖昧な場合は AskUserQuestion で確認する。

| 用途 | リファレンス | ラベル |
|------|-------------|--------|
| 機能提案 | [references/feature.md](references/feature.md) | `proposal` |
| バグ報告 | [references/bug.md](references/bug.md) | `bug` |
| リファクタリング | [references/refactor.md](references/refactor.md) | `refactor` |
| 調査・検討 | [references/investigation.md](references/investigation.md) | `investigation` |

該当するリファレンスファイルを読み、以降はその指示に従う。

### 2. 情報をインタラクティブに収集する

リファレンスの「収集する情報」に従い、AskUserQuestion で対話的に聞き出す。
ユーザーの発言から推測できる項目はスキップし、足りない部分だけを聞く。

### 3. 深掘りする

リファレンスの「深掘り」に従い、コードベースや既存機能の文脈を踏まえて提案する。
2〜3個程度に絞り、AskUserQuestion で取捨選択してもらう。
全て不要と判断された場合はそのまま次に進む。

### 4. メモを任意で収集する

深掘り以外に追加のアイデア・制約・関連情報があるか聞く。
なければ「メモ」セクションごと省略する。

### 5. イシュータイトルを生成する

リファレンスの「タイトル」ガイドラインに従い、簡潔なタイトルを作成する。

**タイトルの共通ルール:**
- **動詞で終わる**: 「〜する」「〜できない」「〜を調査する」のように動詞形にする。体言止め（名詞で終わる形）は使わない
  - OK: 「projection 状態管理を Context に分離する」
  - NG: 「projection 状態管理の Context 化」
- **プレフィックス不要**: `feat:`, `fix:`, `refactor:` などの conventional commit プレフィックスは付けない。用途はラベルで区別する
  - OK: 「テストカバレッジを改善する」
  - NG: 「refactor: テストカバレッジを改善する」

### 6. イシュー本文を組み立てる

リファレンスの「テンプレート」に従い、本文を組み立てる。

### 7. ユーザーに確認する

組み立てたタイトルと本文をユーザーに提示し、起票前に確認を取る。

### 8. イシューを作成する

```bash
gh issue create --title "<title>" --body "<body>" --label "<label>"
```

ラベルが存在しない場合は先に作成する。各ラベルの色と説明はリファレンスを参照。

### 9. 結果を報告する

作成されたイシューの URL をユーザーに表示する。
