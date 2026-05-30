---
name: World History Map
colors:
  background: '#0a0e11'
  map-ocean: '#1a2a3a'
  surface-panel: '#364153'
  surface-sheet: '#1e2939'
  surface-border: '#4a5565'
  surface-raised: '#525c6b'
  text-primary: '#ffffff'
  text-secondary: '#d4d4d4'
  text-tertiary: '#a1a1a1'
  text-quiet: '#717171'
  primary: '#0072d5'
  primary-300: '#7fb6ee'
  primary-700: '#004699'
  selected: '#f73d62'
  loading: '#46a6ff'
  warn: '#f2a618'
  error: '#f9423d'
  focus: '#0072d5'
  label-text: '#eeeeee'
  label-halo: '#161616'
typography:
  year-hero:
    fontFamily: system-ui
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: normal
  year-active:
    fontFamily: system-ui
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: normal
  panel-title:
    fontFamily: system-ui
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: normal
  body-base:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: normal
  body-sm:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: normal
  label-sm-bold:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: normal
  caption:
    fontFamily: system-ui
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: normal
rounded:
  DEFAULT: 0.25rem
  lg: 0.5rem
  '2xl': 1rem
  full: 9999px
spacing:
  unit: 4px
  edge-inset: 16px
  panel-padding-x: 16px
  panel-padding-y: 12px
  gap: 8px
  panel-width: 384px
  panel-max-content: 672px
---

# Design System: World History Map

An interactive, map-first atlas for world-history learners. The entire screen is
a live MapLibre globe; everything else is a translucent control surface floating
above it. The design language is that of a modern **dark data console / HUD** —
calm cool-slate neutrals, a disciplined white text hierarchy, and a single warm
spark reserved for "here / now."

## 1. Visual Theme & Atmosphere

The application is built around an edge-to-edge, full-viewport map (`h-dvh
w-screen`, `overflow-hidden`, `select-none`) rendered over a deep ocean navy
(`#1a2a3a`). There is no page chrome in the traditional sense — instead, every
piece of UI is a **frosted-glass panel that hovers over the map** with
`backdrop-blur-sm`, ~95% opacity slate fills, and soft drop shadows. The effect
is a heads-up display layered onto an atlas: the geography stays the hero, and
the controls feel like glass overlaid on glass. The mood is immersive, focused,
and quietly technical — closer to a navigation cockpit than a content website.

The color temperature is decidedly **cool**: blue-tinted near-blacks, slate
greys, and a blue brand accent dominate, evoking depth, water, and night. Against
that restrained field, one color does all the emotional work — a vivid rose-red
(`#f73d62`, the `selected` role) — used exclusively to mark the *selected
territory* and the *current year* on a timeline. Density is moderate-to-high
inside the panels (definition lists, timelines, region cards stack tightly) but
internal breathing room is generous (`px-4 py-4`, comfortable `space-y` rhythm),
so information-rich content never feels cramped. The system respects
`prefers-reduced-motion` and suppresses iOS tap highlights, reinforcing a
deliberate, app-like polish.

## 2. Color Palette & Roles

Colors are authored in **OKLCH** in a design-token package
(`@world-history-map/design-tokens`) and named by *role*, not by hue. A build
step converts them to hex for the MapLibre layers. Note one intent-vs-shipped
nuance: the tokens define a `surface-*` family, but the shipped components mostly
use Tailwind's default **slate-grey** scale (`gray-700/600/800`) for their
panels and borders — both are recorded below.

### Primary Foundation (Canvas & Surfaces)

- **Abyssal Blue-Black** `#0a0e11` (`surface-base`) — the deepest app base, behind everything.
- **Deep Ocean Navy** `#1a2a3a` (`MAP_CONFIG.backgroundColor`) — the visible map water/void; the dominant field the user sees.
- **Frosted Slate Panel** `#364153` (Tailwind `gray-700` @ 95%) — the signature floating-panel fill (info panel, era summary, control bar, year selector, FAB).
- **Sheet Slate** `#1e2939` (Tailwind `gray-800`) — solid fill for the mobile bottom sheet.
- **Hairline Slate** `#4a5565` (Tailwind `gray-600`) — panel dividers and borders.
- **Raised Glass** `#525c6b` (token `surface-raised` = white @14% over panel) — the selected segment inside the year selector.

