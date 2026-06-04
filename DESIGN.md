---
version: alpha
name: World History Map
description: The design counterpart to CLAUDE.md — the brief an agent reads before generating UI for World History Map.
colors:
  role-selected: '#f5b13d'
  role-loading: '#38bdf8'
  role-error: '#fa5450'
  role-focus: '#38bdf8'
  role-link: '#76b2ff'
  role-link-hover: '#9bccff'
  role-label-text: '#eeeeee'
  role-label-halo: '#161616'
  surface-base: '#0a0e14'
  surface-sheet: '#1b2533'
  surface-panel: '#2d3a4cf2'
  surface-raised: '#ffffff24'
  surface-handle: '#687587'
  surface-border: '#3c4654'
  surface-scrim: '#00000080'
  text-primary: '#ffffff'
  text-secondary: '#d4d4d4'
  text-tertiary: '#adadad'
  text-quiet: '#717171'
  text-dimmed: '#ffffff99'
typography:
  title:
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  panel-title:
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  section-heading:
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label:
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body:
    fontSize: 16px
    lineHeight: 24px
  caption:
    fontSize: 12px
    lineHeight: 16px
spacing:
  unit: 4px
---

# Design System: World History Map

This file is the **design counterpart to `CLAUDE.md`**: the context an agent reads before
generating UI, so a new screen looks like *this product* rather than a generic dark dashboard. It
is a **brief, not a catalogue** — it exists to explain the *intent* behind the design so an agent
can make sound choices the tokens alone don't dictate. If a section ever reads like an inventory of
what already exists, it has drifted from its job.

Source of truth splits in two: the **frontmatter holds token values** (colors, the six type roles,
the spacing unit); the **body holds intent** — why those values exist and how to apply them.
**Never restate a token's value in prose** (no hex, no px, no weight); name the token and explain
the reasoning. The exception is values that are *not* tokens — radii, padding, and gaps that ride
the framework defaults — for which this prose is their only home. `@world-history-map/design-tokens`
generates `theme.css` (Tailwind `@theme`) and `role-colors.generated.ts` (MapLibre) from the
frontmatter, so every token is a utility class; reference role names (`role-selected`,
`text-tertiary`, `text-panel-title`), never raw Tailwind primitives. Layout mechanics (z-index,
breakpoints, pixel widths) live in the components, not here.

## Overview

World History Map is an interactive atlas for history learners. The whole screen is a live MapLibre
globe; everything else is a translucent control surface floating above it. The language is a **dark,
immersive atlas — an observatory at night**: a calm field of cool slate, a disciplined white text
hierarchy, and a single warm point of light for "here / now".

Six principles generate every rule that follows. When a specific case isn't covered below, decide
by these:

1. **The map is the hero; chrome is instrumentation.** Controls recede to the corners and let the
   geography show through. This is *why* the field is dark (map colors pop against it), *why*
   surfaces are frosted (the map stays visible through them), and *why* the chrome is muted slate. A
   surface that hides or competes with the map is wrong, however handsome on its own.
2. **One warm light means "here / now".** In an all-cool field, the lone gold accent
   (`role-selected`) marks the selected territory and the current year — nothing else. Its meaning
   *is* its scarcity.
3. **This is a reading instrument.** Learners read real historical prose here, so body text is sized
   for sustained reading and never shrunk to signal "secondary". Size separates the *kinds* of text
   (heading / body / meta); within a kind, prominence is shown by color — dimmer, not smaller.
4. **Select-and-explore, never fill-in.** The map and the year strip are the input surface — the
   user taps a territory or a year and reads, rather than filling in forms. Style controls as
   buttons, pills, and segments, and because interaction is overwhelmingly select-not-type, treat
   the keyboard focus ring as a first-class affordance.
5. **Async is always explicit.** Territory and year data load over the network; every async surface
   shows **loading / empty / error / loaded** (the `RemoteData` pattern), never a bare blank.
6. **Mobile re-homes, it doesn't reflow.** Below the single tablet threshold the layout reorganizes
   by *meaning* (corner panels → bottom sheet, summary trigger → FAB) rather than shrinking the
   desktop layout.

