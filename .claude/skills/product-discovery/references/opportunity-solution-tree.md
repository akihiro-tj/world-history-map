# Opportunity Solution Tree (OST) 構造化手順

## OST の構造

```
Outcome（成果目標）
├── Opportunity（機会）
│   ├── Solution（解決策 A）
│   └── Solution（解決策 B）
├── Opportunity（機会）
│   └── Solution（解決策 C）
└── Opportunity（機会）
    ├── Solution（解決策 D）
    └── Solution（解決策 E）
```

- **Outcome**: プロダクトが達成すべきビジネス/ユーザー成果
- **Opportunity**: Outcome 達成を妨げている課題やニーズ（JTBD の Under-served ジョブに対応）
- **Solution**: 各 Opportunity に対する具体的な解決策（実装可能な機能・改善）

## 構築手順

### Step 1: Outcome の設定

プロダクトビジョンやユーザーリサーチから成果目標を設定する。

良い Outcome の条件:
- 測定可能である
- ユーザー行動の変化として表現される
- プロダクトチームがコントロールできる範囲にある

### Step 2: Opportunity の列挙

JTBD 分析やヒューリスティクス評価の結果から Opportunity を抽出する。

Opportunity の記述ルール:
- ユーザー視点で記述する（「〜できない」「〜しにくい」）
- 解決策を含めない（手段ではなく課題を記述する）
- 十分に具体的である（検証可能なレベル）

### Step 3: Solution の生成

各 Opportunity に対して複数の Solution を生成する。

Solution の記述ルール:
- 実装可能な具体性がある
- コードベースの構造を踏まえている
- 1 つの Solution は 1 つの Opportunity にのみ紐づく

### Step 4: 優先順位付け

RICE スコアや Kano 分類を使って Opportunity と Solution に優先順位をつける。

## 出力フォーマット

```markdown
## Outcome: [成果目標]

### Opportunity 1: [課題/ニーズ]
- **Solution 1a**: [解決策] — RICE: X.X / Kano: [分類]
- **Solution 1b**: [解決策] — RICE: X.X / Kano: [分類]

### Opportunity 2: [課題/ニーズ]
- **Solution 2a**: [解決策] — RICE: X.X / Kano: [分類]
```