### Accent & Interactive

- **Signal Blue** `#0072d5` (`primary-500` / `focus`) — brand accent and the keyboard focus ring (`2px` outline, `2px` offset).
- **Sky Tint** `#7fb6ee` (`primary-300`) and **Deep Sapphire** `#004699` (`primary-700`) — lighter/darker steps of the full 50–950 blue ramp (hue 250).
- **Vivid Rose** `#f73d62` (`selected`) — the one warm accent. Selection highlight on the map (`HIGHLIGHT_COLOR`), the `border-l-4` accent stripe on the selected-territory panel, and the glowing "current year" dot on timelines.

### Typography & Text Hierarchy

- **Pure White** `#ffffff` (`text-primary`) — titles, values, emphasized text.
- **Soft White** `#d4d4d4` (`text-secondary`, ≈ `gray-300`) — body copy, era subtitles, secondary nav.
- **Muted Grey** `#a1a1a1` (`text-tertiary`, ≈ `gray-400`) — profile labels, timeline years.
- **Quiet Grey** `#717171` (`text-quiet`, ≈ `gray-500`) — disabled states, faint timeline dots, drag handles.

### Functional States

- **Loading Blue** `#46a6ff` (`loading`) — the spinner ring.
- **Amber Warn** `#f2a618` (`warn`) — warnings.
- **Alert Red** `#f9423d` (`error`) — error text on a 10%-tint background (`bg-role-error/10`).
- **Map Label** `#eeeeee` text with **Halo** `#161616` (`label-text` / `label-halo`) — keeps place names legible over any territory fill.

## 3. Typography Rules

### Hierarchy & Weights

The system uses the **native system font stack** (`system-ui, Avenir, Helvetica,
Arial, sans-serif`) — no web fonts are loaded, keeping the UI fast and
platform-native (the document is `lang="ja"`, so it renders the OS's Japanese
faces where present). Base line-height is `1.5`, base weight `400`, with
`optimizeLegibility` and antialiasing enabled.

| Role | Size | Weight | Usage |
|:---|:---|:---|:---|
| Year Hero | `text-3xl` (30px) | Bold 700 | The big animated year readout |
| Active Year | `text-xl` (20px) | Bold 700 | Currently-selected year in the selector strip |
| Panel Title | `text-lg` (18px) | Semibold 600 | Panel `h2` (territory name, "{year}年の世界") |
| Body | `text-base` (16px) | Regular 400 | Inactive year-selector buttons |
| Card Title | `text-sm` (14px) | Semibold 600 | Region-card `h3`, profile values |
| Body Small | `text-sm` (14px) | Regular 400 | Context paragraphs (`leading-relaxed`), era subtitle |
| Caption | `text-xs` (12px) | Regular 400 | Timeline years (`tabular-nums`) |

### Spacing Principles

There is no custom letter-spacing — the system relies on weight and size for
hierarchy, not tracking. Body paragraphs use `leading-relaxed` for readability;
display numerals use default leading for compactness. Numeric sequences (timeline
years) use `tabular-nums` so digits align in a column. Headings sit a hair above
their subtitles (`mt-0.5`–`mt-2.5`) rather than relying on large vertical gaps.

## 4. Component Stylings

### Buttons

