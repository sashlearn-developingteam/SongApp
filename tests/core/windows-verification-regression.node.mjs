import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('Electron 44 startup settings avoid removed openAsHidden option', () => {
  const startup = read('electron/main/system/startup.ts');
  assert.doesNotMatch(startup, /openAsHidden/);
  assert.match(startup, /openAtLogin/);
});

test('desktop runtime fallback does not depend on the removed global JSX namespace', () => {
  const component = read('src/components/DesktopRuntimeRequired.tsx');
  assert.doesNotMatch(component, /:\s*JSX\.Element/);
});

test('Node-native integration tests are not named like Vitest suites', () => {
  const testsDir = new URL('./', import.meta.url);
  const names = readdirSync(testsDir);
  assert.equal(names.some((name) => name.endsWith('.test.mjs')), false);
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['test:integration'], /\.node\.mjs/);
});

test('Windows verifier fails immediately when a native npm step exits non-zero', () => {
  const verifier = read('scripts/verify-windows.ps1');
  assert.match(verifier, /LASTEXITCODE/);
  assert.match(verifier, /throw/);
});
