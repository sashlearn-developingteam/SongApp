import type { CurrentTrack, PlaybackEvent, SimulatorResult, SimulatorScenario } from '../../../src/types/core';

type ScenarioOutput = SimulatorResult & {
  track: CurrentTrack | null;
  event: PlaybackEvent | null;
};

const DEMO_ARTWORK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#101b2b"/>
      <stop offset="0.52" stop-color="#1d5262"/>
      <stop offset="1" stop-color="#a45f7f"/>
    </linearGradient>
    <radialGradient id="r" cx="68%" cy="26%" r="60%">
      <stop offset="0" stop-color="#9af3dc" stop-opacity=".8"/>
      <stop offset="1" stop-color="#9af3dc" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="640" height="640" fill="url(#g)"/>
  <rect width="640" height="640" fill="url(#r)"/>
  <circle cx="420" cy="252" r="142" fill="none" stroke="#f8e8ed" stroke-opacity=".76" stroke-width="4"/>
  <circle cx="420" cy="252" r="92" fill="none" stroke="#9af3dc" stroke-opacity=".55" stroke-width="2"/>
  <path d="M-20 474 C120 392 188 536 330 456 S548 332 690 430" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="8"/>
  <path d="M-20 500 C130 420 216 560 352 480 S556 372 690 456" fill="none" stroke="#9af3dc" stroke-opacity=".45" stroke-width="3"/>
</svg>`;

const DEMO_ARTWORK = `data:image/svg+xml,${encodeURIComponent(DEMO_ARTWORK_SVG)}`;

function demoTrack(overrides: Partial<CurrentTrack> = {}): CurrentTrack {
  return {
    source: 'simulator',
    title: 'Midnight Geometry',
    artists: ['Northbound'],
    album: 'Demo Sessions',
    durationMs: 226_000,
    progressMs: 64_000,
    playing: true,
    albumImage: DEMO_ARTWORK,
    ...overrides
  };
}

export function buildSimulatorScenario(scenario: SimulatorScenario, current: CurrentTrack | null): ScenarioOutput {
  const base = current?.source === 'simulator' ? current : demoTrack();
  switch (scenario) {
    case 'track-start': {
      const track = demoTrack();
      return { ok: true, message: 'Demo track started.', track, event: { type: 'track-changed', track } };
    }
    case 'track-change': {
      const track = demoTrack({ title: 'Electric Weather', artists: ['Glass Harbour'], album: 'Soft Circuits', progressMs: 18_000 });
      return { ok: true, message: 'Track-change event sent.', track, event: { type: 'track-changed', track } };
    }
    case 'pause': {
      const track = { ...base, playing: false };
      return { ok: true, message: 'Pause event sent.', track, event: { type: 'paused', track } };
    }
    case 'resume': {
      const track = { ...base, playing: true };
      return { ok: true, message: 'Resume event sent.', track, event: { type: 'resumed', track } };
    }
    case 'rapid-skip': {
      const track = demoTrack({ title: 'Queue Escape Velocity', artists: ['Demo Unit'], album: 'Skip Studies', progressMs: 4_000 });
      return { ok: true, message: 'Rapid-skip reaction sent.', track, event: { type: 'rapid-skip', count: 4 } };
    }
    case 'replay': {
      const track = { ...base, playing: true, progressMs: 1_000 };
      return { ok: true, message: 'Replay event sent.', track, event: { type: 'replay', track } };
    }
    case 'missing-artwork': {
      const track = demoTrack({ title: 'No Cover Required', albumImage: undefined });
      return { ok: true, message: 'Missing-artwork state sent.', track, event: { type: 'track-changed', track } };
    }
    case 'long-track': {
      const track = demoTrack({ title: 'Eleven Minute Detour', durationMs: 11 * 60_000 });
      return { ok: true, message: 'Long-track state sent.', track, event: { type: 'track-changed', track } };
    }
    case 'offline':
      return { ok: true, message: 'Offline state simulated. The overlay should fall back to idle.', track: null, event: { type: 'stopped' } };
    case 'rate-limit':
      return { ok: true, message: 'Rate-limit state simulated. Live polling backoff is not triggered by the simulator.', track: null, event: { type: 'stopped' } };
    case 'expired-token':
      return { ok: true, message: 'Expired-token state simulated. Live Spotify refresh is not called by the simulator.', track: null, event: { type: 'stopped' } };
  }
}
