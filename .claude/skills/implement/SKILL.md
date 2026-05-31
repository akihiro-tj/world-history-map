---
name: implement
description: >-
  SpecKit を使うほどでない小規模タスク（issue 1 件程度の bug fix / feature / refactor）の
  計画立案 → 段階的実装 → PR 作成までを一気通貫で実行する。main の最新化・ブランチ作成・
  conventional commit による分割コミット・品質ゲート確認・PR 下書き生成までを自動で進め、
  「計画」と「PR 作成」の 2 点でだけ承認を取る。issue 番号やタスク内容を渡して
  「実装して PR まで出して」と依頼されたときに使う。
argument-hint: "[<issue-number> | <task-details>] [--base <branch>]"
user-invocable: true
disable-model-invocation: false
allowed-tools: ["Bash", "Read", "Grep", "Glob", "Edit", "Write", "AskUserQuestion", "EnterPlanMode", "ExitPlanMode"]
---

# 小規模タスク実装ワークフロー

**引数**: "$ARGUMENTS"（issue 番号 / タスク内容、任意で `--base <branch>`）

計画から PR 作成までを一気通貫で進める。**承認を取るのは「計画」と「PR 作成」の 2 点だけ**で、その間（ブランチ作成・実装・コミット・品質ゲート・PR 下書き生成）は止まらずに進める。途中で何度も確認を挟まないのは、計画段階で方針も PR の素材もまとめて固めてしまうため。手が止まるのは、安全のために必要な分岐（下記 Step 0）と、計画・PR の承認だけにする。

## Step 0: 起点を整える

実装に入る前に、古い main から派生して PR が陳腐化・コンフリクトするのを防ぐ。

```bash
git branch --show-current
git status --porcelain
```

- **main 上 + 作業ツリー clean**: `git checkout main && git pull --ff-only` で最新化する。`--ff-only` にするのは、ローカル main に予期せぬコミットがあれば merge commit を勝手に作らず失敗させて気付けるようにするため。失敗したらユーザーに報告して方針を聞く
- **main 以外のブランチ上、または未コミット変更あり**: 勝手に状態を壊さないよう、AskUserQuestion で扱いを確認する（中断 / `git stash` して main へ / 現在のブランチを base にして続行）。**明示的な承認なしに stash・checkout・reset を実行しない**

## Step 1: タスクを把握する

issue 番号が渡されたら一次情報を取得する。

```bash
gh issue view <issue-number> --json title,body,labels,comments
```

タイトル・本文（要件）、コメント（議論で追加された制約）、ラベル（bug / feature / refactor 等の種別）を読む。issue 番号ではなくタスク内容が直接渡された場合はそれを要件とする。引数が無い、または取得に失敗した場合はユーザーに要件を確認する。

続けてコードベースを探索し、変更対象のファイル・既存の実装パターン（命名・テスト構成・依存関係）・影響範囲（呼び出し元・テスト・型定義）を押さえる。要件を理解し変更の根拠を作るのに必要な範囲にとどめ、関係の薄いコードまで読み広げない。

## Step 2: 計画を立てて承認を得る（承認 ①）

**このステップの最初のアクションは `EnterPlanMode` ツールを呼ぶことだけ。** 他のツールを先に呼ばない。プランモードに入ってから、Step 1 で把握しきれていない部分があればコードベースの探索を続ける。プランモード中はファイル編集・コミット・その他の変更を一切行わない（プランファイルへの書き込みのみ許可）。計画がまとまったら `ExitPlanMode` でプランを提示してユーザーの承認を得る。

**`ExitPlanMode` は単独ターンで呼ぶ。** 同じメッセージにブランチ作成・ファイル編集・その他のツール呼び出しを含めない。`ExitPlanMode` がリジェクトされた場合（ユーザーが修正を求めた場合）は、ブランチ作成・ファイル編集など一切の実装操作を行わず、即座に `EnterPlanMode` を呼んで再びプランモードに入り計画を修正する。

ここで実装方針と PR の素材を**一度に**固めるのが、以降 PR 作成まで止まらずに進められる理由。手戻りコストが最小の今のうちに合意しておく。

計画には次を含める。Step 1 で分かったことはデフォルトとして埋めて提示し、確認の手間を減らす。

