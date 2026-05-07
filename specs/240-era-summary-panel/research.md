# Phase 0 Research: 年代サマリーパネル

**Feature**: 年代サマリーパネル
**Date**: 2026-05-07
**Input**: [plan.md](./plan.md) の Phase 0 Research Topics

## 1. 地域区分の具体集合

### Decision

サマリーは **7 区分** で構成する：

1. **ヨーロッパ**（西欧・南欧・北欧・東欧を含む。ロシア西部含む）
2. **東アジア**（中国・朝鮮半島・日本・モンゴル・ベトナム北部）
3. **東南アジア**（タイ・ビルマ・マレー半島・インドネシア・フィリピン・ベトナム南部）
4. **南アジア**（インド亜大陸・スリランカ）
5. **中東・北アフリカ**（西アジア・アラビア半島・エジプト・マグレブ）
6. **サブサハラ・アフリカ**（西アフリカ・東アフリカ・中央アフリカ・南アフリカ）
7. **南北アメリカ**（北米・中米・南米・カリブ海）

オセアニアは原則カバーするが、ある年代（特に〜1500 年）で記述する文化的事象が乏しい場合は **「南北アメリカ」と統合** または **省略** を許容する。

### Rationale

- 高校・大学レベルの世界史教科書での慣習的な区分に近い（地理的距離と文明圏の両方を反映）
- 7 区分は「俯瞰の解像度」と「画面に並べたときの可読性」のバランスポイント。5 以下では大括り過ぎ、9 以上ではモバイル可読性が落ちる
- 「東南アジア」を独立区分にする選択は v1 mock の 7 区分（オセアニア含む）から変更：オセアニアより東南アジアの方が世界史上の被覆密度が高い（マラッカ王国・大越・タイ諸王朝など、広い時代をカバーできる）

### Alternatives Considered

- **5 区分案**（西方／東方／インド／アフリカ／アメリカ）：シンプルだが、世界史の文脈における「東アジア vs 東南アジア vs 南アジア」の差を潰してしまう
- **オセアニア固定区分**：年代によって書くことが極端に少なく、空カードや低品質カードを生むリスク
- **地理 + 海域区分**（地中海世界、インド洋世界、太平洋世界）：横のつながりは表現しやすいが、地図上の領土と対応付けが弱くなる

## 2. 後勝ち排他の reducer 設計

### Decision

`AppState` を以下のように拡張：

```ts
interface AppState {
  selectedYear: HistoricalYear;
  selectedTerritory: string | null;
  isInfoPanelOpen: boolean;
  isSummaryPanelOpen: boolean;
  // ... 既存
}
```

action を以下のように設計（既存 + 新規）：

```ts
type AppStateAction =
  | { type: 'SET_SELECTED_YEAR'; year: HistoricalYear }
  | { type: 'SELECT_TERRITORY'; territory: string }   // 既存：副作用で summary を閉じる
  | { type: 'CLEAR_SELECTION' }                       // 既存：territory のみ閉じる
  | { type: 'OPEN_SUMMARY' }                          // 新規：summary を開く、territory は閉じる
  | { type: 'CLOSE_SUMMARY' }                         // 新規：summary を閉じる
  | { type: 'SET_MAP_VIEW'; view: MapView };
```

reducer 内の **後勝ち排他ルール**：

- `SELECT_TERRITORY` 時：`isInfoPanelOpen: true`、`isSummaryPanelOpen: false`（territory が後勝ち）
- `OPEN_SUMMARY` 時：`isSummaryPanelOpen: true`、`isInfoPanelOpen: false`、`selectedTerritory: null`（summary が後勝ち）

### Rationale

- 状態機械の不変条件「`isInfoPanelOpen && isSummaryPanelOpen` は同時に `true` にならない」を **reducer 1 箇所で保証** できる
- コンポーネント側は dispatch を呼ぶだけで、排他の整合性を意識せずに済む
- 既存の `SELECT_TERRITORY → isInfoPanelOpen: true` の暗黙副作用を、サマリー側にも対称に適用するだけで済む（拡張の方向性が一貫）
- FR-011 の遷移帯クリックは `OPEN_SUMMARY` を dispatch するだけで「territory を閉じ、summary を開く」が完結

### Alternatives Considered

- **discriminated union state**（`{ kind: 'none' | 'summary' | 'territory'; ... }`）：型安全性は最高だが、既存の `isInfoPanelOpen` ベースの API を壊す改修コストが大きい。既存パネルの呼び出し側（`TerritoryInfoPanel`）の変更を抑える方を優先
- **コンポーネント側で排他制御**：`<EraSummaryPanel>` が `<TerritoryInfoPanel>` の状態を見て自分を閉じる。横方向の依存が増え、認知負荷が高い

