import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureLyricsVisibility } from '../../src/features/lyrics/visibility.ts';
import { normalizeLrclibCandidate } from '../../electron/main/lyrics/lrclib-provider.ts';

test('enabling lyrics guarantees a visible primary desktop overlay', () => {
  const settings = {
    overlaysVisible: false,
    monitorPreferences: {
      primary: { enabled: false, mode: 'minimal' },
      secondary: { enabled: false }
    }
  };
  const displays = [
    { id: 'primary', primary: true },
    { id: 'secondary', primary: false }
  ];

  const patch = ensureLyricsVisibility(settings, displays, { lyricsEnabled: true });
  assert.equal(patch.lyricsEnabled, true);
  assert.equal(patch.overlaysVisible, true);
  assert.equal(patch.monitorPreferences.primary.enabled, true);
  assert.equal(patch.monitorPreferences.primary.mode, 'minimal');
  assert.equal(patch.monitorPreferences.secondary.enabled, false);
});

test('unrelated settings updates do not force overlay visibility', () => {
  const settings = { overlaysVisible: false, monitorPreferences: {} };
  const patch = ensureLyricsVisibility(settings, [], { animationIntensity: 0.5 });
  assert.deepEqual(patch, { animationIntensity: 0.5 });
});

test('LRCLIB normalization removes leading empty timed lines so static display has visible text', () => {
  const result = normalizeLrclibCandidate({
    trackName: 'Example',
    artistName: 'Artist',
    albumName: 'Album',
    duration: 180,
    instrumental: false,
    plainLyrics: 'First visible line\nSecond visible line',
    syncedLyrics: '[00:00.00]\n[00:02.00]   \n[00:10.00]First visible line\n[00:14.00]Second visible line'
  });

  assert.equal(result?.kind, 'synced');
  assert.equal(result?.lines[0]?.text, 'First visible line');
});

test('LRCLIB falls back to plain lyrics when synchronized payload contains only empty timed lines', () => {
  const result = normalizeLrclibCandidate({
    trackName: 'Example',
    artistName: 'Artist',
    albumName: 'Album',
    duration: 180,
    instrumental: false,
    plainLyrics: 'Readable plain lyrics',
    syncedLyrics: '[00:00.00]\n[00:05.00]   '
  });

  assert.equal(result?.kind, 'plain');
  assert.equal(result?.text, 'Readable plain lyrics');
});
