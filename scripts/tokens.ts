// DESIGN.md のトークンから src/app/theme.css を生成する
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { toThemeCss } from "./lib/themeCss";

const exported = execFileSync(
  "pnpm",
  ["exec", "design.md", "export", "--format", "css-tailwind", "DESIGN.md"],
  { encoding: "utf8" },
);
writeFileSync("src/app/theme.css", toThemeCss(exported));
console.log("src/app/theme.css を生成しました");
