# world-history-atlas Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-29

## Active Technologies

- TypeScript 5.9.x (strict mode) + React 19.x, MapLibre GL JS + react-map-gl v8 + PMTiles (001-interactive-history-map)
- UI: shadcn/ui + Tailwind v4
- Build: Vite 7.x
- Linter/Formatter: Biome 2.x
- Testing: Vitest 4.x + Playwright 1.57.x
- Runtime: Node.js 22.x (LTS)
- Package Manager: pnpm

## Project Structure

```text
src/
tests/
```

## Commands

pnpm test && pnpm check

## Code Style

TypeScript 5.9.x (strict mode): Follow standard conventions

## Recent Changes

- 001-interactive-history-map: Added TypeScript 5.9.x (strict mode) + React 19.x, MapLibre GL JS + react-map-gl v8

<!-- MANUAL ADDITIONS START -->

## /speckit.implement ワークフロー

`/speckit.implement` コマンドでタスクを実行する際は、以下のワークフローに従うこと:

### 1. ブランチ作成

- タスク開始前に適切なブランチを作成する
- ブランチ名は `task/TXXX-task-name` 形式（例: `task/T002-setup-biome`）
- constitution のブランチ戦略に従うこと

### 2. 実装

- タスクの実装を完了させる
- テストファースト（TDD）を遵守する
- コミットは適切な粒度で分割する

### 3. PR 作成

タスク完了後、以下の設定で PR を作成する:

- **Base branch**: `main`
- **Assignee**: `akihiro-tj`
- **Labels**: タスク内容に応じて適切なラベルを選択
  - `enhancement`: 新機能や改善
  - `bug`: バグ修正
  - `documentation`: ドキュメント関連
  - `refactor`: リファクタリング
  - `test`: テスト関連
- **Title**: conventional commit 形式（例: `feat(T001): add map component`）
- **Body**: 日本語で記述し、`Closes #<issue番号>` を含めてマージ時に関連 issue を自動クローズする

```bash
gh pr create \
  --title "feat(TXXX): 説明" \
  --body "## 概要\n\n...\n\nCloses #123" \
  --assignee akihiro-tj \
  --label <適切なラベル>
```

<!-- MANUAL ADDITIONS END -->
