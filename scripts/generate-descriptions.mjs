import fs from 'node:fs';
import path from 'node:path';

// Historical data for major nations (Japanese names, basic facts, and key events)
const nationData = {
  // Roman/Byzantine
  'Roman Empire': {
    name: 'ローマ帝国',
    capital: 'ローマ',
    type: '帝政',
    events: [
      { year: -27, event: 'アウグストゥスが初代皇帝に即位' },
      { year: 117, event: 'トラヤヌス帝治下で最大版図に達する' },
      { year: 395, event: '東西に分裂' },
    ],
  },
  'Eastern Roman Empire': {
    name: '東ローマ帝国（ビザンツ帝国）',
    capital: 'コンスタンティノープル',
    type: '帝政',
    events: [
      { year: 395, event: 'ローマ帝国の東西分裂により成立' },
      { year: 527, event: 'ユスティニアヌス1世が即位' },
      { year: 1453, event: 'コンスタンティノープル陥落、滅亡' },
    ],
  },
  'Western Roman Empire': {
    name: '西ローマ帝国',
    capital: 'ラヴェンナ',
    type: '帝政',
    events: [
      { year: 395, event: 'ローマ帝国の東西分裂により成立' },
      { year: 410, event: '西ゴート族によるローマ略奪' },
      { year: 476, event: 'オドアケルにより滅亡' },
    ],
  },
  'Byzantine Empire': {
    name: 'ビザンツ帝国',
    capital: 'コンスタンティノープル',
    type: '帝政',
    events: [
      { year: 527, event: 'ユスティニアヌス1世が即位' },
      { year: 1054, event: '東西教会分裂' },
      { year: 1453, event: 'コンスタンティノープル陥落' },
    ],
  },
  'Roman Republic': {
    name: 'ローマ共和国',
    capital: 'ローマ',
    type: '共和制',
    events: [
      { year: -509, event: '王政廃止、共和制開始' },
      { year: -264, event: '第一次ポエニ戦争開始' },
      { year: -27, event: '帝政へ移行' },
    ],
  },
  Rome: {
    name: 'ローマ',
    capital: 'ローマ',
    type: '王政/共和制',
    events: [{ year: -753, event: '伝承上のローマ建国' }],
  },

  // Chinese dynasties
  Han: {
    name: '漢',
    capital: '長安/洛陽',
    type: '帝政',
    events: [
      { year: -202, event: '劉邦が漢を建国' },
      { year: 8, event: '王莽による簒奪（新の建国）' },
      { year: 220, event: '後漢滅亡' },
    ],
  },
  'Han Empire': {
    name: '漢',
    capital: '長安/洛陽',
    type: '帝政',
    events: [
      { year: -202, event: '劉邦が漢を建国' },
      { year: -141, event: '武帝即位、最盛期へ' },
      { year: 220, event: '後漢滅亡' },
    ],
  },
  'Han Zhao': {
    name: '漢趙',
    capital: '平陽',
    type: '帝政',
    events: [{ year: 304, event: '劉淵が建国' }],
  },
  'Jin Empire': {
    name: '晋',
    capital: '洛陽',
    type: '帝政',
    events: [
      { year: 265, event: '司馬炎が建国' },
      { year: 280, event: '三国統一' },
    ],
  },
  'Sui Empire': {
    name: '隋',
    capital: '大興城',
    type: '帝政',
    events: [
      { year: 581, event: '楊堅が建国' },
      { year: 589, event: '南北統一' },
      { year: 618, event: '滅亡、唐に禅譲' },
    ],
  },
  Tang: {
    name: '唐',
    capital: '長安',
    type: '帝政',
    events: [
      { year: 618, event: '李淵が建国' },
      { year: 755, event: '安史の乱' },
      { year: 907, event: '滅亡' },
    ],
  },
  'Tang Empire': {
    name: '唐',
    capital: '長安',
    type: '帝政',
    events: [
      { year: 618, event: '李淵が建国' },
      { year: 690, event: '則天武后が即位' },
      { year: 755, event: '安史の乱' },
    ],
  },
  Song: {
    name: '宋',
    capital: '開封/臨安',
    type: '帝政',
    events: [
      { year: 960, event: '趙匡胤が建国' },
      { year: 1127, event: '靖康の変、南宋へ移行' },
      { year: 1279, event: '滅亡' },
    ],
  },
  'Song Empire': {
    name: '宋',
    capital: '開封',
    type: '帝政',
    events: [
      { year: 960, event: '趙匡胤が建国' },
      { year: 1127, event: '靖康の変' },
    ],
  },
  Yuan: {
    name: '元',
    capital: '大都',
    type: '帝政',
    events: [
      { year: 1271, event: 'フビライが元を建国' },
      { year: 1279, event: '南宋を滅ぼし中国統一' },
      { year: 1368, event: '滅亡' },
    ],
  },
  Ming: {
    name: '明',
    capital: '北京/南京',
    type: '帝政',
    events: [
      { year: 1368, event: '朱元璋が建国' },
      { year: 1405, event: '鄭和の大航海開始' },
      { year: 1644, event: '滅亡' },
    ],
  },
  'Ming Empire': {
    name: '明',
    capital: '北京',
    type: '帝政',
    events: [
      { year: 1368, event: '朱元璋が建国' },
      { year: 1421, event: '永楽帝が北京に遷都' },
    ],
  },
  'Ming Chinese Empire': {
    name: '明',
    capital: '北京',
    type: '帝政',
    events: [
      { year: 1368, event: '朱元璋が建国' },
      { year: 1405, event: '鄭和の大航海開始' },
    ],
  },
  'Manchu Empire': {
    name: '清',
    facts: (year) => {
      if (year >= 1661 && year <= 1722) {
        return [
          '首都: 北京',
          '皇帝: 康熙帝（在位1661-1722年）',
          '政体: 帝政（満洲族王朝）',
          '特徴: 清朝最盛期、三藩の乱鎮圧',
          '人口: 約1億5000万人',
        ];
      }
      if (year >= 1735 && year <= 1796) {
        return [
          '首都: 北京',
          '皇帝: 乾隆帝（在位1735-1796年）',
          '政体: 帝政（満洲族王朝）',
          '特徴: 最大版図、文化の黄金期',
          '人口: 約3億人',
        ];
      }
      if (year >= 1644 && year <= 1661) {
        return [
          '首都: 北京',
          '皇帝: 順治帝（在位1644-1661年）',
          '政体: 帝政（満洲族王朝）',
          '摂政: ドルゴン（〜1650年）',
          '状況: 中国統一戦争中',
        ];
      }
      return ['首都: 北京', '政体: 帝政（満洲族王朝）', '民族: 満洲族支配'];
    },
    events: [
      { year: 1644, event: '北京入城、中国支配開始' },
      { year: 1661, event: '康熙帝即位' },
      { year: 1912, event: '滅亡' },
    ],
  },
  'Qing Empire': {
    name: '清',
    facts: (year) => {
      if (year >= 1839 && year <= 1861) {
        return [
          '首都: 北京',
          '皇帝: 道光帝/咸豊帝',
          '政体: 帝政',
          '危機: アヘン戦争、太平天国の乱',
          '状況: 西洋列強の圧力下',
        ];
      }
      return ['首都: 北京', '政体: 帝政', '民族: 満洲族支配'];
    },
    events: [
      { year: 1644, event: '北京入城' },
      { year: 1839, event: 'アヘン戦争開始' },
      { year: 1912, event: '辛亥革命により滅亡' },
    ],
  },
  China: {
    name: '中国',
    capital: '北京',
    type: '共和制',
    events: [
      { year: 1949, event: '中華人民共和国成立' },
      { year: 1978, event: '改革開放政策開始' },
    ],
  },
  'Sixteen Kingdoms': {
    name: '五胡十六国',
    capital: '各地',
    type: '分裂時代',
    events: [{ year: 304, event: '五胡十六国時代開始' }],
  },

  // Persian/Iranian
  'Parthian Empire': {
    name: 'パルティア帝国',
    capital: 'クテシフォン',
    type: '帝政',
    events: [
      { year: -247, event: 'アルサケス1世が建国' },
      { year: -53, event: 'カルラエの戦いでローマに勝利' },
    ],
  },
  'Sasanian Empire': {
    name: 'ササン朝ペルシア',
    capital: 'クテシフォン',
    type: '帝政',
    events: [
      { year: 224, event: 'アルダシール1世が建国' },
      { year: 260, event: 'ローマ皇帝ウァレリアヌスを捕虜に' },
      { year: 651, event: 'アラブに滅ぼされる' },
    ],
  },
  'Safavid Empire': {
    name: 'サファヴィー朝',
    facts: (year) => {
      if (year >= 1588 && year <= 1629) {
        return [
          '首都: イスファハーン',
          '君主: アッバース1世（在位1588-1629年）',
          '政体: シャー制（王政）',
          '宗教: シーア派イスラム教（国教）',
          '特徴: 最盛期、「世界の半分」と称された首都',
        ];
      }
      if (year >= 1642 && year <= 1666) {
        return [
          '首都: イスファハーン',
          '君主: アッバース2世（在位1642-1666年）',
          '政体: シャー制（王政）',
          '宗教: シーア派イスラム教（国教）',
          '交易: シルクロード貿易の要衝',
        ];
      }
      return ['首都: イスファハーン', '政体: シャー制（王政）', '宗教: シーア派イスラム教'];
    },
    events: [
      { year: 1501, event: 'イスマーイール1世が建国' },
      { year: 1588, event: 'アッバース1世即位、最盛期へ' },
      { year: 1736, event: '滅亡' },
    ],
  },
  Persia: {
    name: 'ペルシア',
    capital: 'クテシフォン',
    type: '帝政',
    events: [{ year: -550, event: 'キュロス2世がアケメネス朝を建国' }],
  },
  'Achaemenid Empire': {
    name: 'アケメネス朝ペルシア',
    capital: 'ペルセポリス',
    type: '帝政',
    events: [
      { year: -550, event: 'キュロス2世が建国' },
      { year: -490, event: 'マラトンの戦い' },
      { year: -330, event: 'アレクサンドロスにより滅亡' },
    ],
  },
  'Timurid Empire': {
    name: 'ティムール帝国',
    capital: 'サマルカンド',
    type: '帝政',
    events: [
      { year: 1370, event: 'ティムールが建国' },
      { year: 1402, event: 'アンカラの戦いでオスマン軍を破る' },
    ],
  },

  // Islamic
  'Umayyad Caliphate': {
    name: 'ウマイヤ朝',
    capital: 'ダマスカス',
    type: 'カリフ制',
    events: [
      { year: 661, event: 'ムアーウィヤが建国' },
      { year: 711, event: 'イベリア半島征服開始' },
      { year: 750, event: 'アッバース朝により滅亡' },
    ],
  },
  'Abbasid Caliphate': {
    name: 'アッバース朝',
    capital: 'バグダード',
    type: 'カリフ制',
    events: [
      { year: 750, event: 'アブー・アルアッバースが建国' },
      { year: 762, event: 'バグダード建設' },
      { year: 1258, event: 'モンゴル軍により滅亡' },
    ],
  },
  'Ottoman Empire': {
    name: 'オスマン帝国',
    facts: (year) => {
      if (year >= 1520 && year <= 1566) {
        return [
          '首都: イスタンブール',
          '君主: スレイマン1世（在位1520-1566年）',
          '政体: スルタン制',
          '別称: 「壮麗帝」の治世、最盛期',
          '領土: バルカン半島、中東、北アフリカ',
        ];
      }
      if (year >= 1648 && year <= 1687) {
        return [
          '首都: イスタンブール',
          '君主: メフメト4世（在位1648-1687年）',
          '政体: スルタン制',
          '宰相: キョプリュリュ家による改革期',
          '領土: バルカン半島、中東、北アフリカ',
        ];
      }
      if (year >= 1876 && year <= 1909) {
        return [
          '首都: イスタンブール',
          '君主: アブデュルハミト2世（在位1876-1909年）',
          '政体: 専制君主制',
          '状況: 「瀕死の病人」と呼ばれる衰退期',
        ];
      }
      return ['首都: イスタンブール', '政体: スルタン制', '宗教: イスラム教スンナ派'];
    },
    events: [
      { year: 1299, event: 'オスマン1世が建国' },
      { year: 1453, event: 'コンスタンティノープル征服' },
      { year: 1922, event: '滅亡' },
    ],
  },
  'Fatimid Caliphate': {
    name: 'ファーティマ朝',
    capital: 'カイロ',
    type: 'カリフ制',
    events: [
      { year: 909, event: '北アフリカで建国' },
      { year: 969, event: 'エジプト征服、カイロ建設' },
    ],
  },
  'Seljuk Empire': {
    name: 'セルジューク朝',
    capital: 'イスファハーン',
    type: 'スルタン制',
    events: [
      { year: 1037, event: 'トゥグリル・ベクが建国' },
      { year: 1071, event: 'マンジケルトの戦いでビザンツに勝利' },
    ],
  },

  // Indian
  'Gupta Empire': {
    name: 'グプタ朝',
    capital: 'パータリプトラ',
    type: '帝政',
    events: [
      { year: 320, event: 'チャンドラグプタ1世が建国' },
      { year: 375, event: 'チャンドラグプタ2世即位、最盛期へ' },
    ],
  },
  'Mughal Empire': {
    name: 'ムガル帝国',
    facts: (year) => {
      if (year >= 1556 && year <= 1605) {
        return [
          '首都: アーグラ/ファテープル・シークリー',
          '君主: アクバル大帝（在位1556-1605年）',
          '政体: 帝政',
          '特徴: 宗教寛容政策、ヒンドゥーとの融和',
          '人口: 約1億人',
        ];
      }
      if (year >= 1628 && year <= 1658) {
        return [
          '首都: アーグラ',
          '君主: シャー・ジャハーン（在位1628-1658年）',
          '政体: 帝政',
          '建築: タージ・マハル建設（1632-1653年）',
          '人口: 約1億人',
        ];
      }
      if (year >= 1658 && year <= 1707) {
        return [
          '首都: デリー',
          '君主: アウラングゼーブ（在位1658-1707年）',
          '政体: 帝政',
          '特徴: 最大版図達成、イスラム正統主義',
          '領土: インド亜大陸のほぼ全域',
        ];
      }
      return ['首都: デリー/アーグラ', '政体: 帝政', '宗教: イスラム教'];
    },
    events: [
      { year: 1526, event: 'バーブルが建国' },
      { year: 1556, event: 'アクバル即位' },
      { year: 1658, event: 'アウラングゼーブ即位、最大版図へ' },
    ],
  },
  'Mauryan Empire': {
    name: 'マウリヤ朝',
    capital: 'パータリプトラ',
    type: '帝政',
    events: [
      { year: -322, event: 'チャンドラグプタが建国' },
      { year: -268, event: 'アショーカ王即位' },
    ],
  },
  India: {
    name: 'インド',
    capital: 'ニューデリー',
    type: '連邦共和制',
    events: [
      { year: 1947, event: 'イギリスから独立' },
      { year: 1950, event: 'インド共和国憲法施行' },
    ],
  },
  'British Raj': {
    name: '英領インド',
    capital: 'カルカッタ/デリー',
    type: '植民地',
    events: [
      { year: 1858, event: 'イギリス直轄統治開始' },
      { year: 1947, event: 'インド・パキスタン分離独立' },
    ],
  },

  // European kingdoms/empires
  'Frankish Kingdom': {
    name: 'フランク王国',
    capital: 'パリ/アーヘン',
    type: '王政',
    events: [
      { year: 481, event: 'クローヴィス1世即位' },
      { year: 768, event: 'カール大帝即位' },
      { year: 843, event: 'ヴェルダン条約で分裂' },
    ],
  },
  'Carolingian Empire': {
    name: 'カロリング帝国',
    capital: 'アーヘン',
    type: '帝政',
    events: [
      { year: 800, event: 'カール大帝がローマ皇帝として戴冠' },
      { year: 843, event: 'ヴェルダン条約で分裂' },
    ],
  },
  France: {
    name: 'フランス',
    facts: (year) => {
      if (year >= 1643 && year <= 1715) {
        return [
          '首都: パリ',
          '君主: ルイ14世（在位1643-1715年）',
          '政体: 絶対王政',
          '宰相: マザラン枢機卿（〜1661年）',
          '人口: 約2000万人',
        ];
      }
      if (year >= 1958) {
        return ['首都: パリ', '政体: 共和制', '大統領: 第五共和制（1958年〜）'];
      }
      if (year >= 1792 && year < 1804) {
        return ['首都: パリ', '政体: 共和制（第一共和政）'];
      }
      return ['首都: パリ', '政体: 王政/共和制'];
    },
    events: [
      { year: 1643, event: 'ルイ14世即位' },
      { year: 1789, event: 'フランス革命' },
      { year: 1958, event: '第五共和制成立' },
    ],
  },
  'Kingdom of France': {
    name: 'フランス王国',
    facts: ['首都: パリ', '政体: 王政'],
    events: [
      { year: 987, event: 'カペー朝成立' },
      { year: 1337, event: '百年戦争開始' },
      { year: 1789, event: 'フランス革命で王政廃止' },
    ],
  },
  England: {
    name: 'イングランド王国',
    facts: ['首都: ロンドン', '政体: 王政'],
    events: [
      { year: 1066, event: 'ノルマン征服' },
      { year: 1215, event: 'マグナカルタ制定' },
      { year: 1707, event: 'スコットランドと合併' },
    ],
  },
  'England and Ireland': {
    name: 'イングランド・アイルランド',
    facts: (year) => {
      if (year === 1650) {
        return [
          '首都: ロンドン',
          '政体: 共和制（コモンウェルス）',
          '指導者: オリバー・クロムウェル',
          '備考: ピューリタン革命後の共和制期',
        ];
      }
      return ['首都: ロンドン', '政体: 王政/共和制'];
    },
    events: [
      { year: 1649, event: 'チャールズ1世処刑、共和制開始' },
      { year: 1653, event: 'クロムウェルが護国卿に就任' },
      { year: 1660, event: '王政復古' },
    ],
  },
  'Angevin Empire': {
    name: 'アンジュー帝国',
    capital: 'ロンドン/パリ',
    type: '王政',
    events: [
      { year: 1154, event: 'ヘンリー2世即位' },
      { year: 1189, event: 'リチャード1世即位' },
    ],
  },
  Spain: {
    name: 'スペイン王国',
    facts: (year) => {
      if (year >= 1621 && year <= 1665) {
        return [
          '首都: マドリード',
          '君主: フェリペ4世（在位1621-1665年）',
          '政体: 絶対王政',
          '植民地: 中南米、フィリピン、ネーデルラント南部',
        ];
      }
      if (year >= 1556 && year <= 1598) {
        return [
          '首都: マドリード',
          '君主: フェリペ2世（在位1556-1598年）',
          '政体: 絶対王政',
          '植民地: 中南米、フィリピン、ポルトガル（1580-1640）',
        ];
      }
      return ['首都: マドリード', '政体: 王政'];
    },
    events: [
      { year: 1469, event: 'カスティーリャとアラゴンの統合' },
      { year: 1492, event: 'グラナダ陥落、新大陸発見' },
      { year: 1588, event: '無敵艦隊の敗北' },
    ],
  },
  Portugal: {
    name: 'ポルトガル王国',
    capital: 'リスボン',
    type: '王政',
    events: [
      { year: 1139, event: '王国として独立' },
      { year: 1498, event: 'ヴァスコ・ダ・ガマがインド航路開拓' },
    ],
  },
  'Holy Roman Empire': {
    name: '神聖ローマ帝国',
    capital: 'ウィーン',
    type: '帝政（選挙王制）',
    events: [
      { year: 962, event: 'オットー1世が皇帝に戴冠' },
      { year: 1618, event: '三十年戦争開始' },
      { year: 1806, event: '解体' },
    ],
  },
  'Austrian Empire': {
    name: 'オーストリア帝国',
    capital: 'ウィーン',
    type: '帝政',
    events: [
      { year: 1804, event: 'フランツ2世がオーストリア皇帝に即位' },
      { year: 1867, event: 'オーストリア＝ハンガリー二重帝国成立' },
    ],
  },
  Austria: {
    name: 'オーストリア',
    capital: 'ウィーン',
    type: '共和制',
    events: [
      { year: 1918, event: '第一共和国成立' },
      { year: 1938, event: 'ナチス・ドイツに併合' },
      { year: 1955, event: '主権回復' },
    ],
  },
  'Austria-Hungary': {
    name: 'オーストリア＝ハンガリー帝国',
    capital: 'ウィーン',
    type: '帝政',
    events: [
      { year: 1867, event: '二重帝国成立' },
      { year: 1914, event: '第一次世界大戦開戦' },
      { year: 1918, event: '解体' },
    ],
  },
  'Austro-Hungarian Empire': {
    name: 'オーストリア＝ハンガリー帝国',
    capital: 'ウィーン',
    type: '帝政',
    events: [
      { year: 1867, event: '二重帝国成立' },
      { year: 1914, event: '第一次世界大戦開戦' },
    ],
  },
  Prussia: {
    name: 'プロイセン王国',
    capital: 'ベルリン',
    type: '王政',
    events: [
      { year: 1701, event: 'フリードリヒ1世が王に即位' },
      { year: 1740, event: 'フリードリヒ大王即位' },
      { year: 1871, event: 'ドイツ帝国統一の中心に' },
    ],
  },
  'German Empire': {
    name: 'ドイツ帝国',
    capital: 'ベルリン',
    type: '帝政',
    events: [
      { year: 1871, event: 'ヴィルヘルム1世が皇帝に即位' },
      { year: 1914, event: '第一次世界大戦開戦' },
      { year: 1918, event: '帝政廃止' },
    ],
  },
  Germany: {
    name: 'ドイツ',
    capital: 'ベルリン',
    type: '連邦共和制',
    events: [
      { year: 1949, event: '東西分裂' },
      { year: 1990, event: '東西ドイツ統一' },
    ],
  },
  'East Germany': {
    name: '東ドイツ',
    capital: '東ベルリン',
    type: '社会主義共和制',
    events: [
      { year: 1949, event: 'ドイツ民主共和国成立' },
      { year: 1961, event: 'ベルリンの壁建設' },
      { year: 1990, event: '西ドイツと統一' },
    ],
  },
  Russia: {
    name: 'ロシア',
    capital: 'モスクワ',
    type: '連邦共和制',
    events: [
      { year: 1991, event: 'ソ連崩壊、ロシア連邦成立' },
      { year: 2000, event: 'プーチン大統領就任' },
    ],
  },
  'Russian Empire': {
    name: 'ロシア帝国',
    capital: 'サンクトペテルブルク',
    type: '帝政',
    events: [
      { year: 1721, event: 'ピョートル1世が皇帝に即位' },
      { year: 1812, event: 'ナポレオンのロシア遠征撃退' },
      { year: 1917, event: 'ロシア革命で帝政廃止' },
    ],
  },
  'Tsardom of Muscovy': {
    name: 'モスクワ大公国',
    capital: 'モスクワ',
    type: '大公国',
    events: [
      { year: 1480, event: 'モンゴル支配から独立' },
      { year: 1547, event: 'イヴァン4世がツァーリを称する' },
    ],
  },
  Sweden: {
    name: 'スウェーデン王国',
    capital: 'ストックホルム',
    type: '王政',
    events: [
      { year: 1523, event: 'グスタフ1世が独立を達成' },
      { year: 1630, event: '三十年戦争参戦' },
    ],
  },
  Poland: {
    name: 'ポーランド',
    capital: 'ワルシャワ',
    type: '共和制',
    events: [
      { year: 1918, event: '独立回復' },
      { year: 1939, event: 'ナチス・ドイツに侵攻される' },
      { year: 1989, event: '民主化' },
    ],
  },
  'Polish–Lithuanian Commonwealth': {
    name: 'ポーランド・リトアニア共和国',
    capital: 'ワルシャワ',
    type: '共和制',
    events: [
      { year: 1569, event: 'ルブリン合同で成立' },
      { year: 1683, event: 'ウィーン包囲を解く' },
      { year: 1795, event: '第三次分割で消滅' },
    ],
  },
  'Dutch Republic': {
    name: 'ネーデルラント連邦共和国',
    facts: (year) => {
      if (year >= 1625 && year <= 1650) {
        return [
          '首都: ハーグ（政治）/アムステルダム（経済）',
          '政体: 連邦共和制',
          '総督: フレデリック・ヘンドリック（〜1647年）',
          '特徴: 「オランダ黄金時代」',
          '経済: 世界貿易の中心、VOC（東インド会社）',
        ];
      }
      if (year >= 1650 && year <= 1672) {
        return [
          '首都: ハーグ（政治）/アムステルダム（経済）',
          '政体: 連邦共和制（無総督時代）',
          '指導者: ヨハン・デ・ウィット（大年金官）',
          '特徴: 「真の自由」時代',
          '経済: 世界貿易・金融の中心',
        ];
      }
      return ['首都: アムステルダム', '政体: 連邦共和制', '経済: 海上貿易大国'];
    },
    events: [
      { year: 1581, event: 'スペインから独立宣言' },
      { year: 1602, event: 'オランダ東インド会社設立' },
      { year: 1648, event: 'ウェストファリア条約で独立承認' },
    ],
  },
  Venice: {
    name: 'ヴェネツィア共和国',
    capital: 'ヴェネツィア',
    type: '共和制',
    events: [
      { year: 1204, event: '第四回十字軍を主導' },
      { year: 1797, event: 'ナポレオンにより滅亡' },
    ],
  },
  'United Kingdom of Great Britain and Ireland': {
    name: 'グレートブリテン及びアイルランド連合王国',
    capital: 'ロンドン',
    type: '立憲君主制',
    events: [
      { year: 1801, event: '連合王国成立' },
      { year: 1837, event: 'ヴィクトリア女王即位' },
      { year: 1922, event: 'アイルランド自由国独立' },
    ],
  },

  // Japanese
  'Tokugawa Shogunate': {
    name: '江戸幕府',
    facts: (year) => {
      if (year >= 1603 && year <= 1605) {
        return [
          '首都: 江戸',
          '将軍: 徳川家康（初代、在職1603-1605年）',
          '政体: 幕藩体制',
          '天皇: 後陽成天皇',
          '状況: 幕府創設期',
        ];
      }
      if (year >= 1623 && year <= 1651) {
        return [
          '首都: 江戸',
          '将軍: 徳川家光（3代、在職1623-1651年）',
          '政体: 幕藩体制',
          '政策: 鎖国体制確立（1639年）',
          '人口: 約1200万人',
        ];
      }
      if (year >= 1651 && year <= 1680) {
        return [
          '首都: 江戸',
          '将軍: 徳川家綱（4代、在職1651-1680年）',
          '政体: 幕藩体制',
          '状況: 文治政治への転換',
          '人口: 約2500万人',
        ];
      }
      return ['首都: 江戸', '政体: 幕藩体制', '対外政策: 鎖国（長崎出島のみ開港）'];
    },
    events: [
      { year: 1603, event: '徳川家康が征夷大将軍に就任' },
      { year: 1639, event: '鎖国体制確立' },
      { year: 1868, event: '大政奉還' },
    ],
  },
  Japan: {
    name: '日本',
    facts: (year) => {
      if (year >= 794 && year <= 1185) {
        return [
          '首都: 平安京（京都）',
          '天皇: 平安時代',
          '政体: 律令制・摂関政治',
          '特徴: 国風文化の発展',
        ];
      }
      if (year >= 1945 && year <= 1952) {
        return [
          '首都: 東京',
          '天皇: 昭和天皇',
          '政体: 連合国占領下',
          '総司令官: ダグラス・マッカーサー',
          '状況: 戦後復興期',
        ];
      }
      if (year >= 1960 && year <= 1989) {
        return [
          '首都: 東京',
          '天皇: 昭和天皇',
          '政体: 立憲君主制（象徴天皇制）',
          '特徴: 高度経済成長',
          '人口: 約1億人',
        ];
      }
      if (year >= 1989) {
        return [
          '首都: 東京',
          '天皇: 平成天皇/令和天皇',
          '政体: 立憲君主制（象徴天皇制）',
          '人口: 約1億2000万人',
        ];
      }
      return ['首都: 東京', '政体: 立憲君主制'];
    },
    events: [
      { year: 1947, event: '日本国憲法施行' },
      { year: 1964, event: '東京オリンピック開催' },
    ],
  },
  'Japan (USA)': {
    name: '日本（米国占領下）',
    facts: [
      '首都: 東京',
      '天皇: 昭和天皇',
      '政体: 連合国占領下',
      '総司令官: ダグラス・マッカーサー',
      '状況: 戦後復興・民主化改革',
    ],
    events: [
      { year: 1945, event: '終戦、連合国占領開始' },
      { year: 1946, event: '日本国憲法公布' },
      { year: 1952, event: 'サンフランシスコ講和条約発効、主権回復' },
    ],
  },
  'Imperial Japan': {
    name: '大日本帝国',
    facts: (year) => {
      if (year >= 1868 && year <= 1912) {
        return [
          '首都: 東京',
          '天皇: 明治天皇（在位1867-1912年）',
          '政体: 立憲君主制',
          '特徴: 明治維新、富国強兵',
          '人口: 約3500万人→5000万人',
        ];
      }
      if (year >= 1912 && year <= 1926) {
        return [
          '首都: 東京',
          '天皇: 大正天皇（在位1912-1926年）',
          '政体: 立憲君主制',
          '特徴: 大正デモクラシー',
        ];
      }
      return ['首都: 東京', '政体: 立憲君主制', '特徴: 近代化・帝国主義'];
    },
    events: [
      { year: 1868, event: '明治維新' },
      { year: 1894, event: '日清戦争' },
      { year: 1904, event: '日露戦争' },
    ],
  },
  'Empire of Japan': {
    name: '大日本帝国',
    facts: (year) => {
      if (year >= 1926 && year <= 1945) {
        return [
          '首都: 東京',
          '天皇: 昭和天皇（在位1926-1989年）',
          '政体: 立憲君主制',
          '状況: 軍国主義・太平洋戦争',
        ];
      }
      return ['首都: 東京', '天皇: 昭和天皇', '政体: 立憲君主制'];
    },
    events: [
      { year: 1868, event: '明治維新' },
      { year: 1889, event: '大日本帝国憲法発布' },
      { year: 1945, event: '敗戦、連合国占領開始' },
    ],
  },
  'Imperial Japan (Fujiwara)': {
    name: '日本（摂関時代）',
    facts: (year) => {
      if (year >= 967 && year <= 1068) {
        return [
          '首都: 平安京（京都）',
          '政体: 摂関政治',
          '摂政/関白: 藤原氏',
          '特徴: 藤原氏全盛期、国風文化',
          '文化: 源氏物語、枕草子',
        ];
      }
      return ['首都: 平安京', '政体: 摂関政治', '実権: 藤原氏'];
    },
    events: [
      { year: 794, event: '平安京遷都' },
      { year: 1016, event: '藤原道長が摂政就任' },
      { year: 1086, event: '院政開始' },
    ],
  },
  'Shogun Japan (Kamakura)': {
    name: '日本（鎌倉幕府）',
    facts: (year) => {
      if (year >= 1185 && year <= 1333) {
        return [
          '首都: 鎌倉（幕府）/京都（朝廷）',
          '政体: 幕府制（武家政権）',
          '将軍: 源氏→摂家→皇族',
          '執権: 北条氏',
          '特徴: 武家政権の確立',
        ];
      }
      return ['首都: 鎌倉', '政体: 幕府制'];
    },
    events: [
      { year: 1185, event: '壇ノ浦の戦い、平氏滅亡' },
      { year: 1274, event: '文永の役（元寇）' },
      { year: 1333, event: '鎌倉幕府滅亡' },
    ],
  },
  'Japan (Warring States)': {
    name: '日本（戦国時代）',
    facts: (year) => {
      if (year >= 1467 && year <= 1590) {
        return [
          '首都: 京都（名目上）',
          '政体: 戦国大名割拠',
          '状況: 群雄割拠、下剋上',
          '主要大名: 織田・豊臣・徳川・武田・上杉等',
        ];
      }
      if (year >= 1590 && year <= 1603) {
        return ['首都: 大坂/伏見', '政体: 豊臣政権', '関白: 豊臣秀吉', '特徴: 天下統一'];
      }
      return ['首都: 京都', '政体: 戦国大名割拠'];
    },
    events: [
      { year: 1467, event: '応仁の乱勃発' },
      { year: 1582, event: '本能寺の変' },
      { year: 1600, event: '関ヶ原の戦い' },
    ],
  },

  // Korean
  Korea: {
    name: '朝鮮',
    facts: (year) => {
      if (year >= 1392 && year <= 1897) {
        return ['首都: 漢城（ソウル）', '王朝: 李氏朝鮮', '政体: 王政', '思想: 儒教（朱子学）'];
      }
      if (year >= 1897 && year <= 1910) {
        return ['首都: 漢城', '国名: 大韓帝国', '皇帝: 高宗', '政体: 帝政', '状況: 日本の影響下'];
      }
      return ['首都: 漢城', '政体: 王政'];
    },
    events: [
      { year: 1392, event: '李成桂が朝鮮を建国' },
      { year: 1592, event: '文禄の役（壬辰倭乱）' },
      { year: 1910, event: '日本に併合' },
    ],
  },
  'Korea (Republic of)': {
    name: '大韓民国',
    facts: ['首都: ソウル', '政体: 共和制', '特徴: 朝鮮戦争後の分断国家'],
    events: [
      { year: 1948, event: '大韓民国建国' },
      { year: 1950, event: '朝鮮戦争勃発' },
      { year: 1988, event: 'ソウルオリンピック開催' },
    ],
  },
  'Korea (Democratic Peoples Republic of)': {
    name: '朝鮮民主主義人民共和国',
    facts: ['首都: 平壌', '政体: 社会主義共和制', '指導者: 金日成→金正日→金正恩'],
    events: [
      { year: 1948, event: '朝鮮民主主義人民共和国建国' },
      { year: 1950, event: '朝鮮戦争勃発' },
    ],
  },

  // Mongol
  'Mongol Empire': {
    name: 'モンゴル帝国',
    capital: 'カラコルム',
    type: 'ハーン制',
    events: [
      { year: 1206, event: 'チンギス・ハーンが即位' },
      { year: 1258, event: 'バグダード攻略' },
      { year: 1279, event: '南宋を滅ぼす' },
    ],
  },
  'Golden Horde': {
    name: 'キプチャク・ハン国',
    capital: 'サライ',
    type: 'ハーン制',
    events: [
      { year: 1240, event: 'キエフを征服' },
      { year: 1480, event: 'モスクワに敗北、衰退へ' },
    ],
  },
  Mongolia: {
    name: 'モンゴル',
    capital: 'ウランバートル',
    type: '共和制',
    events: [
      { year: 1924, event: 'モンゴル人民共和国成立' },
      { year: 1990, event: '民主化' },
    ],
  },

  // American
  'United States': {
    name: 'アメリカ合衆国',
    capital: 'ワシントンD.C.',
    type: '連邦共和制',
    events: [
      { year: 1776, event: '独立宣言' },
      { year: 1861, event: '南北戦争開始' },
      { year: 1945, event: '第二次世界大戦勝利' },
    ],
  },
  Mexico: {
    name: 'メキシコ',
    capital: 'メキシコシティ',
    type: '共和制',
    events: [
      { year: 1821, event: 'スペインから独立' },
      { year: 1910, event: 'メキシコ革命開始' },
    ],
  },
  Brazil: {
    name: 'ブラジル',
    capital: 'リオデジャネイロ/ブラジリア',
    type: '共和制',
    events: [
      { year: 1822, event: 'ポルトガルから独立' },
      { year: 1889, event: '共和制に移行' },
    ],
  },
  'Aztec Empire': {
    name: 'アステカ帝国',
    capital: 'テノチティトラン',
    type: '帝政',
    events: [
      { year: 1428, event: 'アステカ三国同盟成立' },
      { year: 1521, event: 'コルテスにより滅亡' },
    ],
  },
  'Inca Empire': {
    name: 'インカ帝国',
    capital: 'クスコ',
    type: '帝政',
    events: [
      { year: 1438, event: 'パチャクティ即位、帝国拡大' },
      { year: 1533, event: 'ピサロにより滅亡' },
    ],
  },
  'Maya states': {
    name: 'マヤ諸国',
    capital: '各都市国家',
    type: '都市国家',
    events: [{ year: 900, event: '古典期終焉、都市の衰退' }],
  },
  'Maya chiefdoms and states': {
    name: 'マヤ諸国',
    capital: '各都市国家',
    type: '都市国家',
    events: [{ year: 900, event: '古典期終焉' }],
  },

  // African
  Ethiopia: {
    name: 'エチオピア',
    capital: 'アディスアベバ',
    type: '帝政/共和制',
    events: [
      { year: 1896, event: 'アドワの戦いでイタリアに勝利' },
      { year: 1974, event: '帝政廃止' },
    ],
  },
  'Empire of Ghana': {
    name: 'ガーナ帝国',
    capital: 'クンビ・サレー',
    type: '帝政',
    events: [
      { year: 830, event: '最盛期到来' },
      { year: 1076, event: 'ムラービト朝に征服される' },
    ],
  },
  Mali: {
    name: 'マリ帝国',
    capital: 'ニアニ',
    type: '帝政',
    events: [
      { year: 1235, event: 'スンジャタ・ケイタが建国' },
      { year: 1324, event: 'マンサ・ムーサのメッカ巡礼' },
    ],
  },
  Songhai: {
    name: 'ソンガイ帝国',
    capital: 'ガオ',
    type: '帝政',
    events: [
      { year: 1464, event: 'ソンニ・アリが拡大開始' },
      { year: 1591, event: 'モロッコに敗北、衰退' },
    ],
  },
  'Carthaginian Empire': {
    name: 'カルタゴ',
    capital: 'カルタゴ',
    type: '共和制',
    events: [
      { year: -264, event: '第一次ポエニ戦争開始' },
      { year: -218, event: 'ハンニバルのアルプス越え' },
      { year: -146, event: 'ローマにより滅亡' },
    ],
  },
  'Empire of Alexander': {
    name: 'アレクサンドロス帝国',
    capital: 'バビロン',
    type: '帝政',
    events: [
      { year: -334, event: 'ペルシア遠征開始' },
      { year: -331, event: 'ガウガメラの戦い' },
      { year: -323, event: 'アレクサンドロス死去、帝国分裂' },
    ],
  },

  // Ancient civilizations
  Egypt: {
    name: '古代エジプト',
    capital: 'メンフィス/テーベ',
    type: 'ファラオ制',
    events: [
      { year: -3100, event: '上下エジプト統一' },
      { year: -2560, event: 'ギザの大ピラミッド建設' },
      { year: -30, event: 'ローマに征服される' },
    ],
  },
  Assyria: {
    name: 'アッシリア',
    capital: 'ニネヴェ',
    type: '帝政',
    events: [
      { year: -911, event: '新アッシリア帝国成立' },
      { year: -612, event: 'ニネヴェ陥落、滅亡' },
    ],
  },
  Babylonia: {
    name: 'バビロニア',
    capital: 'バビロン',
    type: '王政',
    events: [
      { year: -1792, event: 'ハンムラビ即位' },
      { year: -586, event: 'エルサレム陥落' },
      { year: -539, event: 'ペルシアに征服される' },
    ],
  },
  'Greek city states': {
    name: 'ギリシャ都市国家',
    capital: 'アテネ他',
    type: '都市国家',
    events: [
      { year: -490, event: 'マラトンの戦い' },
      { year: -480, event: 'サラミスの海戦' },
      { year: -338, event: 'マケドニアに敗北' },
    ],
  },
  'Kushan Empire': {
    name: 'クシャーナ朝',
    capital: 'プルシャプラ',
    type: '帝政',
    events: [
      { year: 60, event: '建国' },
      { year: 127, event: 'カニシカ王即位、最盛期へ' },
    ],
  },
  'Hunnic Empire': {
    name: 'フン帝国',
    capital: '移動',
    type: '部族連合',
    events: [
      { year: 434, event: 'アッティラが王に' },
      { year: 451, event: 'カタラウヌムの戦い' },
      { year: 453, event: 'アッティラ死去、帝国崩壊' },
    ],
  },

  // Southeast Asian
  'Khmer Empire': {
    name: 'クメール帝国',
    capital: 'アンコール',
    type: '王政',
    events: [
      { year: 802, event: 'ジャヤーヴァルマン2世が建国' },
      { year: 1113, event: 'アンコールワット建設開始' },
      { year: 1431, event: 'アユタヤに攻略される' },
    ],
  },
  'Srivijaya Empire': {
    name: 'シュリーヴィジャヤ王国',
    capital: 'パレンバン',
    type: '王政',
    events: [
      { year: 650, event: '王国成立' },
      { year: 1025, event: 'チョーラ朝に攻撃される' },
    ],
  },

  // Pacific
  "Tu'i Tonga Empire": {
    name: 'トンガ帝国',
    capital: 'トンガタプ',
    type: '王政',
    events: [{ year: 950, event: '海上帝国として繁栄' }],
  },
  'Tuʻi Tonga Empire': {
    name: 'トンガ帝国',
    capital: 'トンガタプ',
    type: '王政',
    events: [{ year: 950, event: '海上帝国として繁栄' }],
  },

  // South American
  'Huari Empire': {
    name: 'ワリ帝国',
    capital: 'ワリ',
    type: '帝政',
    events: [
      { year: 500, event: '帝国成立' },
      { year: 1000, event: '崩壊' },
    ],
  },
  'Tiahuanaco Empire': {
    name: 'ティワナク帝国',
    capital: 'ティワナク',
    type: '帝政',
    events: [
      { year: 300, event: '帝国成立' },
      { year: 1000, event: '崩壊' },
    ],
  },
  'Chim Empire': {
    name: 'チムー王国',
    capital: 'チャンチャン',
    type: '王政',
    events: [
      { year: 900, event: '王国成立' },
      { year: 1470, event: 'インカに征服される' },
    ],
  },

  // Modern nations
  'Soviet Union': {
    name: 'ソビエト連邦',
    capital: 'モスクワ',
    type: '社会主義共和制',
    events: [
      { year: 1922, event: 'ソ連成立' },
      { year: 1945, event: '第二次世界大戦勝利' },
      { year: 1991, event: '解体' },
    ],
  },
  'British Empire': {
    name: '大英帝国',
    capital: 'ロンドン',
    type: '立憲君主制',
    events: [
      { year: 1815, event: 'ワーテルローの戦い勝利' },
      { year: 1947, event: 'インド独立' },
    ],
  },
  'United Kingdom': {
    name: 'イギリス',
    capital: 'ロンドン',
    type: '立憲君主制',
    events: [
      { year: 1707, event: 'グレートブリテン連合王国成立' },
      { year: 1922, event: 'アイルランド自由国独立' },
    ],
  },
  'Nazi Germany': {
    name: 'ナチス・ドイツ',
    capital: 'ベルリン',
    type: '全体主義',
    events: [
      { year: 1933, event: 'ヒトラーが首相就任' },
      { year: 1939, event: '第二次世界大戦開戦' },
      { year: 1945, event: '敗北、政権崩壊' },
    ],
  },
  Italy: {
    name: 'イタリア',
    capital: 'ローマ',
    type: '共和制',
    events: [
      { year: 1861, event: 'イタリア王国成立' },
      { year: 1946, event: '共和制移行' },
    ],
  },
  'Italian Empire': {
    name: 'イタリア王国',
    capital: 'ローマ',
    type: '王政',
    events: [
      { year: 1861, event: 'イタリア統一' },
      { year: 1936, event: 'エチオピア併合' },
    ],
  },
};

