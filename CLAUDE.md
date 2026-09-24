# 世界史地図

受験生・学習者向けに、世界史の地名を地図で確かめる Web アプリ。

## 言語

- コミットメッセージと GitHub Actions のワークフロー・ジョブ・ステップ名は英語
- UI 文言・ドキュメント・コード内コメント・テスト名・PR・イシューは日本語

## 守ること

- 利用者や検索エンジンの目に触れるコンテンツは、自分で考えて作らない。UI 文言・title・meta description・OGP・favicon などの画像・robots.txt が対象。必要になったら、実装する前に内容の案を示してユーザーの承認を得る。いま承認済みなのは `src/app/copy.ts` と `index.html` にあるものだけ
- `docs/superpowers/specs/` の spec は作成時点の記録で、書き換えない。新しい機能や大きな変更は新しい spec を作り、変更の理由は PR の本文に書く（ADR は作らない）
- npm script に `deploy` という名前を付けない（pnpm の組み込みコマンドに取られて何も起きない）

## 環境

- タイル生成は tippecanoe が要るので `nix develop -c pnpm tiles:build` で実行する

## 検証

- ロジックは Vitest（node 環境）で確かめる。E2E テストは作らない
- UI を変えたら、実ブラウザで PC 幅と 375px 幅の両方を確かめる。MapLibre 6 は WebGL2 が必須なので、headless Chromium には `--use-angle=swiftshader --enable-unsafe-swiftshader` を付ける
