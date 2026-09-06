import test from 'node:test';
import assert from 'node:assert/strict';

const track = (overrides = {}) => ({
  source: 'spotify',
  spotifyId: 'spotify-track-1',
  title: 'Midnight Signal',
  artists: ['Nova Example'],
  album: 'Night Drive',
  durationMs: 201_000,
  progressMs: 12_000,
  playing: true,
  ...overrides
});

test('LRC parser supports 2/3 digit fractions, unicode, empty lines, malformed input, and sorts once', async () => {
  const { parseLrc } = await import('../../electron/main/lyrics/lrc-parser.ts');
  const lines = parseLrc([
    '[01:04.820]Another line',
    '[metadata:value]',
    '[00:12.34]Héllo 世界',
    '[00:12.340]duplicate timing',
    '[bad]ignored',
    '[00:16.50]',
    'untimed ignored'
  ].join('\n'));
  assert.deepEqual(lines.map((line) => line.startMs), [12_340, 12_340, 16_500, 64_820]);
  assert.equal(lines[0].text, 'Héllo 世界');
  assert.equal(lines[2].text, '');
});

test('lyrics synchronization uses binary-search semantics around boundaries', async () => {
  const { activeLyricLineIndex, cadenceEnergy } = await import('../../src/features/lyrics/sync.ts');
  const lines = [
    { startMs: 12_000, text: 'one' },
    { startMs: 16_500, text: 'two' },
    { startMs: 17_200, text: 'three' }
  ];
  assert.equal(activeLyricLineIndex(lines, 11_999), -1);
  assert.equal(activeLyricLineIndex(lines, 12_000), 0);
  assert.equal(activeLyricLineIndex(lines, 16_499), 0);
  assert.equal(activeLyricLineIndex(lines, 16_500), 1);
  assert.ok(cadenceEnergy(lines, 2) > cadenceEnergy(lines, 1));
});

const query = (overrides = {}) => { const value = track(overrides); return { title: value.title, artist: value.artists[0], album: value.album, durationMs: value.durationMs }; };

test('LRCLIB provider normalizes synced, plain, instrumental, 404, 429, malformed JSON, and network failures', async () => {
  const { LrclibProvider, LyricsProviderError } = await import('../../electron/main/lyrics/lrclib-provider.ts');
  const makeResponse = (status, body, headers = {}) => new Response(body, { status, headers });
  let mode = 'synced';
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    if (mode === 'synced') return makeResponse(200, JSON.stringify({
      id: 1, trackName: 'Midnight Signal', artistName: 'Nova Example', albumName: 'Night Drive', duration: 201,
      instrumental: false, plainLyrics: 'line one\nline two', syncedLyrics: '[00:12.34]line one\n[00:16.500]line two'
    }));
    if (mode === 'plain') return makeResponse(200, JSON.stringify({
      id: 1, trackName: 'Midnight Signal', artistName: 'Nova Example', albumName: 'Night Drive', duration: 201,
      instrumental: false, plainLyrics: 'line one\nline two', syncedLyrics: null
    }));
    if (mode === 'instrumental') return makeResponse(200, JSON.stringify({
      id: 1, trackName: 'Midnight Signal', artistName: 'Nova Example', albumName: 'Night Drive', duration: 201,
      instrumental: true, plainLyrics: null, syncedLyrics: null
    }));
    if (mode === '404') return makeResponse(404, JSON.stringify({ code: 404 }));
    if (mode === '429') return makeResponse(429, '{}', { 'Retry-After': '3' });
    if (mode === 'malformed') return makeResponse(200, '{not-json');
    throw new TypeError('offline');
  };
  const provider = new LrclibProvider({ fetchImpl, userAgent: 'Song App/1.2.0', timeoutMs: 5000, now: () => 1000 });

  let result = await provider.getLyrics(query());
  assert.equal(result?.kind, 'synced');
  assert.deepEqual(result?.kind === 'synced' ? result.lines.map((line) => line.startMs) : [], [12_340, 16_500]);
  assert.match(calls[0].url, /track_name=Midnight\+Signal/);
  assert.match(calls[0].url, /artist_name=Nova\+Example/);
  assert.match(calls[0].url, /album_name=Night\+Drive/);
  assert.match(calls[0].url, /duration=201/);
  assert.equal(calls[0].init.headers['User-Agent'], 'Song App/1.2.0');

  mode = 'plain';
  result = await provider.getLyrics(query({ spotifyId: '2' }));
  assert.equal(result?.kind, 'plain');

  mode = 'instrumental';
  result = await provider.getLyrics(query({ spotifyId: '3' }));
  assert.equal(result?.kind, 'instrumental');

  mode = '404';
  assert.equal(await provider.getLyrics(query({ spotifyId: '4' })), null);

  mode = '429';
  await assert.rejects(() => provider.getLyrics(query({ spotifyId: '5' })), (error) => {
    assert.ok(error instanceof LyricsProviderError);
    assert.equal(error.kind, 'rate-limited');
    assert.equal(error.retryAfterMs, 3000);
    return true;
  });

  mode = 'malformed';
  const providerAfterRateLimit = new LrclibProvider({ fetchImpl, userAgent: 'Song App/1.2.0', timeoutMs: 5000, now: () => 5000 });
  await assert.rejects(() => providerAfterRateLimit.getLyrics(query({ spotifyId: '6' })), (error) => {
    assert.ok(error instanceof LyricsProviderError);
    assert.equal(error.kind, 'error');
    return true;
  });

  mode = 'offline';
  await assert.rejects(() => providerAfterRateLimit.getLyrics(query({ spotifyId: '7' })), (error) => {
    assert.ok(error instanceof LyricsProviderError);
    assert.equal(error.kind, 'offline');
    return true;
  });
});

