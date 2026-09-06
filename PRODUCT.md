# Song App — Product Context

## Product promise

**Your music takes over your desktop, quietly.** Song App is a Windows-first desktop companion that reads permitted Spotify playback state and turns it into tasteful, original desktop compositions. Spotify remains the player; Song App is the visual layer around it.

## Primary user

A Windows Spotify listener who wants their desktop to feel expressive while music is playing, without running a heavy dashboard, giving up normal desktop interaction, or tolerating constant visual noise.

## Core jobs

1. Connect Spotify safely and understand what is currently playing.
2. Turn track-state changes into immediate, polished desktop transitions.
3. Offer an elegant all-day Minimal mode and more expressive optional modes.
4. Stay out of the way through click-through overlays, tray-first behavior, and low idle work.
5. Make compliance visible and enforceable rather than relying on developer memory.

## Experience principles

- Premium and desktop-native, not a Spotify clone.
- Expressive typography before decorative chrome.
- Minimal mode must be calm enough to leave running all day.
- Chaos mode is funny without insulting or profiling the listener.
- Every visible control performs a real action.
- Continuous background work is visibility/power aware, quality-adaptive, and throttled when paused/hidden.
- No copyrighted lyrics bundled with the app; live lyrics are fetched on demand from LRCLIB when the user enables the lyrics layer.
- No Spotify audio playback, scraping, downloading, or audio-driven visualization.
- Protected content fails closed when rights or attribution requirements are unknown.

## MVP surfaces

- Six-step first-run onboarding.
- Main control center with Spotify, Appearance, Lyrics, Desktop, Funny Mode, Performance, Shortcuts, Privacy, and Developer sections.
- One transparent overlay window per enabled display.
- Minimal, Typography, Chaos, and Ambience desktop modes.
- Windows system tray and silent startup.
- Developer simulator with app-owned sample content.

## Success criteria

- Track changes feel immediate without excessive API polling.
- Overlay remains click-through outside explicit layout-edit mode.
- Hidden, locked, suspended, or idle states stop optional animation work.
- Main controls remain keyboard-accessible and usable at the 720px minimum app width.
- Dark, light, and system themes remain coherent.
- Compliance capability checks prevent restricted content paths.
- A disconnected or unavailable provider always resolves to a finite state, never an infinite spinner.

## Non-goals for this release

- Streaming or controlling Spotify audio.
- Beat, waveform, progress-timeline, or audio-synchronized visual effects.
- A Spotify browsing/catalog client.
- A listening-history database.
- An AI service that receives Spotify metadata, artwork, or lyrics.
- Treating LRCLIB API availability as proof of commercial lyric licensing or rights clearance.
- A theme marketplace or full drag-resize layout editor.