**Two color layers must stay separate.** *UI chrome* — slate surfaces, white text, the gold accent,
status and link colors — is token-driven and owned by this file. *Map content* — per-territory
fills from `public/data/color-scheme.json`, plus the map's label colors (`role-label-text` /
`role-label-halo`) and water — is painted by MapLibre, not the chrome. The label colors sit in the
frontmatter only because they ride the same generation pipeline; treat them as content. Never paint
a territory with a chrome token, and never let a map-content color into the UI.

## Colors

Colors are named by **role, not hue**, and tuned so that roles which mean different things also
*look* different — a role name is a promise the eye must be able to keep. The rules a hex code can't
tell you:

- **Gold is the only persistent warm color** (Principle 2). `role-selected` marks the *selected
  territory* (map highlight, a panel's left accent stripe) and the *current year* (the timeline's
  glowing dot) — and nothing else. Hovers, headings, and emphasis stay neutral; spend gold elsewhere
  and "here / now" dissolves.
- **Red is transient, and an accent — not a body fill.** `role-error` is the lone alarm color: it
  appears during feedback and then leaves the screen. It rides the *frame* of an error — an icon, a
  hairline, a faint tint — while the message itself stays in the legible light-text ramp, so error
  prose never falls below contrast on the dark field. There is deliberately **no warning color** — a
  select-and-explore map has loading and error states but nothing to caution about, so a warn token
  would have no job to do.
- **Two blues, kept visibly apart.** `role-link` (with its `role-link-hover` lift) is the only
  *persistent* blue — links, text and underline from one token, leaning indigo. `role-loading` and
  `role-focus` share one brighter, sky-leaning *system blue*: transient cool signals (a spinner, a
  focus ring) that never need telling apart from each other but must read as clearly *not* a link.
  The focus blue is bright on purpose so the ring survives the dark field.
- **Within one kind of text, prominence rides lightness** (Principle 3). Size and weight separate the
  *kinds* (heading / control / body / meta); the lightness ramp then ranks importance *inside* a
  kind: `text-primary` (titles, values) → `text-secondary` (body) → `text-tertiary` (labels,
  metadata) → `text-quiet` (disabled, faint). Dimming lets secondary text recede instead of enlarging
  primary text to compete with the map — but the dim tones have a floor: keep them legible, never dim
  into unreadability. `text-dimmed` is the one tone outside that ramp — a *resting interactive* white
  for idle control-bar icons, translucent so they recede into the frosted chrome until they brighten
  to `text-primary` on hover.
