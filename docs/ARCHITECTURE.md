# Architecture

## Process model

```text
Electron main process
  ├─ Spotify OAuth/API + encrypted tokens
  ├─ centralized playback poller + semantic event detector
  ├─ LRCLIB LyricsManager + cache + provider clients
  ├─ tray, startup, power/session events
  ├─ monitor enumeration + overlay windows
  └─ validated IPC handlers
           │
           ▼
    isolated preload bridge
           │
           ▼
React renderer windows
  ├─ control center / onboarding
  └─ one transparent overlay per enabled display
       ├─ metadata composition
       ├─ rights-gated lyrics layer
       └─ single Canvas2D reactive background controller
```

## Security boundary

Only Electron main receives native/provider privileges. Renderer windows use `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`. Preload exposes a narrow allowlisted API; raw `ipcRenderer`, tokens, Node APIs, and raw provider responses are never exposed.

## Playback flow

```text
Spotify Web API -> strict normalizer -> CurrentTrack
                                  ├-> renderer playback snapshot/event broadcast
                                  ├-> semantic playback events
                                  └-> LyricsManager track identity update
```

Playback-position updates do not cause lyric network requests. Spotify playback position is also not permitted to drive visual synchronization.

## Lyrics flow

```text
CurrentTrack
  -> stable provider-scoped metadata key
  -> LyricsManager
       ├-> in-memory hit / short miss cache
       ├-> SimulatorLyricsProvider for app-owned demo tracks
       └-> LrclibProvider for normal tracks
            ├-> /api/get exact lookup
            └-> conservative /api/search fallback
  -> normalized LyricsState
  -> IPC/preload bridge
  -> rights/policy capability gate
  -> lyrics overlay
```

LRC parsing happens once at provider normalization time. Active-line lookup is binary search. The renderer schedules work around the next timed line rather than scanning all lines every frame. Spotify tracks intentionally keep timed highlighting disabled because Spotify policy forbids audiovisual synchronization.

## Reactive background

The overlay uses one Canvas2D animation controller rather than React state at 60 FPS. React supplies configuration and discrete state changes through refs. The canvas combines a deterministic seeded palette, large gradient field, atmospheric radial forms, parallax ribbon, depth particles, lyric-safe luminance shield, and vignette.

The engine derives a compact smoothed visual state from allowed signals. Simulator tracks can use progress, lyric cadence, active-line impulses, and upcoming-line anticipation. Spotify tracks receive only non-timeline discrete state and deterministic track identity.

Rendering is throttled/paused when hidden, settles while paused, caps device pixel ratio, adapts particle budget/quality, and removes RAF/listeners on cleanup. Reduced motion preserves atmosphere at lower cadence and greatly reduces particles/parallax/pulses.

## Settings flow

Validated preferences are stored in main, applied to native windows, and broadcast to all renderers. Main-window changes update existing overlays without reload. Per-monitor mode/layout settings stay independent.
