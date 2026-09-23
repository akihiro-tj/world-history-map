// design.md export --format css-tailwind の出力を Tailwind v4 でそのまま使える形に直す
// - フォントの並び全体が 1 つの名前として引用符で囲まれるので、名前ごとに囲み直す
// - @theme のままだと未使用の変数が出力されず、地図の色を CSS 変数から読めないので static にする

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

export function formatFontFamily(value: string): string {
  return value
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter((family) => family !== "")
    .map((family) => (GENERIC_FAMILIES.has(family) ? family : `"${family}"`))
    .join(", ");
}

export function toThemeCss(exported: string): string {
  if (!exported.includes("@theme {")) {
    throw new Error("design.md の出力に @theme ブロックがありません");
  }
  const body = exported
    .replace(
      /^(\s*--font-(?!weight-)[\w-]+:\s*)"([^"]*)";$/gm,
      (_match, prefix: string, value: string) => `${prefix}${formatFontFamily(value)};`,
    )
    .replace("@theme {", "@theme static {")
    .trimEnd();
  return `/* DESIGN.md から pnpm tokens で生成したファイル。直接編集しない */\n${body}\n`;
}
