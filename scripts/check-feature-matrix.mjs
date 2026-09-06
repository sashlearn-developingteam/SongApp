import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(path, 'utf8');
const controls = read('src/features/settings/ControlCenter.tsx');
const overlay = read('src/features/overlays/OverlayView.tsx');
const ambient = read('src/features/overlays/ReactiveBackgroundCanvas.tsx');
const lyricsProvider = read('electron/main/lyrics/lrclib-provider.ts');
const lyricsManager = read('electron/main/lyrics/lyrics-manager.ts');
const manager = read('electron/main/windows/overlay-manager.ts');
const ipc = read('electron/main/ipc/handlers.ts');
const main = read('electron/main/index.ts');
const simulator = read('electron/main/simulator/scenarios.ts');

const checks = [
  ['desktop overlay visibility', /overlaysVisible/.test(controls) && /overlaysVisible/.test(manager)],
  ['global desktop mode', /desktopMode/.test(controls) && /desktopMode/.test(overlay)],
  ['per-monitor mode', /Monitor mode/.test(controls) && /monitorPreference\?\.mode/.test(overlay)],
  ['visual themes', /visualTheme/.test(controls) && /visualTheme/.test(overlay)],
  ['always on top', /alwaysOnTop/.test(controls) && /setAlwaysOnTop/.test(manager)],
  ['start with Windows', /startWithWindows/.test(controls) && /setStartupEnabled/.test(ipc)],
  ['chaos reactions', /chaosEnabled/.test(controls) && /chaosFrequency/.test(overlay) && /playbackEvent/.test(overlay)],
  ['lyrics layer', /lyricsEnabled/.test(controls) && /LyricsLayer/.test(overlay) && /canRenderLyrics/.test(overlay) && /LRCLIB/.test(controls) && /LrclibProvider/.test(main)],
  ['lyrics caching', /LyricsCache/.test(lyricsManager) && /lyricsTrackKey/.test(lyricsManager)],
  ['reduced motion', /reducedMotion/.test(controls) && /reducedMotion/.test(ambient)],
  ['animation intensity', /animationIntensity/.test(controls) && /animationIntensity/.test(overlay)],
  ['30\/60 FPS target', /fpsTarget/.test(controls) && /fpsTarget/.test(ambient)],
  ['particle amount', /particleAmount/.test(controls) && /particleAmount/.test(overlay)],
  ['layout editing', /Edit layout/.test(controls) && /persistLayout/.test(overlay) && /Reset layout/.test(overlay)],
  ['custom edit shortcut', /editShortcut/.test(controls) && /globalShortcut/.test(main)],
  ['developer simulator', /simulator\.run/.test(controls) && /rapid-skip/.test(simulator) && /replay/.test(simulator)],
  ['Spotify connection', /spotify\.connect/.test(controls) && /spotifyAuth\.connect/.test(ipc)]
];

let passed = 0;
for (const [name, ok] of checks) {
  if (ok) passed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
}
console.log(`\nFeature wiring matrix: ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
