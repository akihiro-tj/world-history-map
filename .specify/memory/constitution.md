<!--
  SYNC IMPACT REPORT
  ====================
  Version: 1.0.0 (initial creation)

  Sections:
    - Core Principles (5 principles)
    - Development Workflow
    - Governance

  Templates Status:
    ✅ plan-template.md - Constitution Check section will use these principles
    ✅ spec-template.md - No constitution-specific updates needed
    ✅ tasks-template.md - No constitution-specific updates needed
    ✅ checklist-template.md - No constitution-specific updates needed

  Follow-up TODOs: None
-->

# World History Atlas Constitution

## Core Principles

### I. テストファースト (Test-First)

全ての機能実装において、TDD（テスト駆動開発）を必須とする。

- テストを**先に**書き、失敗することを確認してから実装を開始すること
- Red-Green-Refactor サイクルを厳守すること
- テストがないコードの本番マージは禁止

**根拠**: テストファーストにより、実装前に仕様が明確化され、リグレッションを防止できる。
このWebアプリケーションは複雑な地理・時系列データを扱うため、堅牢なテストカバレッジが不可欠。

### II. シンプルさと型安全性 (Simplicity & Type Safety)

YAGNI原則を遵守し、TypeScriptの厳密な型付けを徹底する。

- 「今必要ない」機能は実装しないこと
- `strict: true` を有効にし、`any` の使用は禁止
- 過度な抽象化を避け、最小限の複雑さで要件を満たすこと
- 将来の仮想要件のための設計は行わないこと

**根拠**: 型安全性はランタイムエラーを事前に防止し、コードの保守性を高める。
シンプルさは開発速度と品質の両立を可能にする。

### III. コンポーネント駆動とアクセシビリティ (Component-Driven & Accessibility)

再利用可能なコンポーネントで構築し、アクセシビリティを最初から考慮する。

- UIは独立した、再利用可能なコンポーネントとして設計すること
- WCAG 2.1 AA準拠を最低基準とすること
- キーボード操作、スクリーンリーダー対応を必須とすること
- 色覚多様性に配慮したデザインを採用すること

**根拠**: あらゆるユーザーがアクセスできることは、Webアプリケーションとして重要な品質要件である。
コンポーネント駆動は保守性を高める。

### IV. 歴史的正確性と出典明記 (Historical Accuracy & Source Citation)

表示する全ての歴史データは、信頼できる出典に基づき、明確に出典を記載する。

- 全ての歴史的事実・データには出典を**必須**で付与すること
- 学術的に信頼できるソースを優先すること
- 出典が不明確または議論のある情報はその旨を明示すること
- データモデルは出典情報を格納できる構造とすること

**根拠**: 歴史データを扱う以上、情報の信頼性はプロジェクトの価値に直結する。
誤った情報の提供はユーザーの誤解を招く可能性がある。

### V. パフォーマンスと継続的改善 (Performance & Continuous Improvement)

地図描画のスムーズな体験を確保し、継続的にコードベースを改善する。

- 地図操作は60fps以上を維持すること
- 大量の歴史データでも応答性を確保すること
- 技術的負債は計画的に解消すること
- リファクタリングは常に意識し、コードの健全性を維持すること

**根拠**: 地図アプリケーションはパフォーマンスがUXに直結する。
継続的改善により、長期的なプロジェクトの持続可能性を確保する。

## Development Workflow

### ブランチ戦略

- `main`: 本番環境相当、常に安定状態
- タスクブランチ: `task/###-task-name` 形式（例: `task/001-setup-project`）
- タスク単位でブランチを切り、PRを作成してマージする
- PRマージ前にCIが全てパスすることを必須とする

### 品質ゲート

- テストカバレッジ目標: 80%以上
- TypeScriptコンパイルエラー: 0
- Biomeエラー: 0
- アクセシビリティ自動チェック: パス必須

### 並列タスク実行

tasks.mdで `[P]` マークが付いたタスクは、他の `[P]` タスクと並列実行可能である。

並列実行には [git-worktree-runner (gtr)](https://github.com/coderabbitai/git-worktree-runner) を使用する:

```bash
# 各[P]タスクごとに独立したワークツリーを作成
git gtr new task/T003-biome-setup
git gtr new task/T004-tailwind-setup
git gtr new task/T005-shadcn-init

# 各ワークツリーでAIエージェントを起動（並列実行）
git gtr ai task/T003-biome-setup
git gtr ai task/T004-tailwind-setup
git gtr ai task/T005-shadcn-init

# 完了後、PRを作成してワークツリーを削除
git gtr rm task/T003-biome-setup
```

**並列実行の制約**:
- 同一フェーズ内の `[P]` タスクのみ並列実行可能
- 依存関係のあるタスクは順次実行すること
- 各ワークツリーは独立したブランチで作業すること
- マージ時のコンフリクトに注意すること

## Governance

### 本コンスティチューションの適用

本コンスティチューションは、プロジェクト内の全ての開発活動に適用される。
他のドキュメントやプラクティスと矛盾する場合、本コンスティチューションが優先する。

### 改訂手順

1. 改訂提案はPRとして提出すること
2. 全ての改訂は理由を明記すること
3. 改訂は関係者のレビューを経て承認されること
4. 改訂履歴を本ドキュメントに記録すること

### バージョニング規則

- **MAJOR**: 原則の削除・根本的な再定義
- **MINOR**: 新しい原則・セクションの追加、既存内容の重要な拡張
- **PATCH**: 誤字修正、表現の明確化、軽微な調整

### コンプライアンス確認

- 全てのPRは本コンスティチューションの原則への準拠を確認すること
- 原則違反が発見された場合は、修正を優先すること
- 複雑さの追加は正当化を必要とし、`plan.md` のComplexity Trackingに記録すること

**Version**: 1.1.0 | **Ratified**: 2025-11-29 | **Last Amended**: 2025-11-29
