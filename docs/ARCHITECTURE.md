# Architecture

## Process model

```text
Electron main process
  ├─ Spotify OAuth/API + encrypted tokens
  ├─ playback poller and event detector
  ├─ tray, startup, power/session events
  ├─ monitor enumeration and overlay windows
  └─ validated IPC handlers
           │
           ▼
    isolated preload bridge
           │
           ▼
React renderer windows
  ├─ main control center / onboarding
  └─ one transparent overlay per enabled display
```

## Security boundary

Only the Electron main process receives native privileges. Renderer windows use `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`. Permission requests are denied by default. Preload exposes an allowlisted typed bridge rather than raw `ipcRenderer` or Electron objects.

Every privileged IPC invoke validates the sender URL and parses inputs with schemas. Navigation/new-window requests are denied and, for exact allowlisted Spotify HTTPS hosts, redirected through the system browser.

## Playback flow

```text
Spotify Web API → strict normalizer → PlaybackState
                                ├→ playback store broadcast
                                └→ semantic event detector
                                      └→ experience/reaction engine
```

The overlay never consumes raw Spotify responses. Track progress does not drive visual animation.

## Settings flow

Preferences are validated, atomically written, and broadcast to all renderer windows after changes. Main-window changes therefore update existing overlay windows without reload. Tray actions and monitor reconciliation also synchronize the same settings state.

Display profiles store per-monitor enable/mode/theme information. Global mode/theme choices update current profiles, while newly discovered monitors inherit the current global defaults.

## Rendering lifecycle

Overlay windows are created only for enabled, available displays. Disabled display overlays are destroyed. Hiding overlays pauses optional ambient motion through synchronized settings and hides the native windows. Power suspend/lock events pause polling and animation; resume/unlock restore the prior animation pause state.

No WebGL context is created in the MVP. Ambient effects use bounded CSS geometry/particles and paused animation states.

## Lyrics

`LyricsProvider` is an abstraction. Rights are represented independently from lyric lines and checked through centralized capability functions before rendering. The bundled provider uses only development-owned text.