1. **ブランチ名**: 種別を反映して命名（例: `feat/add-refresh-token-rotation`, `fix/login-redirect-loop`）。「現在のブランチを base にして続行」を選んだ場合はそのブランチ名を記録し、新規作成は不要と明記する
2. **実装方針**: どのファイルをどう変更するか、設計判断の根拠を簡潔に
3. **コミット計画**: conventional commit のメッセージ一覧。1 コミット 1 関心事の粒度で、依存関係を考慮した順序にする（前提変更を先に、リファクタリングを機能追加より前に）
4. **動作確認の見通し**: PR 段階で実行する品質ゲート（Step 4 参照）と、自動検証できず手動確認が必要な項目
5. **PR メタ情報**: 対応する issue とその閉じ方（この PR で完了するなら `close #XXXX`、部分対応なら `part of #XXXX`）／変更の背景・目的／仕様書・設計ドキュメント等の関連リンク／意図的にこの PR に含めないスコープ外の事項。これらはそのまま Step 5 の PR 説明文の素材になる
6. **テストの扱い**: issue がテスト追加を含むなら計画に明示する。含まない場合も、追加するかどうかの方針を計画内で示す

## Step 3: 実装してコミットする（無停止）

**Step 2 で `ExitPlanMode` がユーザーに承認されて初めてこのステップに入る。** 承認前にブランチを切ったりファイルを変更したりしない。

承認された計画に沿って進める。途中で承認は取らず、コミットごとに何を入れたかを簡潔に伝えるだけにとどめる。

最初にブランチを切る（「現在のブランチを base にして続行」を選んだ場合は `git branch --show-current` で確認するだけ）。

```bash
git checkout -b <計画で承認したブランチ名>
```

コミット計画の各単位について、実装 → ステージング → コミットを 1 単位ずつ繰り返す。ステージングは `git add <変更したファイル>` で個別に指定する。`git add -A` / `git add .` を使わないのは、無関係な変更を巻き込んで 1 コミット 1 関心事が崩れるのを防ぐため。

### コミット規約

- 形式: `type(scope): description`（type は feat / fix / chore / refactor / docs / style / test / perf / ci / build）
- description は小文字・命令形・末尾ピリオドなし。scope は任意だが推奨
- 変更が非自明なときだけ body を付ける
- trailer に必ず `Co-Authored-By: Claude <noreply@anthropic.com>` を含める
- すでにステージ済みの変更だけをコミットする（コミット時に新しくファイルをステージしたり書き換えたりしない）

```
feat(auth): add refresh token rotation

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Step 4: 品質ゲートを通す（無停止）

`CLAUDE.md` の Quality gates を実行する。変更範囲に応じて `pnpm test && pnpm check && pnpm typecheck`、テストが不要な変更なら `pnpm verify`（typecheck + biome）を選ぶ。

- 成功したコマンドだけを、PR の「自動確認済み」に `[x]` で記載する。`[x]` を実行して成功したものに限定するのは、未確認のチェックを確認済みと読み違える事故を防ぐため
- 失敗したら原因の修正を優先し、修正もコミットする。それでも解決しなければユーザーに報告して指示を仰ぐ
- UI 操作・見た目・実環境動作・データ整合性・外部連携など自動検証できないものは「手動確認」に `[ ]` で記載する

## Step 5: PR を作成する（承認 ②）

PR の説明文・タイトル・ラベルを生成し、ユーザーの承認を得てから作成する。**本文を書き始める前に `Read` ツールで次の 2 ファイルを必ず読む**:

- `.claude/skills/implement/references/pr-description.md`（書き方ルール）
- `.github/PULL_REQUEST_TEMPLATE.md`（本文の骨格テンプレート）

説明文の素材は Step 2 で固めた PR メタ情報・コミット履歴・Step 4 の動作確認結果から組み立てる。

base branch は `--base` 引数があればそれを、なければ `main` を使う。変更内容に合うラベルを `gh label list --limit 100 --json name,description` の一覧から提案する。

**タイトル・説明文の全文・付与するラベルをユーザーに提示し、承認を得てから作成・push する。** 承認なしに PR を作成・編集しない。これがこのワークフロー唯一の「外向き」の操作なので、ここだけは必ず人の確認を通す。

承認後、追跡ブランチが無ければ push してから作成する。

```bash
git rev-parse --abbrev-ref @{u} 2>/dev/null || git push -u origin "$(git branch --show-current)"

gh pr create \
  --title "<英語タイトル>" \
  --body-file /tmp/pr-body.md \
  --assignee @me \
  --label "<label>" \
  --base "<base が main でない場合のみ>"
```

作成後、PR の URL を表示する。

## 全体の注意

- **issue の範囲を超えない**: スコープを要件に厳密に限定する。途中で気づいた別の改善は、その場で広げず新しい issue として記録する
