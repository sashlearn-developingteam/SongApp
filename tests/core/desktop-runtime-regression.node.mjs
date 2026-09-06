import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync(new URL('../../src/main.tsx', import.meta.url), 'utf8');
const factory = readFileSync(new URL('../../electron/main/windows/window-factory.ts', import.meta.url), 'utf8');

test('renderer does not mount the Electron-dependent App without the preload bridge', () => {
  assert.match(renderer, /window\.songApp/);
  assert.match(renderer, /DesktopRuntimeRequired/);
});

test('main process fails loudly when the compiled preload is missing', () => {
  assert.match(factory, /existsSync\(preload\)/);
  assert.match(factory, /preload-error/);
});
