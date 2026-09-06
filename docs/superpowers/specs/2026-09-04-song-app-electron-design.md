# Song App — Electron Desktop Companion Design

**Date:** 2026-09-04  
**Status:** Design approved in principle; Electron substitution incorporated  
**Platform:** Windows-first  
**Core concept:** “Your music takes over your desktop.”

## 1. Product Goal

Build a polished Windows-first desktop music companion that connects to Spotify, observes permitted playback state, and transforms the desktop through premium typography, ambient graphics, track information, original humorous reactions, and legally permitted lyrics.

The app is not a Spotify clone, music player replacement, generic lyrics viewer, or simple mini-player. Spotify remains the playback application.

The product must remain valuable when lyrics are unavailable and must never trade copyright, Spotify policy, security, or user privacy for a visual effect.

## 2. Technology Decision

Use Electron instead of Tauri.

### Stack

- Electron
- React
- TypeScript in strict mode
- Vite
- modern CSS
- Motion / Framer Motion for finite UI transitions
- Zustand for lightweight renderer state
- Zod for IPC and external-data validation
- Vitest for unit/integration tests
- Playwright where practical for renderer/Electron end-to-end tests

### Electron process model

The application uses three trust levels:

1. **Main process** — privileged native controller.
2. **Preload bridge** — tiny, explicit capability bridge.
3. **Renderer processes** — sandboxed React interfaces with no direct Node/Electron access.

All renderers must use:

```ts
nodeIntegration: false
contextIsolation: true
sandbox: true
webSecurity: true
```

The renderer must never receive raw `ipcRenderer`, `shell`, `fs`, `child_process`, `BrowserWindow`, or other privileged Electron APIs.

IPC is schema-validated on both sides and every privileged handler verifies the calling sender/window.

## 3. Repository Structure

```text
song-app/
├─ electron/
│  ├─ main/
│  │  ├─ app.ts
│  │  ├─ windows/
│  │  │  ├─ main-window.ts
│  │  │  ├─ overlay-window.ts
│  │  │  ├─ lyrics-window.ts
│  │  │  └─ mini-player-window.ts
│  │  ├─ spotify/
│  │  │  ├─ auth.ts
│  │  │  ├─ client.ts
│  │  │  ├─ playback-poller.ts
│  │  │  └─ rate-limit.ts
│  │  ├─ storage/
│  │  │  ├─ secure-token-store.ts
│  │  │  └─ preferences-store.ts
│  │  ├─ system/
│  │  │  ├─ monitors.ts
│  │  │  ├─ tray.ts
│  │  │  ├─ startup.ts
│  │  │  ├─ shortcuts.ts
│  │  │  └─ power-events.ts
│  │  ├─ ipc/
│  │  │  ├─ channels.ts
│  │  │  ├─ schemas.ts
│  │  │  └─ handlers.ts
│  │  └─ security/
│  │     ├─ navigation-policy.ts
│  │     ├─ permissions.ts
│  │     └─ csp.ts
│  └─ preload/
│     ├─ index.ts
│     └─ api.ts
│
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ features/
│  │  ├─ spotify/
│  │  ├─ playback/
│  │  ├─ compliance/
│  │  ├─ lyrics/
│  │  ├─ overlays/
│  │  ├─ reactions/
│  │  ├─ themes/
│  │  ├─ simulator/
│  │  ├─ settings/
│  │  └─ onboarding/
│  ├─ hooks/
│  ├─ lib/
│  ├─ stores/
│  └─ types/
│
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ COMPLIANCE.md
│  ├─ PRIVACY.md
│  └─ SECURITY.md
│
└─ tests/
```

## 4. Main Process Responsibilities

The Electron main process owns all privileged functionality:

- application lifecycle
- Spotify OAuth PKCE coordination
- Spotify API calls
- secure token storage
- BrowserWindow creation/destruction
- transparent overlay configuration
- click-through handling
- always-on-top behavior
- taskbar visibility
- multi-monitor enumeration
- global shortcuts
- tray menu
- startup registration
- power/session lock handling
- external-link validation
- update-ready architecture
- logging of native failures

React renderers never perform these operations directly.

## 5. Preload API

Expose a narrow typed API with `contextBridge`.

Conceptually:

```ts
window.songApp = {
  spotify: {
    connect(),
    disconnect(),
    getConnectionState(),
    onPlaybackState(callback)
  },
  overlay: {
    setClickThrough(enabled),
    setEditMode(enabled),
    setVisible(enabled),
    getDisplays()
  },
  settings: {
    get(),
    update(patch)
  },
  system: {
    getStartupEnabled(),
    setStartupEnabled(enabled)
  }
}
```

No generic `invoke(channel, payload)` function is exposed to renderer code. Every capability gets a dedicated method.

