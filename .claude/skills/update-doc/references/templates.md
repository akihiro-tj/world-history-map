# ドキュメントフォーマット

4 つのドキュメントそれぞれの構成ルール。
分量の目安は守る — 超過しそうなら詳細を削り、構造の説明に戻す。

## 共通ルール

- ASCII 図のみ（Mermaid 禁止）。1 図あたりノード 7 個以内
- 表は使わない。箇条書きか短い散文で書く
- バージョン番号・コマンド一覧・ファイルの網羅的リストは書かない
- 型定義はフィールド名だけ列挙する（型アノテーション不要）
- 各ファイルの先頭に `> Last updated: YYYY-MM-DDTHH:MM:SS+09:00` を置く（ISO 8601、タイムゾーンオフセット付き）。git log の `--since` に直接渡せる精度を保つため、日付だけでなく時刻まで含めること
- 各ドキュメントのセクション構成は下記テンプレートの通り。操作や挙動の情報はそれぞれの該当セクションに収める

---

## docs/overview.md

全 150 行以内。プロダクトを初めて触る人が 5 分で全体像を掴める入り口。
個々のアプリの深掘りはしない — 「詳細は [docs/pipeline.md](./pipeline.md) を参照」の形で詳細ファイルへ送る。

### 構成

```markdown
# コードベース概要

> Last updated: YYYY-MM-DDTHH:MM:SS+09:00

## このアプリは何か

1〜2 文でプロダクトの概要と、ユーザーが何をするアプリなのかを説明。

## アプリ構成

3 つのアプリ（pipeline / frontend / worker）の関係を ASCII 図で示す。
外部データソース（GitHub, Notion）と配信基盤（R2）との接続も図に含める。
図の下に 1 段落で補足。

## データの流れ

どこから入って、どう変換され、どこで描画されるか。
pipeline の役割を 2〜3 行、frontend の役割を 2〜3 行、worker の役割を 2〜3 行。
各アプリの詳細は該当するドキュメントへリンク。

## 中核の型

pipeline / frontend 間で共有される型をフィールド名のみで列挙。
ここは「JSON ファイルが事実上のスキーマ契約」であることを明示する要所。

## データファイル（public/data/）

実行時に参照される JSON ファイルの役割を箇条書き 3〜5 項目で。
```

---

## docs/pipeline.md

150-250 行。`apps/pipeline` だけを読めば完結した理解が得られる章。

### 構成

```markdown
# pipeline: データパイプライン

> Last updated: YYYY-MM-DDTHH:MM:SS+09:00

## 役割

pipeline が何を担うか 2〜3 文で。入出力の大枠。

## データの流れ

系統ごと（地図タイル / 領土説明 など）にステージ列を ASCII 図で示す。
各ステージ 1 行の説明。

## ステージの責務

各ステージが何を受け取り何を出すか、1 ステージ 2〜3 行で。
実装詳細（具体的なライブラリ呼び出し等）には踏み込まない。

## 増分処理

ハッシュによる差分検知の仕組みと、状態ファイル（.cache/pipeline-state.json）の役割。
再実行時の挙動、強制再ビルドの方法。

## 外部依存

- データソース（GitHub リポジトリ、Notion DB）
- 外部ツール（tippecanoe, wrangler 等）
- デプロイ先（R2, public/data/）

それぞれの役割を箇条書きで。

## 運用シナリオ

特定年だけ処理する、Notion の説明文を更新するなど、実際に pipeline を触るシナリオの流れ。
手順ではなく「何が起きるか」を書く。
```

---

## docs/frontend.md

150-250 行。`apps/frontend` だけを読めば状態と描画の繋がりが理解できる章。

### 構成

```markdown
# frontend: React アプリケーション

> Last updated: YYYY-MM-DDTHH:MM:SS+09:00

## 役割

frontend が何を担うか 2〜3 文で。ユーザー接点と地図描画の位置づけ。

## 状態設計

状態の層構造を ASCII 図で示す。
AppStateContext / カスタム hooks / MapLibre 内部状態、それぞれがどう連携するか。
各層の主要な状態をフィールド名で列挙。

## Context と hooks

AppStateContext の持つ状態とアクション。
主要なカスタム hooks がそれぞれ何をラップしているか。

## MapLibre 統合

PMTiles URL の組み立て方（dev / prod の環境差）、projection 切替、主要なレイヤー構成。
環境差の部分は「dev は public/ 直接参照、prod は Worker 経由」という構造の違いに触れる。

## 主要フロー

- 年を選んだとき何が起きるか（イベント → 状態更新 → 副作用）
- 領土をクリックしたとき何が起きるか
- 投影法を切り替えたとき何が起きるか

それぞれ箇条書きで 4〜6 ステップ。
```

---

## docs/worker.md

150-250 行。`apps/worker` だけを読めば配信基盤の全体像が掴める章。

### 構成

```markdown
# worker: Cloudflare Worker

> Last updated: YYYY-MM-DDTHH:MM:SS+09:00

## 役割

Worker が何を担うか 2〜3 文で。R2 とクライアントの間で何をするか。

## エンドポイント

各ルートが何を返すか。`manifest.json` と `world_{year}.{hash}.pmtiles` の役割の違い。
Range Request 対応の意味。

## キャッシュ戦略

manifest と PMTiles でキャッシュ寿命が異なる理由（ハッシュ付きファイル名による cache busting）。
`Cache-Control` ヘッダの設計。

## バインディングと環境

wrangler.toml に定義される R2 バインディング、環境変数、CORS 設定。
`ALLOWED_ORIGINS` のワイルドカード対応の意図に触れる。

## 配信シナリオ

クライアントがタイルを要求してから返るまでの流れ。
miss / hit の挙動の違い。
```
