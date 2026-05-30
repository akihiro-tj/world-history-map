---
name: World History Map
colors:
  role-selected: '#f73d62'
  role-loading: '#46a6ff'
  role-warn: '#f2a618'
  role-error: '#f9423d'
  role-focus: '#0072d5'
  role-label-text: '#eeeeee'
  role-label-halo: '#161616'
  surface-base: '#0a0e11'
  surface-panel: '#2a2e33f2'
  surface-raised: '#ffffff24'
  surface-border: '#44484d'
  text-primary: '#ffffff'
  text-secondary: '#d4d4d4'
  text-tertiary: '#a1a1a1'
  text-quiet: '#717171'
---

# Design System: World History Map

This file is the **design counterpart to `CLAUDE.md`** — persistent design context an agent
reads before generating UI. The `colors` frontmatter holds the design's own semantic color
tokens; type, spacing, and radii ride the framework defaults and are described in prose.
Layout mechanics (z-index order, breakpoints, pixel widths) stay in the components, not here.
The body holds what has no other home — the intent, the relationships, and the do's and don'ts
that keep generated screens on-brand instead of generically "AI-looking".

## Overview

World History Map is an interactive atlas for history learners. The whole screen is a live
MapLibre globe; everything else is a translucent control surface floating above it. The
design language is a **dark data console / HUD**: calm cool-slate neutrals, a disciplined
white text hierarchy, and a single warm accent reserved for "here / now". The geography is
always the hero — UI clusters into the corners and never competes with the map.

Two color layers coexist and must stay separate:

- **UI chrome** — slate panels, white text, the rose accent. Token-driven (`surface-*`,
  `text-*`, `role-*`), defined in this file's frontmatter.
- **Territory fills** — per-territory colors served at runtime from
  `public/data/color-scheme.json` through a MapLibre `match` expression. Data-driven, *not*
  part of this design system. Treat them as content, not chrome.

## Colors

Colors are named by **role, not hue** — `role-selected`, `role-loading`, `role-error`,
`role-focus` encode *intent*, so a contributor changes "the selected-state color" in one place
instead of hunting for a hue. They are the only tokens this design owns outright; every other
dimension defers to the framework's defaults.

