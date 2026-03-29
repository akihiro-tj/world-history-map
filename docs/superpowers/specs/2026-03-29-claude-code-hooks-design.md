# Claude Code Hooks 導入 設計書

## 背景

ハーネスエンジニアリングの核心原則は「プロンプトではなく仕組みで品質を強制する」こと。
現在このリポジトリの hooks は通知（PermissionRequest, Stop）のみで、品質フィードバックループが未構築。

フィードバック速度の階層: PostToolUse Hook (ms) > Pre-commit (s) > CI (min) > 人間レビュー (h)
可能な限り速いレイヤーにチェックを移動させることで、エージェントの自己修正を駆動する。

関連 Issue: #174

## スコープ

### 採用するもの

1. **PostToolUse Hook（品質フィードバックループ）**: ファイル編集時に Biome チェックを即時実行
2. **Stop Hook（完了ゲート）**: エージェント完了前に全チェック（test + check + typecheck）を実行

### スコープ外

- **PreToolUse Hook（設定ファイル保護）**: PostToolUse + Stop の2本立てで設定の安易な変更は十分検出できる。正当な編集もブロックしてしまうデメリットが大きいため、現時点では導入しない。必要になったら後から追加可能。

## 設計

### 設定場所

プロジェクト `.claude/settings.json`（git 管理対象）。
プロジェクト固有のルールであり、チームで共有可能にするためプロジェクトレベルに配置する。

### 実装方式

settings.json の `command` フィールドにシェルコマンドをインラインで記述する。
スクリプトファイルを別途作成しない。今回の規模ではインラインで十分であり、ファイル数を最小に保つ。

### 1. PostToolUse Hook

**目的**: Write/Edit 実行後に、編集されたファイルに対して `biome check` を実行し、違反を即時フィードバックする。

**対象ツール**: Write, Edit（matcher: `Write|Edit`）

**対象拡張子**: `.ts`, `.tsx`, `.js`, `.jsx`, `.css`

**動作フロー**:
1. `$TOOL_INPUT` から `file_path` を jq で取得
2. 拡張子が対象外なら正常終了（ブロックしない）
3. `biome check` を実行
4. 違反があれば exit code 非0 → `additionalContext` としてエージェントにフィードバック
5. エージェントは違反を認識し、自動修正を試みる

**設定**:
```json
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "FILE=$(echo \"$TOOL_INPUT\" | jq -r '.file_path // empty'); if [ -n \"$FILE\" ] && [[ \"$FILE\" =~ \\.(ts|tsx|js|jsx|css)$ ]]; then pnpm exec biome check \"$FILE\" 2>&1; fi",
      "timeout": 10000,
      "statusMessage": "Running Biome check..."
    }
  ]
}
```

**タイムアウト**: 10秒。単一ファイルの Biome チェックには十分な時間。

### 2. Stop Hook

**目的**: エージェントが「完了」と宣言する前に全チェックを実行し、通過しなければ完了させない。

**実行コマンド**: `pnpm test && pnpm check && pnpm typecheck`
- `pnpm test`: vitest によるユニットテスト
- `pnpm check`: `biome check .`（プロジェクト全体）
- `pnpm typecheck`: `tsc -b && pnpm --filter @world-history-map/worker exec tsc --noEmit`

**設定**:
```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "pnpm test && pnpm check && pnpm typecheck",
      "timeout": 120000,
      "statusMessage": "Running final checks (test + check + typecheck)..."
    }
  ]
}
```

**タイムアウト**: 120秒。typecheck を含むため余裕を持たせる。

### 既存 hooks との関係

グローバル `~/.claude/settings.json` に設定済みの通知系 hooks（PermissionRequest → macOS通知, Stop → macOS通知）はそのまま維持。
プロジェクトレベルとグローバルの hooks はマージされて両方実行されるため、Stop Hook では完了チェック後に通知も届く。

## 最終的な .claude/settings.json

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "FILE=$(echo \"$TOOL_INPUT\" | jq -r '.file_path // empty'); if [ -n \"$FILE\" ] && [[ \"$FILE\" =~ \\.(ts|tsx|js|jsx|css)$ ]]; then pnpm exec biome check \"$FILE\" 2>&1; fi",
            "timeout": 10000,
            "statusMessage": "Running Biome check..."
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm test && pnpm check && pnpm typecheck",
            "timeout": 120000,
            "statusMessage": "Running final checks (test + check + typecheck)..."
          }
        ]
      }
    ]
  }
}
```
