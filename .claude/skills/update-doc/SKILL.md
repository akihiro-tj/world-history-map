---
name: update-doc
description: >
  現コードから docs/overview.md, docs/pipeline.md, docs/frontend.md, docs/worker.md を
  更新するスキル。各ドキュメントの Last updated 以降の git log から変更を洗い出し、
  ドキュメントに反映すべきかを判定したうえで、承認された変更をファイルに書き込む。
disable-model-invocation: true
---

# ドキュメント更新

`docs/overview.md` と `docs/{pipeline,frontend,worker}.md` を現コードに合わせて更新する。
これらのドキュメントの目的は「コードベースのガイドツアー」— AI が生成したコードの全体像を人間が素早く把握するためのもの。
実装を網羅的に再現するのではなく、読み手が自力でコードを読みに行くための地図を提供する。

## ドキュメントの構造

- `docs/overview.md` — 全体概要。読み手が最初に開く入り口。150 行以内
- `docs/pipeline.md` — データパイプラインの詳細。150-250 行
- `docs/frontend.md` — フロントエンドの詳細。150-250 行
- `docs/worker.md` — Cloudflare Worker の詳細。150-250 行

overview.md は「全体がどう繋がっているか」に徹し、各アプリの深掘りは詳細ファイルに譲る。
詳細ファイルは「そのアプリだけを精読すれば完結した理解が得られる」ことを目指す。

## 記述ルール

4 ファイル共通。

- バージョン番号・コマンド一覧・網羅的ファイルリストは書かない（コードを見れば分かる情報）
- 図は ASCII アートのみ。Mermaid は使わない
- 1 図あたりノード 7 個以内。描けないほど複雑なら図を分割するか情報を減らす
- 表は使わない。箇条書きか短い散文で書く
- 型定義はフィールド名だけ列挙する（型アノテーション省略）

ドキュメントのセクション構成は [templates.md](references/templates.md) で定義されているものに従う。
操作や挙動の情報はそのアプリの状態設計やフローのセクションに収める。

## ワークフロー

### 1. 対象ファイルの分類

各ドキュメントを開き、先頭の `> Last updated: YYYY-MM-DD` を読み取る。

- ファイルが存在し日付がある → **差分更新対象**
- ファイルが存在しない、または日付が見つからない → **新規生成対象**

### 2. 変更の取得

**差分更新対象**: 対応するコードパスを範囲に、`Last updated` 以降の git log を取得する。

- `docs/overview.md` — `apps/` 配下全体（加えて `docs/overview.md` 自身が参照している型が他アプリで動いていれば拾う）
- `docs/pipeline.md` — `apps/pipeline/`
- `docs/frontend.md` — `apps/frontend/`
- `docs/worker.md` — `apps/worker/`

例: `git log --since=2026-03-15 --pretty=format:"%h %s" -- apps/pipeline/`

気になるコミットは `git show <hash>` で diff を確認する。

**新規生成対象**: git log は使わない。対応するコードパスを現状のまま読んで、[templates.md](references/templates.md) に沿って書き起こす。

### 3. インパクト判定

各コミット（または新規生成時は現コードの構造）が、対応ドキュメントの記述を更新する価値があるか判定する。
判定基準は [change-impact.md](references/change-impact.md) を参照。

反映不要（純リファクタ・テストのみ・フォーマットなど）と判断したコミットはスキップしてよい。
ただし後でユーザーに伝えられるよう、コミットハッシュと理由を軽くメモしておく。

### 4. メタチェック

このスキルの前提（[change-impact.md](references/change-impact.md) の判定基準、
[templates.md](references/templates.md) のセクション構成）自体を揺るがす変更が起きていないか確認する。
該当する変更類型は change-impact.md の「スキル自体の前提が変わる変更」節を参照。

該当があればドキュメント更新とは別枠の「メタ変更」として乖離レポートに記す。
自動修正はせず、ユーザーに skill 本体の改訂を依頼する形でエスカレーションする。

### 5. 乖離レポート

ファイル別に反映すべき変更を箇条書きで報告する。メタ変更があれば先頭に分けて記す。

```
## 乖離レポート

### メタ変更（update-doc 本体の改訂が必要）
- apps/auth/ が新規追加されている。templates.md に docs/auth.md のテンプレ追加と、change-impact.md への影響基準追加が必要

### docs/pipeline.md
- **追加**: ○○ ステージが新規追加（abc1234）
- **変更**: △△ の入力ソースが GitHub → S3 に変更（def5678）
- スキップしたコミット: 3 件（純リファクタ 2, テストのみ 1）

### docs/frontend.md
- （反映すべき変更なし）

### docs/worker.md
- **新規作成**: ファイルがまだ存在しない
```

メタ変更もドキュメント乖離もなければ、その旨を報告して終了。

### 6. ユーザー承認

AskUserQuestion で更新対象を確認する: 全件更新 / ファイル単位で選択 / スキップ。
メタ変更は自動修正の対象外。ユーザーが別途 skill 本体を改訂する前提で報告だけ行う。

### 7. ドキュメント更新

[templates.md](references/templates.md) のフォーマット規約に従い、承認されたファイルを更新する。
新規生成対象はテンプレートに沿って新しく書き起こす。
更新後、各ファイルの `Last updated` を当日日付に揃える。

### 8. 結果サマリ

ファイル別に更新内容を箇条書きで表示する。メタ変更があった場合は「skill 本体の改訂が別途必要」と明記する。

## リファレンスファイル

- [change-impact.md](references/change-impact.md) — 変更種別とドキュメント影響の対応マップ
- [templates.md](references/templates.md) — 4 ドキュメントのフォーマット規約
