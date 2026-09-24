---
paths:
  - "src/**/*.tsx"
  - "src/app/**"
  - "src/map/**"
  - "DESIGN.md"
---

# 画面

- 色・余白・角丸・文字は DESIGN.md の front matter だけで定義し、Tailwind のクラス（`bg-surface`・`p-md` など）や MapLibre のスタイルに値を直接書かない
- DESIGN.md を変えたら `pnpm tokens` を実行し、生成された `src/app/theme.css` もコミットする
- 地図にラベル（symbol レイヤー・glyphs）を追加しない。名前は選択パネルに出す
- 地図にズームボタンなどのコントロールを置かない（デザインレビューで不要と決定）
- ロジックは React から切り離した純関数にして、Vitest で確かめられるようにする
