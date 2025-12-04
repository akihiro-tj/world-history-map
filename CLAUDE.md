# world-history-map Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-29

## Active Technologies

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

- 001-interactive-history-map: Added TypeScript 5.9.x (strict mode) + React 19.x, MapLibre GL JS + react-map-gl v8

<!-- MANUAL ADDITIONS START -->

## /speckit.implement Workflow

Follow this workflow when executing tasks with the `/speckit.implement` command:

### Common Rules

#### Branch Naming

Use the format `phase/PX-phase-name` (e.g., `phase/P1-project-setup`)

#### Implementation

- Check the repository's issue list for the relevant phase before starting work, and use `Closes #<issue-number>` when creating the PR
- Follow test-first development (TDD)
- Split commits into appropriate granularity (e.g., per task)
- When fixes are needed, create fixup commits with `git commit --fixup <target-commit>` and squash them with `git rebase -i --autosquash` before creating the PR

#### PR Creation

After completing a phase, create a PR with the following settings:

- **Base branch**: `main`
- **Assignee**: `akihiro-tj`
- **Labels**: Select appropriate labels based on the phase content
  - `enhancement`: New features or improvements
  - `bug`: Bug fixes
  - `documentation`: Documentation-related
  - `refactor`: Refactoring
  - `test`: Test-related
- **Title**: Use conventional commit format (e.g., `feat(P1): setup project infrastructure`)
- **Body**: Write in Japanese, include `Closes #<issue-number>` for all issues in the phase to auto-close related issues on merge

```bash
gh pr create \
  --title "feat(PX): description" \
  --body "## Summary\n\n...\n\nCloses #1\nCloses #2\nCloses #3" \
  --assignee akihiro-tj \
  --label <appropriate-label>
```

### Phase Execution

```bash
git checkout main && git pull origin main
git checkout -b phase/P1-project-setup
# Implement all tasks in the phase → Create PR
```

## Territory Description Data

### File Location and Naming

Territory description JSON files are stored in:

```
public/data/descriptions/{year}/{kebab-case-name}.json
```

**Important**: The filename must match the territory identifier from PMTiles, converted to kebab-case. The identifier is `SUBJECTO` attribute (preferred) or `NAME` attribute (fallback) - see `src/components/map/map-view.tsx:154-155`.

### Data Schema

See `TerritoryDescription` type in `src/types/index.ts`:

```typescript
{
  id: string;           // Unique ID (e.g., "France_1650")
  name: string;         // Display name in Japanese
  year: number;         // Target year
  facts: string[];      // Factual bullet points (e.g., "首都: パリ")
  keyEvents: KeyEvent[];// Historical events with year
  relatedYears: number[];// Links to other years
  aiGenerated: true;    // Always true (AI-generated content)
}
```

### Content Guidelines

- `facts`: Use only factual information
  - Format: `"項目: 値"` (e.g., `"首都: パリ"`, `"君主: ルイ14世"`)
- `keyEvents`: Include year and brief event description
- Keep content objective and verifiable

<!-- MANUAL ADDITIONS END -->
