# 世界史地図

受験生・学習者向けに、世界史の地名を地図で確かめる Web アプリ。

共通のルールは akihiro-tj/house-rules から APM で入れている（`.claude/rules/` の多くは生成物。`apm.yml` を参照）。

## 守ること

- 都市データも、利用者の目に触れるコンテンツとして扱う。自分で考えて足したり変えたりせず、案を示して承認を得る

## 検証

- MapLibre 6 は WebGL2 が必須なので、headless Chromium には `--use-angle=swiftshader --enable-unsafe-swiftshader` を付ける