// Priority scoring for nation selection
function scorePriority(name) {
  let score = 0;

  // High priority keywords
  if (name.includes('Empire')) score += 10;
  if (name.includes('Kingdom')) score += 5;
  if (name.includes('Republic')) score += 4;
  if (name.includes('Caliphate')) score += 8;
  if (name.includes('Shogunate')) score += 7;

  // Very high priority: exact major powers (these should always appear)
  const veryHighPriority = [
    'France',
    'Spain',
    'England',
    'Portugal',
    'Sweden',
    'Prussia',
    'Korea',
    'Japan',
    'Ethiopia',
    'Dutch Republic',
    'Imperial Japan',
    'Empire of Japan',
    'Tokugawa Shogunate',
    'Shogun Japan',
    'Russia',
    'United States',
    'Soviet Union',
    'China',
    'India',
  ];
  for (const kw of veryHighPriority) {
    // Exact match gets highest priority
    if (name === kw) {
      score += 20;
      break;
    }
    // Partial match gets lower priority
    if (name.startsWith(kw + ' ') || name.includes(kw)) {
      score += 12;
      break;
    }
  }

  // High priority specific names
  const highPriority = [
    'Roman',
    'Byzantine',
    'Ottoman',
    'Mongol',
    'Han',
    'Tang',
    'Song',
    'Ming',
    'Qing',
    'Manchu',
    'Russia',
    'Austria',
    'German',
    'United States',
    'China',
    'India',
    'Mughal',
    'Persia',
    'Persian',
    'Safavid',
    'Britain',
    'British',
    'Dutch',
    'Poland',
    'Tokugawa',
  ];

  for (const kw of highPriority) {
    if (name.includes(kw)) {
      score += 8;
      break;
    }
  }

  return score;
}

