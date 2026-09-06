# Song App — Design System

## Direction

Song App should feel like a high-end Windows utility with editorial restraint. The control center is deliberately quiet; the expressive moment belongs on the desktop overlay. Avoid default dashboard grids, giant rounded containers, heavy glass effects, Spotify-green imitation, decorative badges, and motion that exists only to show off.

## Typography

- UI: **Segoe UI Variable** → Segoe UI → system sans-serif.
- Display: **Segoe UI Variable Display** → Segoe UI → system sans-serif.
- Mono: Cascadia Code → Consolas.
- Headings use compact leading and negative tracking; body copy stays small but readable.
- Control text is explicitly sized and weighted; never rely on browser defaults.

## Color

### Dark default

- Background `#0d0f13`
- Surface `#14171d`
- Elevated `#1a1e26`
- Foreground `#f4f5f7`
- Muted `#969daa`
- Accent `#b8a7ff`

The accent is deliberately not Spotify green. Borders do more work than shadows. Elevation is restrained.

### Light

- Background `#f5f5f3`
- Surface `#ffffff`
- Foreground `#15171b`
- Muted `#666c75`
- Accent `#7560d8`

Semantic text colors must maintain WCAG AA contrast against the app background.

## Layout

- Control center: 214px navigation rail + flexible stage.
- Compact desktop layout begins at 880px and collapses the rail to icons.
- Minimum main-window width: 720px.
- Settings content measure: max 830px with open whitespace, rule lines, and row-based controls instead of card stacks.
- Major interactive targets: 44px minimum.

## Controls

- Primary action: solid foreground-on-background, used sparingly.
- Secondary/quiet actions: subtle border or text treatment.
- Toggle rows make the whole row clickable; hidden checkbox focus is mirrored onto the visible switch.
- Segmented controls use `aria-pressed` and 44px targets.
- Selected navigation uses `aria-current="page"`.
- Save/network failures remain local to the relevant surface and never replace the whole app after boot.

## Overlay composition

The desktop overlay is transparent and normally click-through. It may become interactive only in explicit layout-edit mode.

- **Minimal**: optional untouched album art beside large title/artist typography.
- **Typography**: title scale and orientation become the main composition.
- **Chaos**: original reaction copy is visually separated from provider metadata.
- **Ambience**: app-owned geometric lines, grain, and particles plus compact metadata.

Spotify artwork is never cropped, blurred, recolored, animated, covered, or used as wallpaper. Spotify attribution uses only official local logo assets and links back to Spotify.

## Visual themes

Themes are token presets, not separate component trees. Production presets: Editorial, Terminal, Cinematic, Monochrome, Brutalist, and After Dark. Each theme controls display typography, palette, composition width, transition timing, grain, and line intensity.

## Motion

- Prefer opacity and transforms.
- No permanent WebGL context.
- One Canvas2D controller supplies atmospheric motion across modes; it pauses while hidden/locked, throttles while paused, and adapts quality when drawing becomes expensive.
- 30/60 cadence settings affect the real Canvas2D frame scheduler; high-frequency animation stays outside React reconciliation.
- OS `prefers-reduced-motion` and the in-app Reduced Motion setting preserve atmosphere but lower cadence, particle count, parallax, and pulse strength.
- Useful feedback is not globally reduced to 0.01ms.

## States

Every provider surface must support: disconnected, connecting/busy, connected, nothing playing, offline, rate limited, expired/rejected token, and brand-asset-not-ready. The developer simulator covers these states without copyrighted data.

## Accessibility floor

- Keyboard navigation throughout the main window.
- Visible focus on every interactive control.
- 44px major targets.
- Polite announcements for playback/status changes.
- Alerts for actionable failures.
- Sufficient color contrast in both themes.
- Scalable/wrapping text and no essential hover-only information.
