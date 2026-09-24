import { describe, expect, it } from "vitest";
import { formatFontFamily, toThemeCss } from "./themeCss";

describe("formatFontFamily", () => {
  it("フォント名は引用符で囲み、総称ファミリーは囲まない", () => {
    expect(formatFontFamily("Hiragino Sans, Noto Sans JP, sans-serif")).toBe(
      '"Hiragino Sans", "Noto Sans JP", sans-serif',
    );
    expect(formatFontFamily("system-ui, sans-serif")).toBe("system-ui, sans-serif");
  });
});

describe("toThemeCss", () => {
  const exported = [
    "@theme {",
    "  --color-ocean: #dce8f0;",
    '  --font-body: "system-ui, sans-serif";',
    "  --font-weight-body: 400;",
    "}",
    "",
  ].join("\n");

  it("未使用の変数も出力されるよう @theme static にする", () => {
    expect(toThemeCss(exported)).toContain("@theme static {");
    expect(toThemeCss(exported)).not.toContain("@theme {");
  });

  it("フォントの並びを CSS として正しい形に直す", () => {
    expect(toThemeCss(exported)).toContain("  --font-body: system-ui, sans-serif;");
  });

  it("フォントの太さはそのまま残す", () => {
    expect(toThemeCss(exported)).toContain("  --font-weight-body: 400;");
  });

  it("生成物であることを先頭に書く", () => {
    expect(toThemeCss(exported).startsWith("/* DESIGN.md から pnpm tokens で生成")).toBe(true);
  });

  it("@theme ブロックが無ければ例外にする", () => {
    expect(() => toThemeCss(":root {}")).toThrow("@theme");
  });
});
