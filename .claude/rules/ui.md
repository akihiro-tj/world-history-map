---
paths:
  - "src/**/*.tsx"
  - "src/app/**"
  - "src/map/**"
  - "DESIGN.md"
---

# 画面

- 文言は `src/app/copy.ts` の `COPY` だけを使う。足すときは spec §7 を先に更新してユーザーの承認を得る
- 色・余白・角丸は DESIGN.md のトークン（Tailwind の `bg-surface`・`p-md` など）を使う。値を直接書かない
- 地図にラベル（symbol レイヤー・glyphs）を追加しない。名前は選択パネルに出す
- 地図にズームボタンなどのコントロールを置かない（デザインレビューで不要と決定）
- ロジックは React から切り離した純関数にして Vitest で確かめる。見た目と操作は実ブラウザで確かめる
