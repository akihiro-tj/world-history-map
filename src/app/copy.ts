// 画面に出す文言（title と noscript は index.html）。足すときは実装する前にユーザーに確認する
export const COPY = {
  searchPlaceholder: "地名を検索",
  searchLabel: "地名を検索",
  noResults: "該当する地名がありません",
  basemapLoadError: "地図の読み込みに失敗しました",
  citiesLoadError: "地名データの読み込みに失敗しました",
  close: "閉じる",
  boundaryNote: "※薄い線は現在の国境",
  boundaryNoteButton: "国境線について",
  // 「国境線は Natural Earth のデータを使っています。」の Natural Earth をリンクにするため 3 つに分ける
  boundarySourceLead: "国境線は ",
  naturalEarth: "Natural Earth",
  boundarySourceTail: " のデータを使っています。",
  boundaryDisputed:
    "係争中の境界は破線で示しています。どの境界を係争中とするかは、Natural Earth がまとめた日本の見解に従っています。",
} as const;

export const NATURAL_EARTH_URL = "https://www.naturalearthdata.com/";
