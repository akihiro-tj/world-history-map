# GitHub Project 初期セットアップ

一回限りのセットアップ手順。

## 前提条件

```bash
gh auth refresh -s project
```

## セットアップ手順

### 1. プロジェクト作成

```bash
gh project create --owner "@me" --title "world-history-map" --format json
```

→ 出力から `number` を取得する。

### 2. カスタムフィールド追加

```bash
# Priority フィールド
gh project field-create <NUMBER> --owner "@me" --name "Priority" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "P0: Critical,P1: High,P2: Medium,P3: Low"

# Size フィールド
gh project field-create <NUMBER> --owner "@me" --name "Size" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "XS,S,M,L,XL"
```

### 3. Backlog ステータス追加

デフォルトの Status フィールドに Backlog を追加する。
GitHub UI から追加するか、GraphQL API を使用する。

### 4. リポジトリをリンク

```bash
gh project link <NUMBER> --owner "@me" --repo world-history-map
```

### 5. 既存 Issue をプロジェクトに追加

```bash
gh issue list --state open --json url --jq '.[].url' | while read url; do
  gh project item-add <NUMBER> --owner "@me" --url "$url"
done
```
