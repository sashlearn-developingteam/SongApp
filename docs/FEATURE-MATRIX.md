# Feature Integration Matrix

| UI control / feature | Runtime consumer | Verification |
| --- | --- | --- |
| Show desktop overlay | Electron `OverlayManager.sync()` | `scripts/check-feature-matrix.mjs`, regression test |
| Desktop mode | Overlay renderer mode switch | feature matrix |
| Per-monitor mode | display-query-specific overlay preference | feature matrix |
| Visual theme | shared settings broadcast + overlay theme tokens | feature matrix |
| Always on top | native `BrowserWindow.setAlwaysOnTop()` | feature matrix |
| Start with Windows | Electron login item settings | feature matrix |
| Chaos enabled/level/frequency | semantic playback-event reaction engine | core + regression tests |
| Lyrics enabled | LRCLIB/Simulator provider manager + rights-gated lyrics layer | core + regression tests |
| Reduced motion | transition + reactive Canvas2D scheduler | core + craft audit |
| Animation intensity | Motion transitions + reactive Canvas2D state engine | core + regression tests |
| FPS target | throttled/adaptive reactive canvas frame interval | core + regression tests |
| Particle amount | adaptive seeded particle budget | core + regression tests |
| Edit layout | native input unlock + persistent monitor layout | regression tests |
| Edit shortcut | Electron global shortcut with safe fallback | regression tests |
| Simulator scenarios | shared playback track/event publishing | core tests |
| Spotify connection | PKCE auth + central polling | feature matrix |

The renderer never directly receives Spotify tokens or raw LRCLIB payloads. LRCLIB is the default community lyrics provider. Spotify-timed lyric highlighting and playback-timeline visual synchronization remain disabled by the Spotify platform policy gate.
