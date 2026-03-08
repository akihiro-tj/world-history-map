---
name: product-discovery
description: >
  プロダクトの改善機会を体系的に発見するスキル。コードベース分析と PM 理論
  (JTBD, ヒューリスティクス評価, RICE, Kano, OST) を組み合わせ、
  優先順位付きの改善提案を生成する。
  create-issue や speckit と連携し、発見から実装計画まで一貫したフローを提供。
  トリガー: "プロダクト改善", "機能提案を考えたい", "何を改善すべきか",
  "product discovery", "improvement ideas", "what should we build next",
  "次に何を作るべきか"
---

# Product Discovery

コードベース分析と PM フレームワークを組み合わせて、プロダクトの改善機会を体系的に発見する。

## フロー

### 1. コンテキストを収集する

以下を自動で収集し、プロダクトの全体像を把握する。

1. プロジェクト構造をスキャンする（`apps/` 配下のディレクトリ、主要コンポーネント）
2. 既存仕様を確認する（`specs/` 配下の spec.md, plan.md）
3. GitHub Issues を取得する（`gh issue list --state open --limit 30`）
4. 技術スタックを把握する（package.json、設定ファイル）
5. CLAUDE.md からプロジェクトの方針を確認する

収集結果の要約をユーザーに提示し、認識のずれがないか確認する。

### 2. 分析観点を選択する

AskUserQuestion で焦点を選択してもらう。

選択肢:
- a) 総合分析 — 全フレームワークを適用する包括的な分析（初回推奨）
- b) UX 改善 — Nielsen ヒューリスティクスを中心に UI/UX の課題を特定する
- c) 機能拡張 — JTBD 分析を中心に未充足のユーザーニーズを発見する
- d) 技術的改善 — コードベース分析を中心に DX やパフォーマンスの改善点を特定する
- e) 特定ジョブの深掘り — ユーザーが指定するジョブ/課題を深く分析する

### 3. フレームワークを適用する

選択された観点に応じてリファレンスを読み、コードベースを分析する。

| 観点 | 適用するフレームワーク | リファレンス |
|------|----------------------|-------------|
| 総合分析 | 全フレームワーク | 全リファレンス |
| UX 改善 | ヒューリスティクス評価 + JTBD（補助） | [ux-heuristics.md](references/ux-heuristics.md), [codebase-analysis-guide.md](references/codebase-analysis-guide.md) |
| 機能拡張 | JTBD + Kano | [jtbd-analysis.md](references/jtbd-analysis.md), [kano-classification.md](references/kano-classification.md) |
| 技術的改善 | コードベース分析 | [codebase-analysis-guide.md](references/codebase-analysis-guide.md) |
| 特定ジョブの深掘り | JTBD + ヒューリスティクス | [jtbd-analysis.md](references/jtbd-analysis.md), [ux-heuristics.md](references/ux-heuristics.md) |

分析手順:
1. 該当するリファレンスファイルを Read ツールで読み込む
2. リファレンスの手順に従い、コードベースを走査・分析する
3. 発見した機会を一覧化する

中間報告としてここまでの発見をユーザーに提示し、洞察や訂正を収集する。

### 4. 機会を構造化し優先順位をつける

1. [opportunity-solution-tree.md](references/opportunity-solution-tree.md) を読み、Outcome → Opportunity → Solution の木構造で整理する
2. [kano-classification.md](references/kano-classification.md) を読み、各機会を Must-be / One-dimensional / Attractive に分類する
3. [rice-scoring.md](references/rice-scoring.md) を読み、RICE スコアで優先順位をつける
4. AskUserQuestion でユーザーの視点を反映する:
   - スコアの妥当性確認
   - ビジネス上の制約や優先事項の反映
   - 対象外にすべき機会の除外

### 5. アウトプットを生成する

AskUserQuestion で出力形式を選択してもらう。

選択肢:
- a) GitHub Issues 起票 — 上位の機会を create-issue スキルに渡して Issue 化する
- b) ディスカバリーレポート — [discovery-report-template.md](assets/discovery-report-template.md) に従い `specs/` に保存する
- c) 機会一覧テーブル — [opportunity-table-template.md](assets/opportunity-table-template.md) に従い一覧を出力する
- d) speckit 入力 — 最優先の機会を speckit specify に渡せる形式で出力する

## リファレンスファイル

- [jtbd-analysis.md](references/jtbd-analysis.md) — JTBD 概念、ジョブマップ作成手順、充足度評価
- [ux-heuristics.md](references/ux-heuristics.md) — Nielsen 10 ヒューリスティクス、チェックポイント、重大度スケール
- [rice-scoring.md](references/rice-scoring.md) — RICE 各軸の定義、採点基準、Effort 推定方法
- [kano-classification.md](references/kano-classification.md) — 3 品質カテゴリの定義、分類判断基準
- [opportunity-solution-tree.md](references/opportunity-solution-tree.md) — OST 構造、構築手順、出力フォーマット
- [codebase-analysis-guide.md](references/codebase-analysis-guide.md) — ユーザーフロー/UI/データ/パフォーマンス/DX チェックリスト

## テンプレート

- [discovery-report-template.md](assets/discovery-report-template.md) — ディスカバリーレポートの出力テンプレート
- [opportunity-table-template.md](assets/opportunity-table-template.md) — 機会一覧テーブルの出力テンプレート
