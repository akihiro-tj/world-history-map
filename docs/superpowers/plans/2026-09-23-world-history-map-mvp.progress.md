# SDD ledger — plan: docs/superpowers/plans/2026-09-23-world-history-map-mvp.md

Spec: docs/superpowers/specs/2026-09-23-world-history-map-design.md
Branch: claude/world-history-map-app-ti91oc (start 845cbca)

## Pre-flight scan

| Rows | Produces / consumes | Finding |
|---|---|---|
| T1↔T3 | package.json scripts (T3 adds publish/deploy/preview/dev:secrets) | consistent |
| T1↔T8 | src/app/index.css (T8 appends theme import) | consistent |
| T1↔T9 | vite.config.ts (T9 replaces with plugin) | consistent |
| T1↔T2 | tsconfig.worker.json include src/worker; T1 has no worker files | CONFLICT: `pnpm typecheck` in T1 Step 5 fails with TS18003 (no inputs) |
| T3↔T7 | public/data/cities.json placeholder [] → real data | consistent ([] passes smoke `type=="array"` and dry-run) |
| T3↔T9 | LOGICAL_ASSET_PATHS / TILES_ASSET / CITIES_ASSET | consistent |
| T3↔T5 | publish:assets --dry-run in CI, manifest format used by smoke.sh | consistent |
| T5↔T6 | deploy.yml PRODUCTION_URL placeholder SUBDOMAIN_FROM_TASK_6 | consistent (T6 replaces) |
| T5↔T8 | ci.yml gets design.md lint + tokens diff | consistent |
| T7↔T9/T10/T11/T12 | City type, parseCities | consistent |
| T8↔T11 | CSS vars --color-ocean/land/coastline/city/city-selected | consistent |
| T10↔T12 | handleComboboxKey(state,key,isComposing,count), normalizeForSearch re-exported from match.ts | consistent |
| T11↔T12 | COPY (created T11), MapView props, FocusRequest, App.tsx replaced | consistent |
| T2↔T3 | wrangler main src/worker/index.ts, binding ASSETS_BUCKET | consistent |
| T1 self | tests/code vs files | only the TS18003 issue above |
| T2 self | tests reference keyFromPath/resolveRange/serveFromBucket — all defined | consistent |
| T3 self | test reads wrangler.jsonc created in same task | consistent |
| T4 self | EXPECTED_TILES.maxZoom 6 = build_scale 10m 4 6 | consistent |
| T5 self | smoke.sh jq keys = manifest logical names | consistent |
| T7 self | reading "えみーる" allowed by pattern with ー | consistent |
| T8 self | themeCss tests vs implementation (@theme static, font fix) | consistent |
| T9 self | loadAppData fake fetch handles relative + absolute URLs | consistent |
| T10 self | "ら" ordering lhasa, bukhara | consistent |
| T11 self | style layer ids order test = buildStyle order | consistent |
| T12 self | UI copy only from COPY | consistent |
| T13 self | CLAUDE.md content | consistent |

Ruling: T1 Step 5 runs `tsc -p tsconfig.json` instead of full `pnpm typecheck` (script still defined as planned); T2 is the first task to run full `pnpm typecheck` — tsconfig.worker.json has no inputs until T2 — cost if wrong: none, T2 verifies both configs.
Ruling: ledger canonical copy lives in this workspace; controller mirrors it to docs/superpowers/plans/2026-09-23-world-history-map-mvp.progress.md on each push because the cloud container is ephemeral — cost if wrong: an extra docs file in the PR.
Ruling: added `.superpowers/` to .gitignore (controller bookkeeping commit) so SDD artifacts are not committed — cost if wrong: none.

## Progress
Task 1: minor (deferred): brief interface says `App(): JSX.Element` but code block (and impl) has no return annotation — harmless, App replaced in T11/T12
Task 1: minor (deferred): `pnpm typecheck` fails TS18003 until Task 2 adds src/worker (controller ruling)
Task 1: fix round 1/5 (1 addressed, 0 open — minimumReleaseAge: 0 instead of per-package excludes; commits 658b760..a6c66a4)
Task 1: complete (commits 9a31244..a6c66a4, review clean)
Task 2: minor (deferred): Range request where R2 returns no `range` falls back to 200 (pmtiles would reject) — RFC-correct, unreachable for pmtiles' single ranges
Task 2: minor (deferred, plan-mandated): 404/416 responses carry no Accept-Ranges/ETag
Task 2: complete (commits a6c66a4..90a8687, review clean)
Task 3: complete (commits 90a8687..8335f89, review clean)