**The rose accent is a rule, not just a value.** `role-selected` is the only warm color in an
otherwise cool field, and it is reserved **exclusively** for two meanings: the *selected
territory* (map highlight, the panel's left accent stripe) and the *current year* on a
timeline (the glowing dot). Its impact depends entirely on scarcity — spend it anywhere else
and the "you are here / now" signal dissolves.

**Text hierarchy is carried by lightness, not size:** `text-primary` for titles and values →
`text-secondary` for body → `text-tertiary` for labels and metadata → `text-quiet` for
disabled and faint elements.

**Surfaces read as a stack of slates:** the deepest base (`surface-base`) under the map void,
with frosted panels (`surface-panel`), raised segments (`surface-raised`), and hairline
dividers (`surface-border`). The map's own water color is a separate concern, defined in the
map config rather than the token set.

## Typography

The system uses the **native system font stack** (`system-ui, Avenir, Helvetica, Arial,
sans-serif`) — no web fonts. This is intentional: the document is `lang="ja"`, so the OS's
Japanese faces render natively and instantly, with zero font-loading cost or layout shift.

Hierarchy comes from **weight and size, never letter-spacing** (there is no custom tracking
anywhere). Body copy uses relaxed leading for readability; the large year readout uses tight
leading for compactness. Numeric sequences — timeline years — use tabular figures so digits
align in a column.

| Role | Size / Weight | Usage |
|:---|:---|:---|
| Year Hero | 30px / 700 | The large animated year readout |
| Active Year | 20px / 700 | Selected year in the selector strip |
| Panel Title | 18px / 600 | Panel heading (territory name, "{year}年の世界") |
| Body | 16px / 400 | Inactive year-selector buttons |
| Card Title | 14px / 600 | Region-card heading, profile values |
| Body Small | 14px / 400 | Context paragraphs, era subtitle |
| Caption | 12px / 400 | Timeline years (tabular) |

## Layout

The layout is not a page grid — it is a **map canvas with corner-anchored overlays**. The
principles, not the pixel values:

- **The map's center is sacred.** Controls anchor to the corners with a consistent edge inset;
  nothing covers the focal geography.
- **Panels are bounded, never full-bleed.** Detail panels are a single readable column (never
  full-width on desktop); the year strip is centered with a comfortable max width.
- **A consistent stacking order keeps overlays predictable:** the map at the base, then the
  persistent controls, then detail panels, with the mobile bottom sheet above everything.
- **Spacing follows a 4px baseline rhythm** — a consistent edge inset and internal padding,
  dense but orderly.

**Responsive is a re-home, not a reflow.** One threshold matters — a single tablet width.
Below it the layout reorganizes by *meaning*: the desktop's corner summary trigger becomes a
bottom-right FAB, and side panels become a draggable **bottom sheet** with snap points. The
summary panel opens by default on desktop and starts closed on mobile.

## Elevation & Depth

Depth is conveyed by **frosted glass, not heavy shadows**. Every floating surface shares one
treatment: a near-opaque slate fill + a small backdrop blur + a soft shadow. The map stays
faintly visible through the blur, reinforcing the "HUD over an atlas" feeling. This
consistency *is* the point — a surface that floats but lacks the frosted treatment reads as a
foreign element.

Secondary depth cues: a **scroll-fade overlay** at a panel's bottom edge signals more content
below; the mobile bottom sheet darkens the map behind it with a translucent scrim only when
fully expanded.

## Shapes

The shape language is softly rounded — "approachable but precise". Radii ride the framework's
default scale (the design owns no custom radius values):

- **0.5rem** (`rounded-lg`) — the default container corner: panels, icon buttons, the
  year-selector strip.
- **Fully round** (`rounded-full`) — pills (the summary FAB), timeline dots, the bottom-sheet
  drag handle.
- **1rem** (`rounded-2xl`), top edge only — the mobile bottom sheet.
- A **left accent stripe** is itself a shape signal: it marks a panel as showing the
  *selected* territory, drawn in the rose accent.

## Components

- **Floating panel (the signature container).** Corner-anchored, frosted, rounded, a single
  readable column, flex layout with an overflow-hidden body and a header divided from the body
  by a hairline border. Every async panel renders four explicit states — **loading, error,
  empty, loaded** (the `RemoteData` pattern) — never a bare blank while fetching.
- **Icon button (control bar).** Frosted rounded square; idle icon dimmed, brightening to full
  white on hover. Icon-only with a screen-reader label.
- **Pill / FAB (summary trigger).** Frosted rounded-full pill, icon + short label, hover
  lightens the fill.
- **Close button.** Ghost: grey icon, hover fills and goes white.
- **Year selector (nav).** A horizontally-scrolling strip of segmented buttons divided by
  hairlines. The active year lifts to a raised fill, larger and bold; inactive years are grey
  with hover feedback. Full keyboard support, `aria-current` on the active year, auto-scroll
  to center on change.
- **Bottom sheet (mobile).** Draggable with snap points, a rounded top edge and drag handle,
  focus-trapped when expanded.
- **Timeline (domain-specific).** A vertical rail with faint dots for past/future events and
  one emphasized *current* node — a rose dot with a soft glow and bold white event text.
  Temporal styling is centralized in one strategy map, not scattered across the component.
- **Feedback.** Loading is a `role-loading` spinner ring; errors render as `role-error` text
  on a faint tint. Empty states say what's missing in plain language.
- **Focus.** There are no text inputs — this is a select-and-explore product. The equivalent
  affordance is the focus ring: a `role-focus` outline shown only for keyboard navigation,
  suppressed for mouse.

## Do's and Don'ts

**Do**

- Reference role tokens (`role-selected`, `surface-*`, `text-*`) rather than raw hex; the
  palette is defined in the `colors` frontmatter of this file.
- Reserve the rose accent (`role-selected`) strictly for *selected territory* and *current year*.
- Give every floating surface the frosted treatment: near-opaque slate + backdrop blur + soft
  shadow. Depth = frosted glass.
- Keep the map's center clear; anchor controls to the corners with a consistent inset.
- Render explicit loading / empty / error states for any async panel (`RemoteData`).
- Size full-height surfaces with dynamic viewport units (`100dvh`), so mobile browser chrome doesn't clip them.
- Respect `prefers-reduced-motion` — it is honored globally; new transitions must too.
- On mobile, re-home controls (FAB + bottom sheet) rather than shrinking desktop panels.

**Don't**

- Don't spend the rose accent on hovers, generic emphasis, or any non-selection UI — scarcity
  is what makes it read as "now / here".
- Don't mix the two color layers: territory fills (data-driven) must never leak into UI
  chrome, and chrome tokens must never paint territories.
- Don't hardcode hex in a component when a role token exists; prefer `surface-*` tokens over
  raw Tailwind `gray-*` (some components still ship the latter — that's drift, not the target).
- Don't add web fonts or swap the system stack casually — it breaks native Japanese rendering
  and adds load cost for no visual gain.
- Don't size full-height surfaces to the static viewport height (`100vh`) — it causes the iOS Safari viewport jump; use `100dvh`.
- Don't make panels full-width on desktop or stack them over the map's focal area.
- Don't introduce heavy drop shadows as the primary elevation cue; depth reads through blur
  and translucency.
