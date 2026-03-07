# 領土選定ガイド

## 選定基準

1. **教科書基準**: 日本の高校世界史教科書（山川出版社『詳説世界史』レベル）に登場する国家・帝国・文明（詳細な知識レベルの判断基準は [data-quality.md](./data-quality.md) の「知識レベル」セクションを参照）
2. **地域バランス**: ヨーロッパに偏らず、アジア・中東・アフリカ・南北アメリカをカバーする
3. **時代カバレッジ**: 古代（-500）から現代（2000）まで各時代を網羅する
4. **データ品質**: 選定したすべての領土で profile（2 フィールド以上）、context、keyEvents（3 件以上）を持つこと

## 除外カテゴリ

- 先住民族・部族領土（例: オーストラリア先住民族、北米先住民族）
- 植民地の細分化（例: "Cuba (Spain)"、"Ceylon (Dutch)"）
- 教科書に登場しない小規模な都市国家
- 十分な歴史データがない領土

## 推奨領土リスト（参考例）

### 古代（-500 〜 -1）
| GeoJSON NAME | territory_id | 日本語名 | 利用可能年 |
|---|---|---|---|
| Achaemenid Empire | achaemenid-empire | アケメネス朝ペルシア | -500, -400 |
| Rome | rome | ローマ | -500 〜 400 |
| Greek city-states | greek-city-states | ギリシア都市国家群 | -500, -400, -323 |
| Magadha | magadha | マガダ国 | -500, -400, -323, -300 |
| Maurya Empire | maurya-empire | マウリヤ朝 | -300, -200 |
| Qin | qin | 秦 | -300, -200 |
| Han Empire | han-empire | 漢 | -200, -100, -1, 100 |
| Carthaginian Empire | carthaginian-empire | カルタゴ | -500, -400, -323, -300, -200 |
| Ptolemaic Egypt | ptolemaic-egypt | プトレマイオス朝エジプト | -323, -300, -200, -100 |
| Seleucid Empire | seleucid-empire | セレウコス朝 | -323, -300, -200, -100 |
| Axum | axum | アクスム王国 | -1, 100 〜 900 |

### 古代末期・初期中世（100〜900）
| GeoJSON NAME | territory_id | 日本語名 | 利用可能年 |
|---|---|---|---|
| Roman Empire | roman-empire | ローマ帝国 | 100 〜 400 |
| Sassanid Empire | sassanid-empire | ササン朝ペルシア | 200 〜 600 |
| Gupta Empire | gupta-empire | グプタ朝 | 300, 400 |
| Byzantine Empire | byzantine-empire | ビザンツ帝国 | 400 〜 1400 |
| Tang Empire | tang-empire | 唐 | 600, 700, 800, 900 |
| Umayyad Caliphate | umayyad-caliphate | ウマイヤ朝 | 700 |
| Abbasid Caliphate | abbasid-caliphate | アッバース朝 | 800, 900, 1000, 1100, 1200 |
| Frankish kingdoms | frankish-kingdoms | フランク王国 | 500, 600, 700, 800 |
| Ghana Empire | ghana-empire | ガーナ王国 | 800, 900, 1000 |

### 盛期中世（1000〜1400）
| GeoJSON NAME | territory_id | 日本語名 | 利用可能年 |
|---|---|---|---|
| Song Empire | song-empire | 宋 | 1000, 1100, 1200 |
| Holy Roman Empire | holy-roman-empire | 神聖ローマ帝国 | 1000 〜 1800 |
| England | england | イングランド | 1000 〜 1530 |
| France | france | フランス | 1000 〜 2010 |
| Mongol Empire | mongol-empire | モンゴル帝国 | 1200, 1279, 1300 |
| Mali Empire | mali-empire | マリ帝国 | 1279, 1300, 1400 |
| Delhi Sultanate | delhi-sultanate | デリー・スルタン朝 | 1200, 1279, 1300, 1400 |
| Khmer Empire | khmer-empire | クメール帝国 | 800 〜 1400 |
| Majapahit | majapahit | マジャパヒト王国 | 1300, 1400 |