- **Surfaces are one slate ramp, not separate families.** `surface-base` (the void under the map) →
  `surface-sheet` (opaque slate for surfaces *larger than a panel* — the bottom sheet, the
  loading/error void) → `surface-panel` (the frosted fill of a *floating* panel; its alpha is
  precisely what lets the map blur through) → `surface-raised` (additive white for a hover or raised
  lift) → `surface-border` (the hairline, kept in the slate hue so it never reads as a grey seam) →
  `surface-handle` (the bottom sheet's grab affordance). `surface-scrim` is the translucent black
  behind a modal or an expanded sheet.

## Typography

The system uses the **native system font stack** (`system-ui, Avenir, Helvetica, Arial,
sans-serif`) — no web fonts. This is intentional: the document is `lang="ja"`, so the OS's Japanese
faces render natively and instantly, with zero font-loading cost or layout shift. `fontFamily` is
uniform across all roles and stays in prose rather than the per-role tokens.

Hierarchy comes from **weight and size, never letter-spacing** (there is no custom tracking).
`leading-relaxed` is added for reading-flow paragraphs and `leading-tight` for compact headings
where needed. Numeric sequences — timeline years, the active year — use **tabular figures** so digits
align in a column.

The scale is deliberately small — six roles and a single body size — and the numbers live **only**
in the frontmatter. Within a role, prominence comes from **text color** (the lightness ramp), not a
smaller font: a field label and its value share one role and are told apart only by `text-tertiary`
vs `text-primary`. Size says *what kind of text* this is — heading, control, reading body, or meta;
color says *how prominent* it is within that kind. Because this is a reading instrument (Principle
3), body text stays comfortable for sustained reading and never shrinks to signal "secondary".
Hierarchy reads from the gaps *between* roles, so resist adding intermediate steps.

| Token | Usage |
|:---|:---|
| `title` | The loudest text — modal dialog titles **and** the active year (tabular figures). The headline of a surface. |
| `panel-title` | Panel heading — territory name, "{year}年の概観", error headings. |
| `section-heading` | Section headings within a panel **and** region-card headings. |
| `label` | Prominent control label — inactive year-selector buttons. |
| `body` | All reading text — context paragraphs, era subtitle, profile fields, timeline events, region-card body. Secondary reading text keeps this role and recedes via `text-secondary` / `text-tertiary`. |
| `caption` | The quietest text — metadata, nav-strip links, timeline years (tabular figures). |

## Layout

The layout is not a page grid — it is a **map canvas with corner-anchored overlays** (Principle 1):

- **The map's center is sacred.** Controls anchor to the corners with a consistent edge inset;
  nothing covers the focal geography.
- **Panels are bounded, never full-bleed.** A detail panel is a single readable column (never
  full-width on desktop); the year strip is centered with a comfortable max width.
- **Stacking order is fixed so overlays stay predictable:** map at the base, then persistent
  controls, then detail panels, with the mobile bottom sheet above everything.
- **Spacing follows the baseline rhythm of `spacing.unit`** — a consistent inset and internal
  padding, dense but orderly. Individual padding/gap values use Tailwind's default scale directly
  (`px-4`, `py-3`, `gap-2`); they live in prose because horizontal and vertical values often differ.

**Responsive is a re-home, not a reflow** (Principle 6). One threshold matters — a single tablet
width. Below it the corner summary trigger becomes a bottom-right FAB and side panels become a
draggable **bottom sheet** with snap points. The summary panel opens by default on desktop and
starts closed on mobile.

## Elevation & Depth

Depth is conveyed by **frosted glass, not heavy shadows** — and that is a direct consequence of
Principle 1, not a stylistic flourish. Every floating surface shares one treatment: a near-opaque
slate fill + a small backdrop blur + a soft shadow. The fill is near-opaque (not clear glass) so
text stays legible; the blur is small so the map reads as a soft presence beneath, not a
distraction. That faint, living map under the chrome is what makes the UI feel like instruments
laid over an atlas rather than an opaque app drawn on top. The consistency *is* the signal: a
surface that floats but skips the frosted treatment reads as a foreign element.

Two secondary cues: a **scroll-fade overlay** at a panel's bottom edge hints at more content below,
fading from whatever surface it sits on (`from-surface-panel` on desktop panels, `from-surface-sheet`
in the bottom sheet) so the gradient is seamless; and the bottom sheet darkens the map behind it with
`surface-scrim` only when fully expanded.

## Shapes

Shape is softly rounded — "approachable but precise" — and it also carries one piece of *meaning*.
Radii ride the framework defaults (the design owns no custom radius tokens), so they are named here
with their values:

- **`rounded-lg`** (0.5rem) — the default container corner: panels, icon buttons, the year-selector
  strip.
- **`rounded-full`** — pills (the summary FAB), timeline dots, the bottom-sheet drag handle.
- **`rounded-t-2xl`** (1rem, top edge only) — the mobile bottom sheet.
- A **left accent stripe** (`border-l-4` in `role-selected`) is the meaningful shape: it is the
  single signal that a panel is showing the *selected* territory.

## Components

The product is assembled from a small set of recurring pieces. Each note below captures a piece's
*intent* — when a detail here conflicts with a principle, the principle wins; the exact composition
is demonstrated in the design showcase rather than re-specified here.

- **Floating panel — the signature container.** A corner-anchored frosted surface (Principle 1):
  `surface-panel` fill, backdrop blur, soft shadow, `rounded-lg`, one readable column. Its header is
  fixed over a scrollable body — fixed *so the panel never jumps* as data loads — with a scroll-fade
  hinting at more below. When it shows the **selected territory** it gains a left accent stripe in
  `role-selected`, the only place a panel turns warm. It always renders one of the four `RemoteData`
  states.
- **`RemoteData` states (Principle 5).** *Loading* — a centered `role-loading` spinner ring in the
  body. *Error* — a plain-language message in the legible light-text ramp on a faint `role-error`
  tint, with `role-error` carrying only the accent (icon, hairline), never the body copy. *Empty* —
  a short plain-language line saying what's missing (e.g. "詳細情報は準備中です"), never a blank.
  *Loaded* — the real content. The header stays put across all four so the panel never jumps.
- **Year selector — the temporal control.** A horizontally-scrolling strip of segmented buttons
  divided by hairlines, with prev/next steppers at the ends. History is taught in discrete
  year-snapshots, so this is *segmented buttons, not a continuous slider*. The active year lifts to a
  `surface-raised` fill and the `title` role (bold, tabular); inactive years use the `label` role in
  `text-secondary` with hover feedback. `aria-current` marks the active year, the strip auto-scrolls
  it to center on change, and it is fully keyboard-navigable.
- **Icon button (control bar).** A frosted `rounded-lg` square; the icon rests at `text-dimmed` and
  brightens to `text-primary` on hover. Icon-only, always with an `sr-only` label, and sized to a
  comfortable touch target (≥44px) even when the glyph itself is small.
- **Summary trigger (pill / FAB).** A frosted `rounded-full` pill, icon + short label; hover lightens
  the fill with `surface-raised`. It sits in a corner on desktop and re-homes to a bottom-right FAB on
  mobile (Principle 6), shown only when no panel is open.
- **Close button.** Ghost: a grey icon that fills with `surface-raised` and goes `text-primary` on
  hover.
- **Bottom sheet (mobile).** The mobile re-home of side panels (Principle 6): an opaque
  `surface-sheet` surface with a `rounded-t-2xl` top edge and a `surface-handle` drag affordance,
  draggable between snap points, focus-trapped when expanded, and backed by `surface-scrim` only at
  full expansion. Size it with dynamic viewport units, never the static height.
- **Timeline (domain-specific).** A vertical rail of events: faint dots for past and future, and one
  emphasized *current* node — a `role-selected` dot with a soft glow and bold white text (Principle
  2). Past / current / future styling is centralized in one strategy map, not branched across the
  component.
- **Focus ring (Principle 4).** Because interaction is overwhelmingly select-not-type, the keyboard
  focus ring is the primary input affordance: a `role-focus` outline shown only for keyboard
  navigation (`:focus-visible`) and suppressed for the mouse.

## Do's and Don'ts

A scannable checklist of the principles above — use it to catch a screen that has drifted.

**Do**

- Reserve the gold accent (`role-selected`) strictly for the selected territory and the current year.
- Give every floating surface the frosted treatment (near-opaque slate + backdrop blur + soft shadow);
  depth comes from blur and translucency, not drop shadows.
- Keep the map's center clear and anchor controls to the corners.
- Render explicit loading / empty / error / loaded states for any async surface (`RemoteData`).
- Give every interactive control a comfortable touch target (≥44px), padding icon-only buttons out
  even when the glyph is small.
- Carry hierarchy with text color, and reach for a typography role token (`text-panel-title`,
  `text-body`) rather than a raw size + weight pair.
- On mobile, re-home controls (FAB + bottom sheet) instead of shrinking the desktop layout.
- Size full-height surfaces with dynamic viewport units (`100dvh`) so mobile browser chrome doesn't
  clip them, and honor `prefers-reduced-motion` (it is enforced globally).

**Don't**

- Don't spend the gold accent on hovers, emphasis, or any non-selection UI — scarcity is what makes
  it read as "now / here".
- Don't let `role-error` settle into the resting UI; it is transient feedback, not a second accent.
  (There is no standing warning color by design.)
- Don't mix the two color layers: territory fills and map-label colors never enter the chrome, and
  chrome tokens never paint the map.
- Don't hardcode hex or reach for raw Tailwind primitives (`gray-*`, `white`, `blue-*`) in chrome;
  every chrome color goes through a token.
- Don't add intermediate type roles or shrink body text to signal "secondary" — the scale is
  intentionally sparse and prominence comes from color.
- Don't add web fonts or swap the system stack — it breaks native Japanese rendering for no gain.
- Don't make a panel full-width on desktop or stack it over the map's focal area, and don't size a
  full-height surface to the static viewport (`100vh`) — it causes the iOS Safari jump.
