---
name: World History Map
colors:
  role-selected: '#f73d62'
  role-loading: '#46a6ff'
  role-warn: '#f2a618'
  role-error: '#f9423d'
  role-focus: '#0072d5'
  role-link: '#51a2ff'
  role-link-hover: '#8ec5ff'
  role-label-text: '#eeeeee'
  role-label-halo: '#161616'
  surface-base: '#0a0e11'
  surface-sheet: '#1e2939'
  surface-panel: '#364153f2'
  surface-raised: '#ffffff24'
  surface-handle: '#6a7282'
  surface-border: '#44484d'
  surface-scrim: '#00000080'
  text-primary: '#ffffff'
  text-secondary: '#d4d4d4'
  text-tertiary: '#a1a1a1'
  text-quiet: '#717171'
  text-dimmed: '#ffffff99'
typography:
  year-hero:
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
  active-year:
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  modal-title:
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  panel-title:
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  section-heading:
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body:
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  card-title:
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-sm:
    fontSize: 14px
    lineHeight: 20px
  caption:
    fontSize: 12px
    lineHeight: 16px
spacing:
  unit: 4px
---

# Design System: World History Map

This file is the **design counterpart to `CLAUDE.md`** — persistent design context an agent
reads before generating UI. The frontmatter is the design's source of truth for tokens:
`colors` holds semantic color tokens; `typography` holds the nine named type roles (fontSize,
fontWeight, lineHeight per role); `spacing` holds the baseline grid unit. The frontmatter follows
Google's [`@google/design.md`](https://github.com/google-labs-code/design.md) open format, which
parses and validates it (structure, broken references, WCAG contrast); the
`@world-history-map/design-tokens` package then reshapes that tool's token export into `theme.css`
(and the MapLibre `role-colors`) so Tailwind v4 exposes each as a utility class. Use the role names, not raw Tailwind
primitives, so agents and humans read intent. Radii and individual padding/gap values ride the
framework defaults and are described in prose — they don't benefit from centralization. Layout
mechanics (z-index order, breakpoints, pixel widths) stay in the components, not here. The body
holds what has no other home — the intent, the relationships, and the do's and don'ts that keep
generated screens on-brand instead of generically "AI-looking".

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

**Blue is for links only.** `role-link` (and its `role-link-hover` lift) is the lone blue in
the UI chrome, reserved for hyperlinks — text *and* their underline decoration draw from the
same token. Don't reuse it for emphasis or borrow `role-focus` for link text; keeping link and
focus blues distinct preserves "named by role, not hue".

**Text hierarchy is carried by lightness, not size:** `text-primary` for titles and values →
`text-secondary` for body → `text-tertiary` for labels and metadata → `text-quiet` for
disabled and faint elements. `text-dimmed` is the separate *idle interactive* tone — a dimmed
white for resting control-bar icons that brighten to `text-primary` on hover.

**Surfaces read as a stack of slates:** the deepest base (`surface-base`) under the map void,
with frosted panels (`surface-panel`), raised segments (`surface-raised`), and hairline
dividers (`surface-border`). `surface-raised` doubles as the additive white overlay that
hover lifts a control's fill with. A darker opaque slate, `surface-sheet`, backs the
larger-than-a-panel surfaces — the mobile bottom sheet and the map's loading/error void —
while `surface-handle` is the bottom sheet's grab affordance and `surface-scrim` is the
translucent black backdrop behind a modal or expanded sheet. The map's own water color is a
separate concern, defined in the map config rather than the token set.

## Typography

The system uses the **native system font stack** (`system-ui, Avenir, Helvetica, Arial,
sans-serif`) — no web fonts. This is intentional: the document is `lang="ja"`, so the OS's
Japanese faces render natively and instantly, with zero font-loading cost or layout shift.
`fontFamily` is uniform across all roles and stays in prose rather than the per-role tokens.

Hierarchy comes from **weight and size, never letter-spacing** (there is no custom tracking
anywhere). Line-height follows the role's default for its size; `leading-relaxed` is added
explicitly for reading-flow paragraphs and `leading-tight` for compact headings where needed.
Numeric sequences — timeline years — use tabular figures so digits align in a column.

The nine roles below are defined in the `typography:` frontmatter and generated as Tailwind
utilities (`text-year-hero`, `text-panel-title`, etc.) by `@world-history-map/design-tokens`.

| Token | Usage |
|:---|:---|
| `year-hero` | The large animated year readout |
| `active-year` | Selected year in the selector strip |
| `modal-title` | Modal dialog title |
| `panel-title` | Panel heading (territory name, "{year}年の世界", error headings) |
| `section-heading` | Section headings within a panel (e.g. license modal sections) |
| `body` | Inactive year-selector buttons |
| `card-title` | Region-card heading |
| `body-sm` | Context paragraphs, era subtitle, profile fields, timeline events |
| `caption` | Timeline years (tabular), nav strip links |

## Layout

The layout is not a page grid — it is a **map canvas with corner-anchored overlays**. The
principles, not the pixel values:

- **The map's center is sacred.** Controls anchor to the corners with a consistent edge inset;
  nothing covers the focal geography.
- **Panels are bounded, never full-bleed.** Detail panels are a single readable column (never
  full-width on desktop); the year strip is centered with a comfortable max width.
- **A consistent stacking order keeps overlays predictable:** the map at the base, then the
  persistent controls, then detail panels, with the mobile bottom sheet above everything.
- **Spacing follows the baseline rhythm set by `spacing.unit` in the frontmatter** — a
  consistent edge inset and internal padding, dense but orderly. Individual padding and gap values use
  Tailwind's default scale directly (`px-4`, `py-3`, `gap-2`, etc.) and are documented here
  in prose rather than as named tokens, since horizontal and vertical values often differ.

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
below — it fades from the surface it sits on (`from-surface-panel` on desktop panels,
`from-surface-sheet` in the bottom sheet) so the gradient blends seamlessly. The mobile bottom
sheet darkens the map behind it with a translucent `surface-scrim` only when fully expanded.

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
- Use typography role tokens (`text-panel-title`, `text-body-sm`, etc.) rather than raw
  Tailwind size + weight pairs (`text-lg font-semibold`); roles are defined in the
  `typography:` frontmatter and generated into `theme.css`.
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
- Don't hardcode hex or reach for raw Tailwind primitives (`gray-*`, `white`, `black`,
  `blue-*`) in chrome — every chrome color goes through a token (`surface-*`, `text-*`,
  `role-*`). Territory fills are the only exception, and they're data, not chrome.
- Don't reach for raw `text-{size}` / `font-{weight}` pairs in chrome when a typography
  role covers the intent; unblessed combinations silently diverge from the documented scale.
- Don't add web fonts or swap the system stack casually — it breaks native Japanese rendering
  and adds load cost for no visual gain.
- Don't size full-height surfaces to the static viewport height (`100vh`) — it causes the iOS Safari viewport jump; use `100dvh`.
- Don't make panels full-width on desktop or stack them over the map's focal area.
- Don't introduce heavy drop shadows as the primary elevation cue; depth reads through blur
  and translucency.
