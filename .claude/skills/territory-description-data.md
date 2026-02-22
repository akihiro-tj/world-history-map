---
name: territory-description-data
description: >
  Schema and guidelines for territory description JSON data files.
  Use when creating, editing, or reviewing territory description data files
  in public/data/descriptions/.
---

## Territory Description Data

### File Location and Naming

Territory description JSON files are stored in:

```
public/data/descriptions/{year}/{kebab-case-name}.json
```

**Important**: The filename must match the territory identifier from PMTiles, converted to kebab-case. The identifier is `NAME` attribute (preferred) or `SUBJECTO` attribute (fallback) - see `src/components/map/map-view.tsx:154-155`.

### Data Schema

See `TerritoryDescription` type in `src/types/index.ts`:

```typescript
{
  id: string;           // Unique ID (e.g., "France_1650")
  name: string;         // Display name in Japanese
  year: number;         // Target year
  facts: string[];      // Factual bullet points (e.g., "首都: パリ")
  keyEvents: KeyEvent[];// Historical events with year
  aiGenerated: true;    // Always true (AI-generated content)
}
```

### Content Guidelines

- `facts`: Use only factual information
  - Format: `"項目: 値"` (e.g., `"首都: パリ"`, `"君主: ルイ14世"`)
- `keyEvents`: Include year and brief event description
- Keep content objective and verifiable
