# world-history-map Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-29

## Active Technologies

- TypeScript 5.9.x (strict mode) + React 19.x, MapLibre GL JS + react-map-gl v8 + PMTiles (001-interactive-history-map)
- UI: Tailwind v4
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

- TypeScript 5.9.x (strict mode): Follow standard conventions
- ディレクトリ名・ファイル名: ケバブケース（例: `year-selector.tsx`, `use-map-state.ts`）
- コメント・ログ出力: 英語で記述（JSDoc、インラインコメント、シェルスクリプトのログ含む）

## Recent Changes

- 001-interactive-history-map: Added TypeScript 5.9.x (strict mode) + React 19.x, MapLibre GL JS + react-map-gl v8

<!-- MANUAL ADDITIONS START -->

## /speckit.implement ワークフロー

`/speckit.implement` コマンドでタスクを実行する際は、以下のワークフローに従うこと:

### 共通ルール

#### ブランチ名

`phase/PX-phase-name` 形式（例: `phase/P1-project-setup`）

#### 実装

- 作業着手時にリポジトリのissue一覧から該当フェーズのissueを確認し、PR作成時の `Closes #<issue番号>` に使用する
- テストファースト（TDD）を遵守する
- コミットはタスク単位など適切な粒度で分割する

#### PR 作成

フェーズ完了後、以下の設定で PR を作成する:

- **Base branch**: `main`
- **Assignee**: `akihiro-tj`
- **Labels**: フェーズ内容に応じて適切なラベルを選択
  - `enhancement`: 新機能や改善
  - `bug`: バグ修正
  - `documentation`: ドキュメント関連
  - `refactor`: リファクタリング
  - `test`: テスト関連
- **Title**: conventional commit 形式（例: `feat(P1): setup project infrastructure`）
- **Body**: 日本語で記述し、フェーズ内の全issueに対して `Closes #<issue番号>` を含めてマージ時に関連 issue を自動クローズする

```bash
gh pr create \
  --title "feat(PX): 説明" \
  --body "## 概要\n\n...\n\nCloses #1\nCloses #2\nCloses #3" \
  --assignee akihiro-tj \
  --label <適切なラベル>
```

### フェーズの実行

```bash
git checkout main && git pull origin main
git checkout -b phase/P1-project-setup
# フェーズ内の全タスクを実装 → PR作成
```

<!-- MANUAL ADDITIONS END -->
