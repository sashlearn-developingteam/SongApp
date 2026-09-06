import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeHydrationGate } from '../../src/hooks/bridge-hydration.ts';
import { readFileSync } from 'node:fs';

const bridgeSource = readFileSync(new URL('../../src/hooks/use-bridge.ts', import.meta.url), 'utf8');
const overlayManagerSource = readFileSync(new URL('../../electron/main/windows/overlay-manager.ts', import.meta.url), 'utf8');
const rendererSource = readFileSync(new URL('../../src/main.tsx', import.meta.url), 'utf8');
const overlayCss = readFileSync(new URL('../../src/overlay-transparency.css', import.meta.url), 'utf8');

test('hydration gate rejects a stale lyrics snapshot after a live lyrics event', () => {
  const gate = createBridgeHydrationGate();
  const snapshot = gate.snapshot();
  assert.equal(gate.isFresh('lyrics', snapshot), true);
  gate.mark('lyrics');
  assert.equal(gate.isFresh('lyrics', snapshot), false);
});

test('hydration gate tracks bridge topics independently', () => {
  const gate = createBridgeHydrationGate();
  const snapshot = gate.snapshot();
  gate.mark('track');
  assert.equal(gate.isFresh('track', snapshot), false);
  assert.equal(gate.isFresh('lyrics', snapshot), true);
});

test('renderer subscribes before applying hydration snapshots and gates stale lyrics', () => {
  const subscribeIndex = bridgeSource.indexOf('window.songApp.lyrics.onChanged');
  const hydrateIndex = bridgeSource.indexOf('Promise.all');
  assert.ok(subscribeIndex >= 0 && hydrateIndex >= 0 && subscribeIndex < hydrateIndex);
  assert.match(bridgeSource, /gate\.isFresh\('lyrics'/);
});

test('overlay manager retains and replays latest lyrics to newly created windows', () => {
  assert.match(overlayManagerSource, /lastLyrics/);
  assert.match(overlayManagerSource, /broadcastLyrics/);
  assert.match(overlayManagerSource, /lyrics:changed/);
});

test('overlay transparency is keyed from the URL window type instead of React :has timing', () => {
  assert.match(rendererSource, /dataset\.window/);
  assert.match(overlayCss, /html\[data-window=['\"]overlay['\"]\]/);
  assert.doesNotMatch(overlayCss, /:has\(/);
});