### 近世（1400〜1800）
| GeoJSON NAME | territory_id | 日本語名 | 利用可能年 |
|---|---|---|---|
| Ottoman Empire | ottoman-empire | オスマン帝国 | 1300 〜 1920 |
| Ming Empire | ming-empire | 明 | 1400 〜 1600 |
| Qing Empire | qing-empire | 清 | 1650 〜 1900 |
| Mughal Empire | mughal-empire | ムガル帝国 | 1530 〜 1800 |
| Tokugawa Shogunate | tokugawa-shogunate | 江戸幕府 | 1600 〜 1815 |
| Spain | spain | スペイン | 1530 〜 2010 |
| Portugal | portugal | ポルトガル | 1400 〜 2010 |
| Austrian Empire | austrian-empire | オーストリア帝国 | 1650 〜 1815 |
| Russia | russia | ロシア | 1500 〜 2010 |
| Safavid Empire | safavid-empire | サファヴィー朝 | 1530, 1600, 1650, 1700 |
| Songhai | songhai | ソンガイ帝国 | 1492, 1500, 1530 |
| Inca Empire | inca-empire | インカ帝国 | 1400, 1492, 1500 |
| Aztec Empire | aztec-empire | アステカ帝国 | 1400, 1492, 1500 |
| Ayutthaya | ayutthaya | アユタヤ朝 | 1400 〜 1715 |
| Joseon | joseon | 朝鮮（李朝） | 1400 〜 1900 |
| Ethiopia | ethiopia | エチオピア帝国 | 1400 〜 2010 |
| Vijayanagar Empire | vijayanagar-empire | ヴィジャヤナガル王国 | 1400 〜 1600 |
| Prussia | prussia | プロイセン | 1700 〜 1880 |

### 近現代（1800〜2010）
| GeoJSON NAME | territory_id | 日本語名 | 利用可能年 |
|---|---|---|---|
| United Kingdom | united-kingdom | イギリス | 1815 〜 2010 |
| United States | united-states | アメリカ合衆国 | 1783 〜 2010 |
| Japan | japan | 日本 | 1880 〜 2010 |
| Germany | germany | ドイツ | 1880 〜 2010 |
| Italy | italy | イタリア | 1880 〜 2010 |
| China | china | 中国 | 1920 〜 2010 |
| India | india | インド | 1945 〜 2010 |
| Brazil | brazil | ブラジル | 1815 〜 2010 |
| Egypt | egypt | エジプト | 1920 〜 2010 |
| South Africa | south-africa | 南アフリカ | 1920 〜 2010 |
| Soviet Union | soviet-union | ソビエト連邦 | 1920 〜 1994 |
| Korea | korea | 朝鮮 | 1900, 1914, 1920, 1930, 1938, 1945 |

## 重要: 作成前に必ず検証する

Notion ページを作成する前に、対象年の GeoJSON にその領土が存在することを確認する:

```bash
jq '.years[] | select(.year == 年) | .countries | map(select(. == "NAME"))' apps/frontend/public/pmtiles/index.json
```

GeoJSON の領土名は大文字小文字を区別する。index.json のスペルをそのまま使用すること。

## バッチ戦略

地域バッチ単位で処理し、一貫性を保つ:
1. 東アジア（中国王朝、日本、朝鮮）
2. 南・東南アジア（インド王朝、クメール、アユタヤなど）
3. 中東（ペルシア王朝、オスマン帝国、カリフ朝）
4. ヨーロッパ（ローマ、フランス、イングランド、神聖ローマ帝国など）
5. アフリカ（アクスム、ガーナ、マリ、ソンガイ、エチオピア、エジプト）
6. アメリカ（アステカ、インカ、アメリカ合衆国、ブラジル）
7. 近現代（全地域、1800〜2010）
