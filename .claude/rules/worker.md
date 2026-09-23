---
paths:
  - "src/worker/**"
  - "wrangler.jsonc"
  - "scripts/publish-assets.ts"
  - "scripts/lib/assetKeys.ts"
  - ".github/workflows/**"
---

# 配信とデプロイ

- `/tiles/*` と `/data/*` は Worker が R2 から Range 対応で返す。静的アセットは Range を返さないので PMTiles を静的アセットにしない
- R2 のキーは内容ハッシュ付きで immutable。同じキーの内容を書き換えない
- 新しいアセットは `src/assets/logicalAssets.ts` に論理名を足す（manifest・dev プラグイン・公開スクリプトがここを見る）
- 設定は `wrangler.jsonc` とワークフローで管理し、Cloudflare のダッシュボードでは変えない
- Secrets を使うジョブには `github.actor != 'dependabot[bot]'` と fork の除外を付ける
