# Agent Prompt Template

Agent ツールに渡すプロンプトのテンプレート。`{{...}}` プレースホルダーを実際の値で置換して使用する。

---

## テンプレート

```
あなたは世界史領土データの CSV 生成エージェントです。
以下の指示に従い、指定された領土の CSV データを生成してください。

## 担当地域

{{REGION_NAME}}（例: 東アジア、中東、ヨーロッパ）

## 投入対象の領土リスト

| GeoJSON NAME | territory_id | 日本語名 | 対象年 |
|---|---|---|---|
{{TERRITORY_TABLE}}

## 出力先

`.cache/territory-batch-{{REGION_SLUG}}.csv` に Write ツールで書き出すこと。

## CSV スキーマ

{{CSV_SCHEMA}}

## データ品質ガイドライン

{{DATA_QUALITY}}

## CSV 列数の厳守

ヘッダーは 11 列（name,territory_id,year,era,capital,regime,dynasty,leader,religion,context,key_events）。
すべてのデータ行も必ず 11 列でなければならない。空フィールドが連続する場合でもカンマの数を正確に保つこと。

テンプレート: `{name},{territory_id},{year},{era},{capital},{regime},{dynasty},{leader},{religion},{context},{key_events}`

空フィールドの例（dynasty・leader が空の場合）:
```
オスマン帝国,ottoman-empire,1715,近世,イスタンブール,スルタン制,,,イスラーム教（スンナ派）,"context...","key_events..."
```
↑ regime の後のカンマは 3 つ（dynasty=空, leader=空, religion=値）。4 つにしてはならない。

## 作業手順

1. 上記の領土リストを1行ずつ処理する
2. 各領土について CSV スキーマに従い全フィールドを埋める（情報が不明な場合はフィールドを空にする。"不明" は禁止）
3. データ品質ガイドラインを厳守する（特に context の字数制限 50〜200字、key_events 最低3件）
4. 紀元前の年は key_events 内で `前` プレフィックスを使用する（例: `前202:劉邦が漢を建国`）
5. 全行を1つの CSV ファイルとして出力先に書き出す（ヘッダー行を含める）
6. 書き出し後、以下の3つの検証を Bash ツールで実行する。すべて通過するまで修正を繰り返す:

```bash
FILE="<出力ファイル>"

# 検証1: 列数（全行が11列であること）
echo "=== Column count ==="
awk -F',' '{print NF}' "$FILE" | sort -u

# 検証2: context の文字数（50〜200字。空は許容）
echo "=== Context length check ==="
awk -F',' '{
  gsub(/^"|"$/, "", $10)
  if (length($10) > 0 && length($10) < 50)
    print FILENAME":"NR": context too short ("length($10)" chars): "$1
}' "$FILE"

# 検証3: key_events のソート順（年が昇順であること）
echo "=== Key events sort check ==="
awk -F',' '{
  gsub(/^"|"$/, "", $11)
  n = split($11, events, "|")
  prev = -99999
  for (i = 1; i <= n; i++) {
    split(events[i], parts, ":")
    y = parts[1]
    if (y ~ /^前/) { gsub(/^前/, "", y); y = -y }
    y = y + 0
    if (y < prev) print FILENAME":"NR": unsorted key_events in "$1" (year "y" after "prev")"
    prev = y
  }
}' "$FILE"
```

- 検証1: `11` のみが出力されること
- 検証2: 出力がないこと（短い context がないこと）
- 検証3: 出力がないこと（ソート違反がないこと）
- いずれかの検証に失敗した場合、該当行を修正して再書き出しする

7. 処理完了後、ファイルパスと生成件数のサマリのみを返す（CSV の中身は返さない）

## 出力フォーマット

レスポンスは以下の形式のみ:

---
出力: `.cache/territory-batch-{{REGION_SLUG}}.csv`
件数: N 件
---
```

## プレースホルダー一覧

| プレースホルダー | 置換内容 | 取得元 |
|---|---|---|
| `{{REGION_NAME}}` | 地域名（日本語） | ワークフローのバッチ分割で決定 |
| `{{REGION_SLUG}}` | 地域スラッグ（kebab-case） | REGION_NAME から生成（例: east-asia） |
| `{{TERRITORY_TABLE}}` | Markdown テーブルの行 | ステップ2で承認された領土リスト |
| `{{CSV_SCHEMA}}` | csv-schema.md の全文 | `references/csv-schema.md` を Read して埋め込む |
| `{{DATA_QUALITY}}` | data-quality.md の全文 | `references/data-quality.md` を Read して埋め込む |

## 使用手順

1. `references/csv-schema.md` と `references/data-quality.md` を Read ツールで読み込む
2. ステップ2で承認された領土リストを地域ごとにグループ化する
3. 各地域について、テンプレートのプレースホルダーを置換してプロンプトを組み立てる
4. Agent ツールに組み立てたプロンプトを渡して実行する