## 6. Window Architecture

### Main Window

Purpose:

- onboarding
- Spotify connection
- appearance settings
- desktop modes
- lyrics configuration
- funny mode
- performance settings
- shortcuts
- privacy/compliance information
- developer simulator

Normal framed application window with platform-appropriate chrome or a carefully implemented custom title bar.

### Overlay Windows

Create one overlay per selected display rather than stretching one giant cross-monitor window.

Overlay properties:

- transparent
- frameless
- no taskbar entry
- click-through during normal operation
- optionally always on top
- positioned exactly to the selected display bounds
- independently configurable per monitor

Use Electron window APIs such as `setIgnoreMouseEvents()` for click-through behavior.

### Lyrics Window

Keep legally controlled lyric rendering isolated from other overlay content so the subsystem can be fully disabled without affecting the rest of the app.

### Mini Player

Architect the window now but defer the finished feature until after the main MVP is stable.

## 7. Spotify Architecture

Create a generic source boundary:

```ts
interface MusicSource {
  connect(): Promise<void>
  disconnect(): Promise<void>
  getCurrentTrack(): Promise<CurrentTrack | null>
  getPlaybackState(): Promise<PlaybackState>
}
```

Implement `SpotifyMusicSource` first.

This avoids coupling the visual product to one provider forever while keeping Spotify as the only production provider in MVP.

### OAuth

Use Authorization Code with PKCE.

Do not embed a Spotify client secret in the application.

Use a system-browser authorization flow with a validated callback mechanism. Verify the OAuth state value before accepting the authorization result.

Request only the minimum scopes required for implemented behavior.

### Token storage

Spotify tokens must never be stored in `localStorage` or a plaintext renderer preference file.

Use OS-backed secure storage where available, with Electron `safeStorage` or an equivalent audited native credential strategy. Store only what is required to maintain the session.

## 8. Playback Data Model

```ts
type CurrentTrack = {
  spotifyId: string
  title: string
  artists: string[]
  album: string
  albumImage?: string
  spotifyUrl: string
  durationMs: number
  progressMs?: number
  playing: boolean
}
```

Keep provider state and lyric state separate.

Normalize Spotify responses in the main process or a dedicated provider layer before emitting typed playback state to renderer windows.

## 9. Event Model

The visual system consumes semantic events, not raw Spotify responses.

```ts
type PlaybackEvent =
  | { type: 'track-changed'; track: CurrentTrack }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'stopped' }
  | { type: 'rapid-skip' }
  | { type: 'replay' }
  | { type: 'connection-lost' }
```

Pipeline:

```text
Spotify API
   ↓
provider normalizer
   ↓
CurrentTrack / PlaybackState
   ↓
event detector
   ↓
experience engine
   ↓
overlay composition
```

Track state may select and trigger a visual composition. Ambient animation then runs independently from the sound recording.

Do not build beat-synchronized, waveform-synchronized, or timestamp-synchronized audiovisual effects using Spotify recordings unless a later compliance review establishes explicit permission.

## 10. Compliance Capability Layer

All protected-content rendering passes through centralized capability checks.

```ts
type ContentCapabilities = {
  canDisplayMetadata: boolean
  canDisplayArtwork: boolean
  canTransformArtwork: boolean
  canDisplayLyrics: boolean
  canSynchronizeLyrics: boolean
  canCacheLyrics: boolean
  canSynchronizeVisualsToPlayback: boolean
}
```

Components must not infer permissions themselves.

Provide helpers such as:

```ts
canShowLyrics()
canSynchronizeLyrics()
canDisplaySpotifyArtwork()
canTransformSpotifyArtwork()
canCacheLyrics()
```

The default policy must be restrictive when permission is unknown.

## 11. Artwork Rules

Spotify artwork is displayed only when the capability layer permits it.

When displayed:

- preserve aspect ratio
- do not crop
- do not stretch
- do not recolor
- do not blur the artwork itself
- do not animate the image itself
- do not overlay decorative text/logos over the image
- provide required attribution and Spotify link behavior

Effects can exist around the artwork in separate layers.

## 12. Lyrics Architecture

```ts
interface LyricsProvider {
  searchTrack(input: LyricsSearchInput): Promise<LyricsTrackMatch | null>
  getLyrics(match: LyricsTrackMatch): Promise<LyricsResult>
  getSyncedLyrics?(match: LyricsTrackMatch): Promise<LyricsResult>
}
```

Rights model:

```ts
type LyricsRights = {
  canDisplay: boolean
  canSynchronize: boolean
  canCache: boolean
  cacheDurationMs?: number
  attribution?: string
  territories?: string[]
  commercialUse: boolean
}
```

Synchronization requires both provider rights and platform-level permission:

