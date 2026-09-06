import { existsSync, readFileSync } from 'node:fs';

const checks = [
  ['Accessibility', '44px interaction floor', () => readFileSync('src/styles.css','utf8').includes('min-height:44px')],
  ['Accessibility', 'visible focus', () => readFileSync('src/styles.css','utf8').includes(':focus-visible')],
  ['Accessibility', 'reduced motion', () => readFileSync('src/styles.css','utf8').includes('prefers-reduced-motion')],
  ['Accessibility', 'semantic current nav', () => readFileSync('src/features/settings/ControlCenter.tsx','utf8').includes('aria-current')],
  ['Performance', 'central playback poller', () => existsSync('electron/main/spotify/playback-poller.ts')],
  ['Performance', 'power suspend handling', () => readFileSync('electron/main/index.ts','utf8').includes("powerMonitor.on('suspend'")],
  ['Performance', 'overlays hidden on lock', () => readFileSync('electron/main/index.ts','utf8').includes("powerMonitor.on('lock-screen'")],
  ['Performance', 'finite track transitions', () => readFileSync('src/features/overlays/OverlayView.tsx','utf8').includes('AnimatePresence')],
  ['Responsive', 'main minimum dimensions', () => readFileSync('electron/main/windows/window-factory.ts','utf8').includes('minWidth: 820')],
  ['Responsive', 'compact UI breakpoint', () => readFileSync('src/styles.css','utf8').includes('@media (max-width:900px)')],
  ['Responsive', 'one overlay per display', () => readFileSync('electron/main/windows/overlay-manager.ts','utf8').includes('screen.getAllDisplays()')],
  ['Responsive', 'per-monitor mode', () => readFileSync('src/features/overlays/OverlayView.tsx','utf8').includes('monitorPreferences[displayId]')],
  ['Theming', 'semantic tokens', () => readFileSync('src/styles.css','utf8').includes('--surface:')],
  ['Theming', 'light theme', () => readFileSync('src/styles.css','utf8').includes('data-theme="light"')],
  ['Theming', 'system theme', () => readFileSync('src/styles.css','utf8').includes('prefers-color-scheme:light')],
  ['Theming', 'visual theme tokens', () => readFileSync('src/features/themes/themes.ts','utf8').includes('VISUAL_THEMES')],
  ['Integrity', 'sandboxed renderer', () => readFileSync('electron/main/security/navigation-policy.ts','utf8').includes('sandbox: true')],
  ['Integrity', 'context isolation', () => readFileSync('electron/main/security/navigation-policy.ts','utf8').includes('contextIsolation: true')],
  ['Integrity', 'lyrics fail closed', () => /canSynchronizeLyrics:[^\n]*!spotify/.test(readFileSync('src/features/compliance/capabilities.ts','utf8'))],
  ['Integrity', 'no Spotify AV synchronization', () => /canSynchronizeVisualsToPlayback:[^\n]*!spotify/.test(readFileSync('src/features/compliance/capabilities.ts','utf8'))]
];
let score = 0;
for (const [group, name, fn] of checks) {
  let pass = false;
  try { pass = Boolean(fn()); } catch {}
  if (pass) score += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} [${group}] ${name}`);
}
console.log(`\nSong App internal craft audit: ${score}/20`);
if (score !== 20) process.exit(1);
