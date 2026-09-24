// 検索の比較用に文字列をそろえる: NFKC（半角カナ → 全角）→ 空白除去 → ひらがな → カタカナ → 小文字
const HIRAGANA = /[ぁ-ゖ]/gu;
const KATAKANA_OFFSET = 0x60;

export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\s+/gu, "")
    .replace(HIRAGANA, (char) => String.fromCharCode(char.charCodeAt(0) + KATAKANA_OFFSET))
    .toLowerCase();
}
