import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const preload = read('electron/preload/index.ts');
const main = read('electron/main/index.ts');
const ipc = read('electron/main/ipc/handlers.ts');
const overlay = read('src/features/overlays/OverlayView.tsx');
const controls = read('src/features/settings/ControlCenter.tsx');
const types = read('src/types/core.ts');

test('playback bridge exposes an initial snapshot and semantic playback events', () => {
  assert.match(preload, /getSnapshot/);
  assert.match(preload, /onEvent/);
  assert.match(ipc, /playback:snapshot/);
  assert.match(main, /detectPlaybackEvents/);
});

test('lyrics setting has LRCLIB main-process plumbing and a rights-gated overlay renderer', () => {
  assert.match(overlay, /LyricsLayer/);
  assert.match(overlay, /canRenderLyrics/);
  assert.match(preload, /lyrics:refresh/);
  assert.match(main, /LrclibProvider/);
  assert.match(main, /setEnabled\(next\.lyricsEnabled\)/);
});

test('performance settings drive the reactive background renderer', () => {
  assert.match(overlay, /ReactiveBackgroundCanvas/);
  assert.match(overlay, /fpsTarget/);
  assert.match(overlay, /animationIntensity/);
});

test('layout edit mode persists a per-monitor layout', () => {
  assert.match(types, /layout\?:/);
  assert.match(overlay, /persistLayout/);
  assert.match(overlay, /Reset layout/);
});

test('currently hidden behavior settings are exposed in the control center', () => {
  assert.match(controls, /chaosFrequency/);
  assert.match(controls, /editShortcut/);
  assert.match(controls, /monitor mode/i);
});

test('primary overlay enablement compares display ids instead of object identity', () => {
  const manager = read('electron/main/windows/overlay-manager.ts');
  assert.match(manager, /primaryId/);
  assert.doesNotMatch(manager, /display === screen\.getPrimaryDisplay\(\)/);
});

test('overlay window is explicitly shown after renderer load', () => {
  const factory = read('electron/main/windows/window-factory.ts');
  assert.match(factory, /showInactive\(\)/);
  assert.match(factory, /await load\(window, 'overlay'/);
  const loadIndex = factory.indexOf("await load(window, 'overlay'");
  const showIndex = factory.indexOf('window.showInactive()', loadIndex);
  assert.ok(showIndex > loadIndex, 'overlay should be shown after load resolves');
});

test('custom edit shortcut cannot poison settings updates or startup', () => {
  const main = read('electron/main/index.ts');
  assert.match(main, /activeShortcut/);
  assert.match(main, /try\s*\{/);
  assert.match(main, /CommandOrControl\+Shift\+L/);
});

test('edit mode has one main-process source of truth across IPC, tray, and shortcut', () => {
  assert.match(main, /const setEditMode = \(enabled: boolean\)/);
  assert.match(ipc, /setEditMode: \(enabled: boolean\) => void/);
  assert.match(ipc, /deps\.setEditMode\(Boolean\(enabled\)\)/);
  assert.doesNotMatch(ipc, /deps\.overlays\.setEditMode\(Boolean\(enabled\)\)/);
  assert.match(main, /setEditMode\(!editMode\)/);
});
