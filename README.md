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
- lyrics-provider abstraction with app-owned demo text
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

Install official Spotify brand assets on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-spotify-brand.ps1
```

The script verifies that the official **Full Logo** assets are present and tells you the exact filenames expected by the app. The assets are intentionally not bundled or recreated; download them directly from Spotify's Developer Design Guidelines and keep them unmodified. Review `docs/COMPLIANCE.md` before release.


### npm 12 install-script note

This project explicitly allows the install scripts required by `esbuild` and Windows packaging in `package.json`. If you installed dependencies before updating to this fixed source and npm reported that those scripts were blocked, run:

```powershell
npm install
npm rebuild esbuild electron-winstaller
```

Then start the app with `npm run dev`.

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
- **Lyrics** renders only app-owned demo lyrics when the rights gate permits display. Live Spotify metadata never unlocks unlicensed lyrics.
- **Animation intensity / particle amount / 30 or 60 FPS** drive the real canvas ambience renderer.
- **Reduced motion** stops continuous ambience movement and uses restrained state transitions.
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

In **Developer**, press `track start`. The primary desktop overlay should appear with the demo track. Change all four desktop modes and confirm the existing overlay changes immediately. In **Performance**, switch 30/60 FPS and vary intensity/particles while using Ambience. Enable **Lyrics** with a simulator track. In **Funny Mode**, enable Chaos and try replay/rapid-skip. In **Now Playing**, choose **Edit layout**, drag/resize the overlay, click Done, then enter edit mode again using `Ctrl+Shift+L`. Finally toggle the overlay from both the control center and tray and confirm both stay synchronized.

## Policy boundary

Song App does not stream Spotify audio, scrape lyrics, manipulate Spotify artwork, or synchronize visuals to the sound recording. See `docs/COMPLIANCE.md` and `docs/PRIVACY.md`.