// Convert NAME to kebab-case filename
function toKebabCase(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Convert NAME to id format
function toIdFormat(name, year) {
  const idName = name.replace(/\s+/g, '_').replace(/['']/g, '');
  return `${idName}_${year}`;
}

// Get key events for a nation
function getKeyEvents(name) {
  const data = nationData[name];
  return data?.events || [];
}

// Get facts for a nation (supports both old and new format)
function getFacts(name, year) {
  const data = nationData[name];
  if (!data) return ['首都: 不明', '政体: 不明'];

  // New format: facts as array or function
  if (data.facts) {
    if (typeof data.facts === 'function') {
      return data.facts(year);
    }
    return data.facts;
  }

  // Old format: capital and type
  const capital = data.capital || '不明';
  const govType = data.type || '不明';
  return [`首都: ${capital}`, `政体: ${govType}`];
}

// Generate description JSON
function generateDescription(name, year) {
  const data = nationData[name];
  const japaneseName = data?.name || name;
  const facts = getFacts(name, year);
  const keyEvents = getKeyEvents(name);

  return {
    id: toIdFormat(name, year),
    name: japaneseName,
    year: year,
    facts: facts,
    keyEvents: keyEvents,
    aiGenerated: true,
  };
}

// Main
async function main() {
  // Load major nations data
  const majorNations = JSON.parse(fs.readFileSync('/tmp/major_nations.json', 'utf8'));

  const outputDir = 'public/data/descriptions';
  let totalFiles = 0;
  let newFiles = 0;

  for (const [yearStr, nations] of Object.entries(majorNations)) {
    const year = parseInt(yearStr, 10);

    // Score and sort nations by priority
    const scored = nations.map((n) => ({ name: n, score: scorePriority(n) }));
    scored.sort((a, b) => b.score - a.score);

    // Take top 15 nations to include more major powers
    const topNations = scored.slice(0, 15).map((s) => s.name);

    // Create year directory
    const yearDir = path.join(outputDir, yearStr);
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }

    for (const name of topNations) {
      const filename = `${toKebabCase(name)}.json`;
      const filepath = path.join(yearDir, filename);

      totalFiles++;

      // Always regenerate to update format
      const desc = generateDescription(name, year);
      fs.writeFileSync(filepath, `${JSON.stringify(desc, null, 2)}\n`);
      newFiles++;
      console.log(`Created/Updated: ${filepath}`);
    }
  }

  console.log(`\nTotal: ${totalFiles} files, New: ${newFiles} files`);
}

main().catch(console.error);
