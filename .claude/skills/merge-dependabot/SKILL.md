---
name: merge-dependabot
description: >
  Open な Dependabot PR を一括で整理・マージする。
  CI ステータス確認、マージ順序の提案、コンフリクト時の rebase リクエスト、
  CI 待ち → 再マージを一連のフローで実行する。
disable-model-invocation: true
---

# Dependabot PR マージ

Dependabot の open PR を一括で整理・マージする。

## フロー

### 1. 一覧取得と分類

```bash
gh pr list --author "app/dependabot" --state open \
  --json number,title,createdAt,mergeable,mergeStateStatus,headRefName \
  --jq '.[] | "\(.number)\t\(.title)\t\(.mergeable)\t\(.mergeStateStatus)"'
```

各 PR の CI ステータスを取得:

```bash
gh pr checks <NUMBER> --json name,state,bucket \
  --jq '.[] | "\(.name)\t\(.state)\t\(.bucket)"'
```

以下の軸で分類する:

| 分類 | 条件 | アクション |
|------|------|-----------|
| 即マージ可 | CI 全パス + minor/patch | 優先マージ |
| 要確認 | CI 全パス + **major** | ユーザーに確認後マージ |
| CI 失敗 | テスト/ビルド失敗 | 関連 PR マージ後に再確認、またはクローズ提案 |
| コンフリクト | mergeable=CONFLICTING | `@dependabot rebase` で解消試行 |

### 2. マージ順序の決定と提案

安全な順序をユーザーに提案する。原則:

1. GitHub Actions の更新を先にマージ（他に影響しない）
2. production dependencies の minor/patch
3. dev-dependencies の minor/patch グループ
4. major バージョンアップ（依存関係を考慮して順序決定）
5. CI 失敗の PR は関連 PR マージ後に再評価

**ユーザーの承認を得てからマージを開始する。**

### 3. 順次マージ

```bash
gh pr merge <NUMBER> --merge
```

- マージ後に次の PR がコンフリクトする場合がある → `@dependabot rebase` で対応
- rebase リクエスト後、30秒間隔で mergeable ステータスをポーリング
- MERGEABLE になったら CI 完了を待ってからマージ

### 4. rebase + CI 待ちパターン

```bash
gh pr comment <NUMBER> --body "@dependabot rebase"
```

ポーリング:

```bash
gh pr view <NUMBER> --json mergeable,mergeStateStatus --jq '.'
```

- `CONFLICTING` → 30秒待って再チェック（最大5回）
- `MERGEABLE` → CI チェックを確認

```bash
gh pr checks <NUMBER> --json name,state,bucket \
  --jq '.[] | "\(.name)\t\(.state)\t\(.bucket)"'
```

- 主要チェック（Lint, Type Check, Unit Tests, Build）が全パスならマージ可
- Cloudflare Pages 等のデプロイ系は待たなくてよい

### 5. 結果報告

全 PR の最終ステータスを表形式で報告する。