test('LyricsManager caches stable track metadata and does not refetch on playback-position updates', async () => {
  const { LyricsManager } = await import('../../electron/main/lyrics/lyrics-manager.ts');
  let calls = 0;
  const provider = {
    id: 'lrclib',
    name: 'LRCLIB',
    async getLyrics(input) {
      calls += 1;
      return { kind: 'plain', provider: 'lrclib', text: `${input.title} lyrics`, rights: { canDisplay: true, canSynchronize: false, canCache: true, commercialUse: false } };
    }
  };
  const states = [];
  const manager = new LyricsManager({ lrclib: provider, simulator: provider }, (state) => states.push(state), { now: () => 1000 });
  await manager.setEnabled(true);
  await manager.setTrack(track({ progressMs: 1000 }));
  await manager.setTrack(track({ progressMs: 99_000 }));
  assert.equal(calls, 1);
  await manager.setTrack(track({ spotifyId: 'new-id', title: 'Different Song', progressMs: 10 }));
  assert.equal(calls, 2);
  await manager.refresh();
  assert.equal(calls, 3);
  assert.equal(states.at(-1).status, 'plain');
});

test('reactive background keeps deterministic song identity and bounded state transitions', async () => {
  const {
    createVisualIdentity,
    deriveReactiveTarget,
    smoothVisualState,
    shouldRenderFrame
  } = await import('../../src/features/overlays/reactive-background-engine.ts');

  const a = createVisualIdentity(track());
  const b = createVisualIdentity(track({ progressMs: 190_000 }));
  const c = createVisualIdentity(track({ spotifyId: 'different', title: 'Different Song' }));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);

  const paused = deriveReactiveTarget({ playing: false, progress: 0.5, lyricCadence: 0.7, lyricImpulse: 0.8, trackTransition: 0.5, userIntensity: 1, allowSynchronizedSignals: true, reducedMotion: false });
  const playing = deriveReactiveTarget({ playing: true, progress: 0.5, lyricCadence: 0.7, lyricImpulse: 0.8, trackTransition: 0.5, userIntensity: 1, allowSynchronizedSignals: true, reducedMotion: false });
  const compliantSpotify = deriveReactiveTarget({ playing: true, progress: 1, lyricCadence: 1, lyricImpulse: 1, trackTransition: 0.5, userIntensity: 1, allowSynchronizedSignals: false, reducedMotion: false });
  assert.ok(playing.intensity > paused.intensity);
  assert.ok(compliantSpotify.lyricImpulse === 0);
  assert.ok(compliantSpotify.progressEnvelope === 0);
  assert.ok(playing.lyricImpulse <= 1);

  const smoothed = smoothVisualState({ intensity: 0, pulse: 0, energy: 0, progressEnvelope: 0, lyricImpulse: 0, transitionProgress: 0 }, playing, 0.016);
  assert.ok(smoothed.intensity > 0 && smoothed.intensity < playing.intensity);
  assert.equal(shouldRenderFrame({ hidden: true, playing: true, pausedForMs: 0, reducedMotion: false }, 16), false);
  assert.equal(shouldRenderFrame({ hidden: false, playing: false, pausedForMs: 60_000, reducedMotion: false }, 50), true);
});