## 3. 遷移帯の年代表記の動的更新

### Decision

遷移帯のラベル「{year} 年の世界を見る」は **`selectedYear` を購読して動的に再描画** する。

実装：`SummaryNavStrip` コンポーネントは props として `year: HistoricalYear` を受け取り、
`year-display` ドメインのフォーマッタ（既存）で表示文字列を組み立てる：

```tsx
const label = `${formatYearLabel(year)}の世界を見る`;
```

例：
- `1500` → 「1500 年の世界を見る」
- `-100` → 「BC 100 年の世界を見る」
- `0` → 「紀元前後の世界を見る」（既存フォーマッタの規則に従う）

### Rationale

- 領土詳細パネルが開いている状態で年代を切り替えた場合、遷移帯のラベルも追従する必要がある（FR-002 系の挙動と整合）
- 既存の年代表示フォーマッタを流用することで、年代表記の規則が複数箇所で食い違う問題を回避（DRY）
- `selectedYear` は AppStateContext から取得済みなので、新規 prop の引き回しは最小限

### Alternatives Considered

- **遷移帯ラベルを固定文言「サマリーを開く」にする**：年代表記が変動しない分シンプルだが、利用者が「何年のサマリーに切り替わるか」を予測できない。今の世界像との関連が薄れる
- **年代切替時に遷移帯を一時的にハイライトする**：気付きを高めるが、視覚ノイズになる。MVP では平静な再描画で十分

## 4. Pipeline の era-summary 連携戦略（Notion ソース）

### Decision

データの **一次ソースは Notion DB**（"Era Summary" データベース）。`apps/pipeline` には既存の `territory-sync` と対称的な新規サブコマンド `era-summary-sync` を追加し、Notion → JSON への変換のみを担う。

```bash
pnpm pipeline era-summary-sync          # Notion DB の全エントリを取得し、年代単位の JSON に書き出す
```

データフロー：

```
   [人間がコンテンツ整備]      [Pipeline で取得・変換]      [Frontend で表示]
   AI 一次生成（CSV）  ─→  Notion DB（Era Summary）  ─→  era-summaries/{year}.json  ─→  EraSummaryPanel
   ↑                       ↑                            ↑
   prj-era-summary-data    一次ソース                    静的同梱（既存 description と同じ運用）
   （別スキルで対応）
```

実装は既存 `apps/pipeline/src/stages/sync-descriptions.ts` のパターンを踏襲：

1. Notion API（`@notionhq/client`）でデータベースを query
2. 各ページ（年×地域カード）を取得し、年単位にグループ化
3. 1 年分の `regions[]` を [contracts/era-summary-data.md](./contracts/era-summary-data.md) のスキーマに沿った JSON にマップ
4. `apps/frontend/public/data/era-summaries/{year}.json` に書き出し

本 plan のスコープでは **動作確認用の代表データ 1 件（1650 年）** を Notion DB に投入する。残りの年代の整備は本 plan の範囲外（コンテンツ整備工数として別途扱う）。

### Rationale

- **真のソース＝ Notion** とすることで、コンテンツ修正・追加・運用が UI 上で完結。Pipeline は読み取り専用の変換器
- 既存 `territory-sync` の流儀と対称：CLI 引数・stage ファイル名・JSON 書き出し先のいずれも対応関係が明確で、開発者の学習コストがゼロに近い
- AI 一次生成を Notion 投入前のオフライン作業として分離（プロジェクト原則「Data-flow integrity」と整合：データの直線的フローと source-of-truth が明確）
- ランタイム AI 呼び出しを排除（spec Assumption と整合）
- 1650 年は既存アプリのデフォルト表示年。代表データ 1 件で初回アクセス体験の動作確認が成立

### Alternatives Considered

- **Pipeline で AI 生成（旧 plan）**：データソースが Pipeline 内部にあり、Notion 経由の編集動線が失われる。コンテンツ運用の柔軟性が下がる
- **ランタイム AI 生成**：spec の Assumption で否定済み
- **領土データから機械的に集約（AI なし）**：「ヨーロッパに属する領土の context を結合」式の集約は文脈の重複や論理的飛躍を生み読みづらい

### Notion DB のプロパティ構造（producer side の契約）

Notion 上の "Era Summary" データベースは以下のプロパティを持つ：

