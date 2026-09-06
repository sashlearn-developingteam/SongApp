import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('package lifecycle self-heals a missing Electron runtime before dev', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['setup:electron'], 'node scripts/ensure-electron.mjs');
  assert.match(pkg.scripts.postinstall ?? '', /setup:electron/);
  assert.match(pkg.scripts.predev ?? '', /setup:electron|setup:runtime/);
  assert.equal(pkg.allowScripts?.electron, true);
});

test('Electron bootstrap validates path.txt and the downloaded executable before reporting ready', () => {
  assert.equal(existsSync(new URL('scripts/ensure-electron.mjs', root)), true, 'bootstrap script must exist');
  const source = read('scripts/ensure-electron.mjs');
  assert.match(source, /path\.txt/);
  assert.match(source, /dist/);
  assert.match(source, /install\.js/);
  assert.match(source, /spawnSync/);
  assert.match(source, /process\.execPath/);
});

test('Windows verification validates the Electron runtime before compilation gates', () => {
  const verifier = read('scripts/verify-windows.ps1');
  assert.match(verifier, /1\/7 Electron runtime bootstrap/);
  assert.match(verifier, /npm run setup:electron/);
});