test('LRCLIB search fallback stays conservative, omits unsupported search duration, and handles timeout', async () => {
  const { LrclibProvider, LyricsProviderError } = await import('../../electron/main/lyrics/lrclib-provider.ts');
  const responses = [];
  const fetchImpl = async (url) => {
    const value = String(url);
    responses.push(value);
    if (value.includes('/api/get?')) {
      return new Response(JSON.stringify({
        id: 1, trackName: 'Wrong Version', artistName: 'Nova Example', albumName: 'Night Drive', duration: 201,
        instrumental: false, plainLyrics: 'wrong', syncedLyrics: null
      }), { status: 200 });
    }
    return new Response(JSON.stringify([
      { id: 2, trackName: 'Midnight Signal', artistName: 'Nova Example', albumName: 'Wrong Album', duration: 201, instrumental: false, plainLyrics: 'wrong album', syncedLyrics: null },
      { id: 3, trackName: 'Midnight Signal', artistName: 'Nova Example', albumName: 'Night Drive', duration: 201, instrumental: false, plainLyrics: 'correct', syncedLyrics: null }
    ]), { status: 200 });
  };
  const provider = new LrclibProvider({ fetchImpl, userAgent: 'Song App/1.2.0' });
  const result = await provider.getLyrics(query());
  assert.equal(result?.kind, 'plain');
  assert.equal(result?.kind === 'plain' ? result.text : '', 'correct');
  assert.match(responses[1], /\/api\/search\?/);
  assert.doesNotMatch(responses[1], /duration=/);

  const timeoutProvider = new LrclibProvider({
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }),
    userAgent: 'Song App/1.2.0',
    timeoutMs: 5
  });
  await assert.rejects(() => timeoutProvider.getLyrics(query()), (error) => {
    assert.ok(error instanceof LyricsProviderError);
    assert.equal(error.kind, 'error');
    assert.match(error.message, /timed out/i);
    return true;
  });
});

test('LyricsManager short-caches not-found results and can stay idle until lyrics are enabled', async () => {
  const { LyricsManager } = await import('../../electron/main/lyrics/lyrics-manager.ts');
  let calls = 0;
  const provider = { id: 'lrclib', name: 'LRCLIB', async getLyrics() { calls += 1; return null; } };
  const manager = new LyricsManager({ lrclib: provider, simulator: provider }, () => {}, { now: () => 1_000 });
  await manager.setEnabled(false);
  await manager.setTrack(track());
  assert.equal(calls, 0);
  assert.equal(manager.getState().status, 'idle');
  await manager.setEnabled(true);
  assert.equal(calls, 1);
  await manager.setTrack(track({ progressMs: 88_000 }));
  assert.equal(calls, 1);
});