```ts
canSynchronize =
  providerRights.canSynchronize &&
  platformPolicy.canSynchronizeLyrics
```

MVP providers:

- `DemoLyricsProvider`
- optional public-domain test provider

No copyrighted lyric dataset ships in the repository.

## 13. Experience Engine

The experience engine maps semantic events and user preferences to visual compositions.

Inputs:

- playback events
- active theme
- selected desktop mode
- chaos level
- monitor configuration
- reduced-motion preference
- current app state

Outputs:

- composition ID
- typography arrangement
- transition preset
- ambient effect preset
- optional original reaction message

The engine must not require lyrics.

## 14. Core Modes

### Minimal Mode

- song title
- artist
- Spotify attribution/link
- optional untouched artwork
- restrained transitions

### Typography Mode

Composable text layouts including:

- edge-spanning title
- vertical artist name
- compact metadata
- editorial compositions

### Chaos Mode

Original deterministic reaction system based on safe state such as:

- track changed
- replay
- rapid skipping
- track duration bucket
- session length bucket
- time-of-day bucket

Chaos levels:

- 0 minimal
- 1 subtle
- 2 playful
- 3 ridiculous

No insults, unsafe output, explicit content, or dependency on protected lyrics.

### Desktop Ambience

Application-owned visual systems:

- particles
- geometric lines
- grain
- abstract waves
- stars
- kinetic typography
- equalizer-inspired but non-audio-synchronized shapes

## 15. Theme System

Themes use tokens rather than separate duplicated renderers.

```ts
type VisualTheme = {
  typography: TypographyTokens
  spacing: SpacingTokens
  composition: CompositionTokens
  motion: MotionTokens
  effects: EffectTokens
}
```

Initial visual directions:

- Editorial
- Terminal
- Cinematic
- Minimal
- Brutalist
- Y2K
- Monochrome
- Pixel
- Cyber

Do not build all of them for the first milestone. Ship a small number at exceptional quality first.

## 16. Overlay Interaction

Normal mode:

```text
mouse → desktop
visual overlay → ignores input
```

Edit mode:

```text
Ctrl + Shift + L
      ↓
click-through disabled
      ↓
widgets become interactive
      ↓
user moves/resizes
      ↓
layout saved
      ↓
click-through restored
```

The shortcut is configurable.

## 17. Multi-Monitor Model

Enumerate Electron displays and persist a stable local mapping where possible.

Each selected display gets an independent overlay configuration:

```ts
type DisplayProfile = {
  displayId: string
  enabled: boolean
  mode: DesktopMode
  themeId: string
  layoutId: string
}
```

Display connect/disconnect and DPI changes must rebuild positioning safely.

## 18. System Tray and Startup

Tray menu:

- Open
- Show/Hide overlays
- Current mode
- Pause animations
- Edit layout
- Settings
- Disconnect Spotify
- Quit

When “Start with Windows” is enabled:

- launch silently
- do not open the main window
- restore overlays/settings
- reconnect using stored tokens where possible
- remain available through the tray

## 19. Performance Design

Electron has a larger baseline footprint than Tauri, so renderer count and persistent work must be controlled deliberately.

Rules:

- create only windows that are enabled
- destroy optional hidden windows when keeping them alive provides no user benefit
- do not use continuous requestAnimationFrame loops while nothing changes
- pause ambient rendering when hidden
- suspend animations on display sleep/session lock
- throttle or stop visual work when no music is playing
- use transform/opacity for motion
- avoid layout thrashing
- avoid permanent WebGL contexts for simple effects
- lazy-load settings/developer-only UI
- keep renderer dependencies small
- share lightweight playback state instead of duplicating polling in each window

Visual renderer state:

```text
SLEEPING
   ↓ event
TRANSITIONING
   ↓ transition completes
AMBIENT
```

## 20. Polling and Rate Limits

Only one service polls Spotify.

Renderer windows subscribe to normalized application state and never make independent Spotify requests.

The service must:

- use a sensible active polling interval
- slow or stop when nothing is playing
- stop/reduce calls while offline
- refresh expired access tokens
- handle 401/403/429 explicitly
- honor `Retry-After` when supplied
- apply exponential backoff with jitter for transient failures

## 21. Error and Disconnected States

Explicit states:

- Spotify disconnected
- OAuth cancelled
- OAuth failed
- token expired/refresh failed
- Spotify unavailable
- network unavailable
- rate limited
- no song playing
- private/restricted playback state
- artwork unavailable
- lyrics unavailable
- lyrics provider unavailable
- display removed

Every state gets a finite UI. No indefinite spinners.

## 22. Developer Simulator

Developer mode allows the UI to run without Spotify calls.

Simulations:

- track starts
- track changes
- pause/resume
- replay
- rapid skips
- long track
- missing artwork
- lyrics available
- lyrics unavailable
- API error
- rate limit
- expired token
- offline state
- monitor connect/disconnect fixtures

Only original or public-domain lyric samples are allowed.

## 23. Security Requirements

Mandatory Electron security posture:

- use a current supported Electron release
- `nodeIntegration: false`
- `contextIsolation: true`
- renderer sandbox enabled
- strict Content Security Policy
- no remote executable code
- restrict navigation
- deny unexpected window creation
- validate external URLs before `shell.openExternal`
- no raw Electron APIs exposed through preload
- explicit IPC allowlist
- schema validation for IPC payloads
- verify IPC sender/window for privileged actions
- configure session permission handlers
- keep `webSecurity` enabled
- evaluate Electron fuses before production signing
- minimize native modules
- never place credentials in renderer bundles

## 24. Privacy

Default local data:

- preferences
- monitor/layout configuration
- theme selection
- secure authentication tokens
- limited operational logs without sensitive content

Do not maintain a listening-history database in MVP.

Do not send Spotify content to external AI services for reaction generation.

No Spotify content is collected for model training or fine-tuning.

## 25. Accessibility

- keyboard navigation
- visible focus indicators
- semantic controls
- screen-reader labels
- reduced-motion support
- scalable text
- sufficient contrast
- major interactive targets at least 44px
- desktop overlay never traps focus outside edit mode

## 26. Testing Strategy

### Unit tests

- Spotify response normalization
- playback-event detector
- rate-limit/backoff logic
- capability engine
- lyrics rights decisions
- Chaos reaction selection
- theme token resolution
- settings validation

### Integration tests

- preload API ↔ IPC contracts
- secure sender validation
- auth-state transitions
- token-refresh failure recovery
- overlay state management
- monitor profile persistence

### Electron end-to-end tests

Where CI/runtime support permits:

- app launches
- main window renders
- tray lifecycle works
- overlay is transparent
- click-through toggles
- edit mode restores interaction
- multi-window state broadcasts
- disconnected states render

### Mandatory compliance regression tests

Tests must prove:

- restricted lyrics cannot render
- lyric synchronization cannot activate without both provider and platform permission
- prohibited artwork transformations are rejected
- renderers cannot access Node.js directly
- unknown IPC channels/actions are unavailable

## 27. MVP Scope

### Milestone 1 — Foundation

- Electron + React + Vite + TypeScript
- secure BrowserWindow defaults
- preload bridge
- IPC contracts
- settings persistence
- tray
- base design system

### Milestone 2 — Playback

- Spotify PKCE
- secure token storage
- current-track service
- normalized playback state
- reconnect/refresh/error handling
- developer simulator

### Milestone 3 — Desktop Experience

- primary display overlay
- click-through
- edit-mode foundation
- Minimal Mode
- premium track transitions
- Chaos Mode
- original ambience renderer

### Milestone 4 — Productization

- multi-monitor basics
- onboarding
- startup behavior
- reduced motion
- complete disconnected states
- compliance/privacy/security documentation
- testing and performance pass

### Deferred from first polished MVP

- production licensed lyrics provider
- synchronized lyrics
- advanced graphical layout editor
- finished mini-player
- marketplace
- user theme sharing
- complex audio-reactive visualization

## 28. Definition of Done

The MVP is complete only when a user can:

1. install the Windows application;
2. launch it and complete onboarding;
3. connect Spotify securely;
4. select a desktop experience;
5. minimize the app to the tray;
6. play music in Spotify;
7. see the overlay update promptly on track changes;
8. interact normally with the desktop while the overlay is click-through;
9. enter and leave layout edit mode;
10. recover cleanly from disconnected/API/offline states;
11. restart Windows/app and restore their selected experience when startup is enabled.

Before release, verify:

- build/package succeeds
- no Electron security warnings caused by app configuration
- Spotify authentication works with real credentials supplied by the developer
- token refresh works
- rate-limit handling works
- overlay click-through works
- multiple displays work
- startup/tray lifecycle works
- reduced motion works
- rights fail-safes work
- artwork rules are enforced
- idle CPU/GPU activity is acceptably low
- no persistent unnecessary animation loops remain
- compliance documentation matches the current Spotify policy at release time

## 29. Architectural Decision

**Selected approach:** Spotify-first metadata companion implemented behind a generic `MusicSource` interface.

Spotify provides permitted playback state. The application reacts to discrete playback events, but ambient visuals are independently animated rather than synchronized to the recording.

Electron is the desktop runtime. The main process owns privileges; the React renderers remain sandboxed and communicate only through a narrow typed preload bridge.

This is the architecture to use for implementation unless a later compliance review requires a stricter capability to be disabled.