- **Icon buttons (control bar):** `rounded-lg`, frosted-slate fill `bg-gray-700/95`, `p-3`, `shadow-lg`, `backdrop-blur-sm`. Idle icon at `text-white/60`, brightening to `text-white` on hover via `transition-colors`. Icon-only with an `sr-only` label; SVG `h-6 w-6`, stroke width `1.5`.
- **Pill / FAB ("概要" summary trigger):** `rounded-full`, `bg-gray-700/95`, `px-4 py-2.5`, icon + `text-sm` label, `shadow-lg backdrop-blur-sm`, hover `bg-gray-600/95`.
- **Segmented year buttons:** flat, divided by `border-r border-gray-600`. Selected segment lifts to `bg-surface-raised`, `text-xl font-bold text-white`, wider (`min-w-[5rem]`); inactive segments are `text-gray-300` → hover `bg-gray-600 hover:text-white`. Disabled arrows: `text-gray-500 cursor-not-allowed`.
- **Close button:** ghost style — `rounded-lg text-gray-300`, hover `bg-gray-600 hover:text-white`, `p-1.5` (md) / `p-1` (sm).
- Global base reset: buttons inherit font, have no border/padding, `cursor-pointer`, and dim to `opacity-50` + `cursor-not-allowed` when disabled.

### Cards & Floating Panels

The floating panel is the system's defining container:

- Positioned `absolute left-4 top-4 z-30`, width `w-96` (384px), `max-w-[calc(100vw-2rem)]`, scrollable variant capped at `max-h-[calc(100vh-2rem)]`.
- `rounded-lg`, `bg-gray-700/95`, `shadow-xl`, `backdrop-blur-sm`, `overflow-hidden`, flex column.
- Header is divided from the body by `border-b border-gray-600` (`px-4 py-3`); body padding `px-4 py-4` with `space-y-3`/`space-y-4` rhythm.
- The **selected-territory** panel adds a `border-l-4 border-role-selected` accent stripe.
- A bottom **scroll-fade overlay** signals more content below.
- **Region cards** are lightweight `article`s (no border/shadow): `text-sm font-semibold text-white` title over a `text-sm leading-relaxed text-gray-300` paragraph, stacked `space-y-4`.

### Navigation (Year Selector)

A horizontally-scrolling strip pinned bottom-center: `inset-x-4 bottom-4`,
`mx-auto max-w-2xl` (672px), `rounded-lg bg-gray-700/95 shadow-lg
backdrop-blur-sm`. Prev/next chevron buttons flank a scrollable run of
year segments (`scrollbar-none`). Full keyboard support (Arrow/Home/End/Enter),
`aria-current` on the active year, and the selected button auto-scrolls into
center via `scrollIntoView`.

### Inputs & Forms

This is a selection-and-explore product — there are no text inputs. The
equivalent "input" affordance is the **focus ring**: `:focus-visible` draws a
`2px solid var(--color-role-focus)` outline with `2px` offset, shown only for
keyboard navigation (mouse focus is suppressed).

### Domain-Specific Components

- **Territory Timeline:** an `ol` with a vertical rail (`w-px bg-surface-border`). Past/future events sit at `opacity-60/70` with a tiny `3px` quiet-grey dot, `text-xs` tertiary year, and `text-sm` secondary event. The **current** row is emphasized: `font-semibold`, a `9px` rose dot (`bg-role-selected`) ringed by `border-2 border-surface-panel` and wrapped in an `8px` rose glow (`box-shadow`), with a rose year label and white event text. Temporal styling is centralized in a single strategy map (`timelineRowStyleFor`).
- **Territory Profile:** a two-column definition list `grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm` — `dt` labels in `text-gray-400`, `dd` values in `text-white`.
- **Mobile Bottom Sheet:** `fixed inset-x-0 bottom-0`, `rounded-t-2xl bg-gray-800 shadow-xl`, a `h-1 w-10 rounded-full bg-gray-500` drag grabber, a `bg-black/50` backdrop when expanded, draggable snap points, and focus-trapping when fully open.
- **Feedback:** spinner is a `h-8 w-8 border-4` ring in `loading` blue with a transparent top, `animate-spin`; error is a rounded `bg-role-error/10` block of `text-role-error`.

## 5. Layout Principles

### Grid & Structure

There is no traditional page grid — the layout is a **map canvas plus absolutely
positioned overlays**, organized by a clear z-index stack: map (base) → year
selector & control bar (`z-20`) → info/summary panels & summary trigger (`z-30`)
→ mobile bottom sheet (`z-40`). Panels anchor to screen corners with a uniform
`4` (16px) edge inset. Content widths are bounded: panels at `24rem` (384px), the
year-selector strip at `42rem` (672px), each centered or corner-pinned rather
than filling the viewport.