| プロパティ名 | Notion 型 | 説明 | 必須 |
|------------|---------|------|----|
| `Year` | Number（整数） | 対象年。負号で紀元前を表す | ✓ |
| `Region` | Select（enum） | 地域識別子（`europe` / `east-asia` / `southeast-asia` / `south-asia` / `middle-east-north-africa` / `sub-saharan-africa` / `americas` / `oceania`） | ✓ |
| `Title` | Title（テキスト） | 表示見出し（例：「ヨーロッパ」） | ✓ |
| `Context` | Rich text | 概況本文（1〜500 文字） | ✓ |
| `References` | Rich text（JSON 文字列） | リンク参照を JSON 配列の文字列として格納（例：`[{"kind":"territory","target":"portugal","text":"ポルトガル"}]`）。空または未入力は空配列扱い | 任意 |

**1 ページ ＝ 1 年・1 地域** のレコード。1 つの年代に対して 1〜8 ページ（地域カード）が紐付く。

`References` を Rich text の JSON 文字列として持つ判断：Notion のリレーションプロパティで領土・年代を参照する設計は柔軟だが、別 DB（Territory Description）への外部キー管理が複雑化するため、MVP では文字列ベースで割り切る。Pipeline 側でパースしてバリデーションする。

## 5. データ未提供時の表示

### Decision

サマリーデータが見つからない場合は、既存の `RoleErrorMessage` パターンを流用しつつ、
意味的には **エラーではなく「未提供」** として表示する：

```tsx
<aside role="dialog">
  <header>1500 年の世界</header>
  <div role="status">
    <p>この年代のサマリーは準備中です。</p>
    <p className="text-xs">領土を個別にクリックして詳細を確認できます。</p>
  </div>
</aside>
```

### Rationale

- 既存 territory-info-panel の「準備中です」表示と語彙を揃えることで、利用者は同じ意味として読める
- `role="status"` で支援技術にも「エラーではない通知」として伝える
- 代替動線（個別領土クリック）への誘導を 1 行付け加えることで、行き止まり感を減らす

### Alternatives Considered

- **パネルを開かせない（トリガーをグレーアウト）**：データの有無を起動時に判定する必要があり、初期化コストが上がる。FR-007 のセーフネット動作と整合しない
- **サンプル年代へリダイレクト**：勝手に年代を変える挙動は混乱を招く

## 6. モバイル bottom-sheet との統合

### Decision

既存 `BottomSheet` コンポーネントは **そのまま流用** する。サマリーパネル / 領土詳細パネルそれぞれが
`BottomSheet` を内包する形になる：

```tsx
// 概念図
<EraSummaryPanel>
  {isMobile ? <BottomSheet>...</BottomSheet> : <DesktopAside>...</DesktopAside>}
</EraSummaryPanel>

<TerritoryInfoPanel>
  {isMobile ? <BottomSheet>...</BottomSheet> : <DesktopAside>...</DesktopAside>}
</TerritoryInfoPanel>
```

**後勝ち排他は AppState レベルで担保**するため、bottom-sheet 自身に排他ロジックは持たせない。
AppState の `isSummaryPanelOpen` / `isInfoPanelOpen` のどちらかが `true` のときに該当 bottom-sheet が開かれる。

### Rationale

- 既存 `BottomSheet` は `isOpen` props を受け取って表示制御するだけのプレゼンテーションコンポーネント。状態を持たない
- 排他ロジックを bottom-sheet 自身に持たせると、デスクトップ時の `<aside>` 表示と挙動が分岐し、テストが複雑になる
- 上位（AppState）に排他を集約することで、デバイスを問わず同じ状態機械で振る舞いを保証できる

### Alternatives Considered

- **`<PanelStack>` のような共通親で両パネルを管理**：抽象化の利益は薄く、既存の各パネルが自分の display を制御している構造を壊す
- **bottom-sheet に snap-state を残してモバイルは peek 状態を維持**：spec の clarification で「完全クローズ」が確定済み

## まとめ

| Topic | Status |
|-------|--------|
| 1. 地域区分 | ✅ Resolved（7 区分、東南アジア独立、オセアニア統合許容） |
| 2. 後勝ち排他 reducer | ✅ Resolved（AppState 拡張、新規 OPEN_SUMMARY/CLOSE_SUMMARY） |
| 3. 遷移帯の年代表記 | ✅ Resolved（既存フォーマッタ流用、`selectedYear` 購読） |
| 4. Pipeline 連携戦略 | ✅ Resolved（Notion を一次ソース、`era-summary-sync` で取得・変換、AI 一次生成は Notion 投入前のオフライン作業） |
| 5. データ未提供時表示 | ✅ Resolved（既存 RoleErrorMessage パターン流用、role="status"） |
| 6. bottom-sheet 統合 | ✅ Resolved（既存コンポーネント流用、排他は AppState 側） |

すべての NEEDS CLARIFICATION が解決済み。Phase 1 の設計（data-model / contracts / quickstart）に進める。