test('reactive background reduced motion lowers work and canvas source cleans up listeners and RAF', async () => {
  const { deriveReactiveTarget, targetFrameIntervalMs, particleBudget } = await import('../../src/features/overlays/reactive-background-engine.ts');
  const normal = deriveReactiveTarget({ playing: true, progress: .5, lyricCadence: .9, lyricImpulse: 1, trackTransition: .6, userIntensity: 1, allowSynchronizedSignals: true, reducedMotion: false });
  const reduced = deriveReactiveTarget({ playing: true, progress: .5, lyricCadence: .9, lyricImpulse: 1, trackTransition: .6, userIntensity: 1, allowSynchronizedSignals: true, reducedMotion: true });
  assert.ok(reduced.energy < normal.energy);
  assert.ok(reduced.pulse < normal.pulse);
  assert.ok(targetFrameIntervalMs({ hidden: false, playing: true, pausedForMs: 0, reducedMotion: true }, 60) > targetFrameIntervalMs({ hidden: false, playing: true, pausedForMs: 0, reducedMotion: false }, 60));
  assert.ok(particleBudget('high', 1, true) < particleBudget('high', 1, false));

  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../src/features/overlays/ReactiveBackgroundCanvas.tsx', import.meta.url), 'utf8');
  assert.match(source, /cancelAnimationFrame/);
  assert.match(source, /removeEventListener\('visibilitychange'/);
  assert.match(source, /removeEventListener\('resize'/);
  assert.doesNotMatch(source, /setState\(/);
});

test('lyrics settings UI identifies LRCLIB without claiming commercial licensing', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../src/features/settings/ControlCenter.tsx', import.meta.url), 'utf8');
  assert.match(source, /LRCLIB/);
  assert.match(source, /Refresh lyrics/);
  assert.match(source, /commercial/i);
  assert.doesNotMatch(source, /No licensed live provider configured/);
  assert.match(source, /Background intensity/);
});

test('LyricsManager cache is provider-scoped so simulator lyrics cannot leak into LRCLIB tracks', async () => {
  const { LyricsManager } = await import('../../electron/main/lyrics/lyrics-manager.ts');
  let lrclibCalls = 0;
  let simulatorCalls = 0;
  const lrclib = { id:'lrclib', name:'LRCLIB', async getLyrics() { lrclibCalls += 1; return { kind:'plain', provider:'lrclib', text:'community', rights:{ canDisplay:true, canSynchronize:false, canCache:true, commercialUse:false } }; } };
  const simulator = { id:'simulator', name:'Simulator', async getLyrics() { simulatorCalls += 1; return { kind:'plain', provider:'simulator', text:'demo', rights:{ canDisplay:true, canSynchronize:false, canCache:true, commercialUse:true } }; } };
  const manager = new LyricsManager({ lrclib, simulator }, () => {});
  await manager.setEnabled(true);
  const shared = { title:'Same Song', artists:['Same Artist'], album:'Same Album', durationMs:180_000, progressMs:0, playing:true };
  await manager.setTrack({ source:'simulator', ...shared });
  await manager.setTrack({ source:'spotify', spotifyId:'same', ...shared });
  assert.equal(simulatorCalls, 1);
  assert.equal(lrclibCalls, 1);
  assert.equal(manager.getState().result?.provider, 'lrclib');
});

test('upcoming lyric anticipation ramps smoothly near the next line without exceeding bounds', async () => {
  const { lyricAnticipation } = await import('../../src/features/overlays/reactive-background-engine.ts');
  assert.equal(lyricAnticipation(1_000, undefined), 0);
  assert.ok(lyricAnticipation(9_700, 10_000) > lyricAnticipation(7_000, 10_000));
  assert.ok(lyricAnticipation(9_700, 10_000) <= 1);
  assert.equal(lyricAnticipation(10_100, 10_000), 0);
});

test('privacy UI discloses LRCLIB metadata requests when lyrics are enabled', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../src/features/settings/ControlCenter.tsx', import.meta.url), 'utf8');
  assert.match(source, /sent to LRCLIB/i);
  assert.match(source, /lyrics are enabled/i);
});

test('lyrics settings UI distinguishes simulator provider from LRCLIB', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../src/features/settings/ControlCenter.tsx', import.meta.url), 'utf8');
  assert.match(source, /state\.provider === 'simulator'/);
  assert.match(source, /Simulator lyrics ready/);
});

test('reactive canvas resizes out of the hot draw loop and observes element size changes', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../src/features/overlays/ReactiveBackgroundCanvas.tsx', import.meta.url), 'utf8');
  assert.match(source, /ResizeObserver/);
  const drawStart = source.indexOf('const draw =');
  const clear = source.indexOf('ctx.clearRect', drawStart);
  assert.ok(drawStart >= 0 && clear > drawStart);
  assert.doesNotMatch(source.slice(drawStart, clear), /resize\(\)/);
  assert.match(source, /observer\.disconnect\(\)/);
});

test('overlay provider labels are source-aware and LRCLIB timing rights fail closed', async () => {
  const { readFile } = await import('node:fs/promises');
  const overlay = await readFile(new URL('../../src/features/overlays/OverlayView.tsx', import.meta.url), 'utf8');
  const provider = await readFile(new URL('../../electron/main/lyrics/lrclib-provider.ts', import.meta.url), 'utf8');
  assert.match(overlay, /result\.provider === 'simulator'/);
  assert.match(overlay, /Song App Simulator/);
  assert.match(overlay, /providerLabel/);
  assert.match(provider, /canSynchronize: false/);
});