### Whitespace Strategy

Spacing follows the Tailwind **4px baseline scale**. The recurring rhythm is a
`16px` screen inset (`left-4`/`top-4`/`bottom-4`), `px-4` panel padding,
`py-3` headers / `py-4` bodies, and `gap-2`–`gap-2.5` between stacked controls.
Vertical content rhythm uses `space-y-3`/`space-y-4`. The result is dense but
orderly — every panel breathes consistently.

### Alignment & Visual Balance

The map is the optical center of gravity; UI clusters into the corners so the
geography stays unobstructed. Text is left-aligned for scanning, with header
rows using `flex justify-between` to push close buttons to the trailing edge.
Empty/loading/error states are center-aligned for calm symmetry. Numeric data
(years) is treated as tabular for column alignment.

### Responsive Behavior & Touch

A single breakpoint matters: **`md` = 768px** (`useIsMobile`). Below it, the
layout reorganizes meaningfully rather than just reflowing — the desktop's
top-left summary trigger moves to a bottom-right FAB, and detail panels become a
draggable **bottom sheet** with snap points instead of a floating side panel. On
desktop, the summary panel opens by default; on mobile it starts closed. Touch
targets are comfortably sized (`p-3` icon buttons, `px-4 py-2.5` pills), tap
highlights and callouts are suppressed on the map, and `user-select` is disabled
across the shell to prevent accidental text selection during pan/zoom.

## 6. Design System Notes for Stitch Generation

### Language to Use

Describe screens as a **dark, map-first console**: "full-bleed dark map
background," "frosted-glass slate panels floating in the corners with backdrop
blur and soft shadow," "cool blue-slate neutrals with white text," and "a single
vivid rose accent reserved for the selected item." Lean on words like *immersive,
HUD, atlas, frosted, slate, restrained, focused*. Avoid bright or playful
language — this system is calm and technical.

### Color References

- Canvas: **Deep Ocean Navy** `#1a2a3a` over **Abyssal Blue-Black** `#0a0e11`.
- Panels: **Frosted Slate** `#364153` at ~95% opacity with backdrop blur; dividers in **Hairline Slate** `#4a5565`.
- Text: **Pure White** `#ffffff` → **Soft White** `#d4d4d4` → **Muted Grey** `#a1a1a1` → **Quiet Grey** `#717171`.
- Brand accent: **Signal Blue** `#0072d5` (and focus ring). Hero accent: **Vivid Rose** `#f73d62` — selection / current only.
- States: loading `#46a6ff`, warn `#f2a618`, error `#f9423d` (on a 10% tint).

### Component Prompts

- *"A floating info panel in the top-left over a dark world map: 384px wide, rounded-lg, frosted slate `#364153` at 95% opacity with `backdrop-blur` and an `xl` shadow. Header with an 18px semibold white title and a 14px grey subtitle, divided by a thin `#4a5565` border, with a ghost close button (×) on the right. A `4px` vivid-rose left border indicates the item is selected."*
- *"A bottom-center year-selector strip, max 672px wide, rounded-lg frosted slate with backdrop blur. Horizontal row of year segments divided by hairline borders; the active year is larger (20px bold white) on a slightly raised fill, neighbors are 16px grey, flanked by chevron prev/next buttons."*
- *"A vertical event timeline inside a dark panel: a thin grey rail with small faint dots for past/future events (greyed at 60–70% opacity), and one emphasized 'current' node — a 9px vivid-rose dot with a soft rose glow, bold white event label, and a rose year."*

### Incremental Iteration

Keep the map as a fixed dark backdrop and iterate the overlays in isolation.
Maintain the **frosted-slate + backdrop-blur** treatment on every floating
surface for consistency, and ration the **rose accent strictly to "selected /
current"** state — its impact depends on scarcity. When adapting to mobile,
re-home controls (corner FAB, bottom sheet) rather than merely shrinking the
desktop panels. Honor `prefers-reduced-motion` for any new transitions.
