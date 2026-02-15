# world-history-map Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-29

## Active Technologies
- TypeScript 5.9.x (strict mode) + Node.js 22.x LTS + @turf/turf (GeoJSON processing), tippecanoe + tile-join (PMTiles conversion, external CLI), wrangler (Cloudflare R2 upload) (002-improve-map-data-pipeline)
- Local filesystem (.cache/, public/pmtiles/, dist/pmtiles/) + Cloudflare R2 (production) (002-improve-map-data-pipeline)

- TypeScript 5.9.x (strict mode) + React 19.x, MapLibre GL JS + react-map-gl v8 + PMTiles (001-interactive-history-map)
- UI: Tailwind v4
- Build: Vite 7.x
- Linter/Formatter: Biome 2.x
- Testing: Vitest 4.x + Playwright 1.57.x
- Runtime: Node.js 22.x (LTS)
- Package Manager: pnpm

## Project Structure

```text
src/
tests/
```

## Commands

pnpm test && pnpm check

## Code Style

- TypeScript 5.9.x (strict mode): Follow standard conventions
- Directory and file names: kebab-case (e.g., `year-selector.tsx`, `use-map-state.ts`)
- Comments and log output: Write in English (JSDoc, inline comments, shell script logs)

## Recent Changes
- 002-improve-map-data-pipeline: Added TypeScript 5.9.x (strict mode) + Node.js 22.x LTS + @turf/turf (GeoJSON processing), tippecanoe + tile-join (PMTiles conversion, external CLI), wrangler (Cloudflare R2 upload)

- 001-interactive-history-map: Added TypeScript 5.9.x (strict mode) + React 19.x, MapLibre GL JS + react-map-gl v8

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
