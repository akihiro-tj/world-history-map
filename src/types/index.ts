/**
 * 年代エントリ
 * 各年代のPMTilesファイル情報を保持
 */
export interface YearEntry {
  /** 年代（負の値は紀元前を表す） */
  year: number;

  /** PMTilesファイル名（例: "world_1650.pmtiles"） */
  filename: string;

  /** その時代に存在した国・地域名の配列 */
  countries: string[];
}

/**
 * 年代インデックス
 * 利用可能な全年代の一覧
 */
export interface YearIndex {
  years: YearEntry[];
}

/**
 * 領土プロパティ
 * PMTiles内のベクタータイルに含まれる属性
 */
export interface TerritoryProperties {
  /** 国・地域名（ラベル表示用） */
  NAME: string;

  /** 植民地権力や地域名（色分けのグルーピング用） */
  SUBJECTO: string;

  /** より大きな文化圏への帰属 */
  PARTOF: string;

  /** 境界精度: 1=概略、2=中程度、3=国際法準拠 */
  BORDERPRECISION: 1 | 2 | 3;
}

/**
 * 領土説明
 * AI生成の歴史的コンテンツ
 */
export interface TerritoryDescription {
  /** 一意識別子（`{NAME}_{year}`形式） */
  id: string;

  /** 領土名（日本語） */
  name: string;

  /** 対象年代 */
  year: number;

  /** 概要（1-2文、100文字以内推奨） */
  summary: string;

  /** 時代背景（200-500文字） */
  background: string;

  /** 主要な出来事（3-5項目推奨） */
  keyEvents: string[];

  /** 関連する年代（年代リンク用） */
  relatedYears: number[];

  /** 生成日時（ISO 8601形式） */
  generatedAt: string;

  /** AI生成フラグ（常にtrue） */
  aiGenerated: true;
}

/**
 * 地図ビュー状態
 */
export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

/**
 * アプリケーション状態
 * UI全体の状態管理用
 */
export interface AppState {
  /** 現在選択中の年代 */
  selectedYear: number;

  /** 現在選択中の領土（null = 未選択） */
  selectedTerritory: string | null;

  /** 領土情報パネルの表示状態 */
  isInfoPanelOpen: boolean;

  /** ライセンス・免責事項モーダルの表示状態 */
  isDisclaimerOpen: boolean;

  /** 地図のビュー状態 */
  mapView: MapViewState;

  /** ローディング状態 */
  isLoading: boolean;

  /** エラー状態 */
  error: string | null;
}

/**
 * アプリケーション状態の初期値
 */
export const initialAppState: AppState = {
  selectedYear: 1650,
  selectedTerritory: null,
  isInfoPanelOpen: false,
  isDisclaimerOpen: false,
  mapView: {
    longitude: 0,
    latitude: 30,
    zoom: 2,
  },
  isLoading: false,
  error: null,
};

/**
 * アプリ状態コンテキストで利用可能なアクション
 */
export interface AppStateActions {
  setSelectedYear: (year: number) => void;
  setSelectedTerritory: (territory: string | null) => void;
  setInfoPanelOpen: (open: boolean) => void;
  setDisclaimerOpen: (open: boolean) => void;
  setMapView: (view: MapViewState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
