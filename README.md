# Song App

A Windows-first Electron music companion that turns permitted Spotify playback state into a premium desktop layer.

## What ships

- Electron main/preload/renderer security boundary
- Spotify PKCE connection and encrypted token storage
- tray-first Windows behavior and silent startup
- transparent per-monitor overlays with click-through/edit modes
- Minimal, Typography, Chaos, and Ambience modes
- six token-driven visual themes
- developer playback simulator
- LRCLIB default lyrics provider plus app-owned simulator provider
- compliance capability checks and release fail-safes
- dark/light/system themes and reduced-motion support

## Requirements

- Windows 10/11 x64 for the production target
- Node.js 22.12+
- Spotify Developer application/client ID for live Spotify testing
- official Spotify full-logo assets before live provider content or release packaging

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Set `MAIN_VITE_SPOTIFY_CLIENT_ID` in `.env` and register this exact redirect URI in the Spotify developer dashboard:

```text
http://127.0.0.1:43821/callback
```

Spotify attribution assets are provisioned automatically before `npm run dev` and `npm run build`. Song App downloads the official **Full Logo** Green and White PNGs directly from Spotify's Press Center, validates that the responses are PNG images, caches them under `public/spotify`, and never recreates or recolors them. You can also run the setup explicitly:

```powershell
npm run setup:spotify-brand
```

Review `docs/COMPLIANCE.md` before release and keep the downloaded files unmodified.


### Electron/runtime install note

The project explicitly allows the install scripts required by Electron, `esbuild`, and Windows packaging. A fresh `npm install` also runs Song App's small Electron runtime check. If npm unpacked the `electron` package but skipped its binary download, Song App detects the missing `node_modules/electron/path.txt` or executable and runs Electron's own `install.js` once to repair it.

You can run the repair explicitly at any time:

```powershell
npm run setup:electron
```

`npm run dev` runs the same check automatically before `electron-vite`, so a missing Electron binary should now fail with a useful installer/network error instead of the cryptic `Error: Electron uninstall`.


## Git workflow

Once this project is pushed to your GitHub repository, clone it once on a new computer:

```powershell
git clone <YOUR_REPOSITORY_URL>
cd Song-App
npm install
Copy-Item .env.example .env
```

For normal updates afterward, do not download another ZIP. From the existing project folder run:

```powershell
git status
git pull --ff-only
npm install
npm run verify:windows
npm run dev
```

Keep `.env` local. It is gitignored and must never be committed. If you have local code edits, commit them to a branch before pulling rather than forcing over them. See `docs/GIT_WORKFLOW.md` for the branch/update commands.

## Development

```powershell
npm run dev
```

The Developer section can simulate track starts, changes, pauses, rapid skipping, replay, long tracks, missing artwork, offline state, rate limiting, and expired authentication without calling Spotify.

## Verification

```powershell
npm run test:core
npm run test
npm run typecheck
npm run build
npm run audit
npm run check:release
```

## Windows package

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows.ps1
```

The build produces an NSIS installer and a portable x64 executable under `release/` when all release checks pass.

## Feature-complete integration pass

The control-center options are wired to real desktop behavior rather than being presentation-only controls:

- **Show desktop overlay** creates/destroys monitor overlay windows and stays synchronized with the tray toggle.
- **Minimal / Typography / Chaos / Ambience** switch the live overlay immediately.
- **Per-monitor mode** can inherit the global mode or override it independently.
- **Visual themes** update every existing overlay through the shared settings channel.
- **Always on top** changes the native Electron overlay window level.
- **Start with Windows** updates the Windows login-item setting.
- **Chaos level + frequency** consume semantic track-change, pause/resume, replay, and rapid-skip events.
- **Lyrics** uses LRCLIB in the Electron main process with exact matching, conservative search fallback, bounded caching/backoff, and explicit provider states. The simulator retains app-owned synced demo lyrics.
- **Background intensity / particle amount / 30 or 60 FPS** drive the layered deterministic Canvas2D reactive-background engine.
- **Reduced motion** preserves a slow atmospheric scene while sharply reducing parallax, pulses, particle work, and render cadence.
- **Edit layout** unlocks the native click-through overlay, supports drag/scale/reset, persists per-monitor layout, and shares one edit-mode state with the tray and global shortcut.
- **Developer simulator** emits the same track/event channel as live playback, including demo artwork and missing-artwork/error states.

### Windows QA checklist

After installing dependencies, run the automated gate:

```powershell
npm run verify
npm run check:features
```

Then run the desktop app:

```powershell
npm run dev
```

In **Developer**, press `track start`. The primary desktop overlay should appear with the demo track. Change all four desktop modes and confirm the existing overlay changes immediately. In **Performance**, switch 30/60 FPS and vary intensity/particles while using Ambience. Enable **Lyrics** with a simulator track for full timed demo behavior, then try a live track to verify LRCLIB provider states and static Spotify-safe lyric display. In **Funny Mode**, enable Chaos and try replay/rapid-skip. In **Now Playing**, choose **Edit layout**, drag/resize the overlay, click Done, then enter edit mode again using `Ctrl+Shift+L`. Finally toggle the overlay from both the control center and tray and confirm both stay synchronized.


## LRCLIB + reactive background (v1.2)

LRCLIB is the default lyrics source for non-simulator tracks. Song App sends title, primary artist, optional album, and rounded duration from the main process, parses synchronized LRC once, caches results in memory, and exposes only normalized lyric state through preload IPC. LRCLIB is a community source; Song App does not claim commercial lyric-display rights.

The background is now a single layered Canvas2D controller with deterministic per-song visual identity, palette crossfades, atmospheric fields, depth particles, parallax accents, lyric-safe luminance control, adaptive quality, visibility throttling, and reduced-motion behavior. Full playback/lyric-timing reactivity runs only for sources whose policy allows synchronization (the app-owned simulator). Spotify tracks remain capability-gated against playback-timeline synchronization.

## Policy boundary

Song App does not stream Spotify audio, scrape lyric websites, manipulate Spotify artwork, or synchronize Spotify recordings to visual media. LRCLIB is queried only through its API when the lyrics layer is enabled. See `docs/COMPLIANCE.md` and `docs/PRIVACY.md`.
