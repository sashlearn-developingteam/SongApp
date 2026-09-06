import type { CurrentTrack } from '../../types/core';

export type VisualIdentity = {
  seed: number;
  hueA: number;
  hueB: number;
  hueC: number;
  direction: number;
  shapeBias: number;
  particleBias: number;
};

export type ReactiveVisualState = {
  intensity: number;
  pulse: number;
  energy: number;
  progressEnvelope: number;
  lyricImpulse: number;
  transitionProgress: number;
};

export type ReactiveSignals = {
  playing: boolean;
  progress: number;
  lyricCadence: number;
  lyricImpulse: number;
  trackTransition: number;
  userIntensity: number;
  allowSynchronizedSignals: boolean;
  reducedMotion: boolean;
};

function clamp01(value: number): number { return Math.min(1, Math.max(0, value)); }

export function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createVisualIdentity(track: CurrentTrack | null, themeKey = ''): VisualIdentity {
  const source = track
    ? `${track.spotifyId ?? ''}|${track.title}|${track.artists.join(',')}|${themeKey}`
    : `idle|${themeKey}`;
  const seed = stableHash(source);
  const baseHue = seed % 360;
  const split = 42 + ((seed >>> 9) % 54);
  return {
    seed,
    hueA: baseHue,
    hueB: (baseHue + split) % 360,
    hueC: (baseHue + 186 + ((seed >>> 15) % 48)) % 360,
    direction: ((seed >>> 4) % 6283) / 1000,
    shapeBias: ((seed >>> 12) % 1000) / 1000,
    particleBias: ((seed >>> 20) % 1000) / 1000
  };
}

function progressEnvelope(progress: number): number {
  const p = clamp01(progress);
  if (p < 0.18) return 0.35 + (p / 0.18) * 0.38;
  if (p < 0.72) return 0.73 + Math.sin(((p - 0.18) / 0.54) * Math.PI) * 0.22;
  const ending = (p - 0.72) / 0.28;
  return 0.72 - ending * 0.28 + Math.sin(ending * Math.PI) * 0.08;
}

export function deriveReactiveTarget(signals: ReactiveSignals): ReactiveVisualState {
  const user = clamp01(signals.userIntensity);
  const playingBase = signals.playing ? 0.58 : 0.18;
  const syncProgress = signals.allowSynchronizedSignals ? progressEnvelope(signals.progress) : 0;
  const cadence = signals.allowSynchronizedSignals ? clamp01(signals.lyricCadence) : 0;
  const lyricImpulse = signals.allowSynchronizedSignals ? clamp01(signals.lyricImpulse) : 0;
  const transition = clamp01(signals.trackTransition);
  let intensity = clamp01((playingBase + syncProgress * 0.14 + cadence * 0.18 + transition * 0.14) * (0.35 + user * 0.75));
  let energy = clamp01((signals.playing ? 0.34 : 0.08) + cadence * 0.52 + transition * 0.16);
  let pulse = clamp01(transition * 0.74 + lyricImpulse * 0.48 + (signals.playing ? 0.08 : 0.02));

  if (signals.reducedMotion) {
    intensity = Math.min(intensity, 0.42);
    energy = Math.min(energy, 0.22);
    pulse = Math.min(pulse, 0.12);
  }

  return {
    intensity,
    pulse,
    energy,
    progressEnvelope: syncProgress,
    lyricImpulse,
    transitionProgress: transition
  };
}


export function lyricAnticipation(positionMs: number, nextStartMs: number | undefined): number {
  if (nextStartMs === undefined || !Number.isFinite(nextStartMs)) return 0;
  const gap = nextStartMs - Math.max(0, positionMs);
  if (gap <= 0 || gap >= 2_600) return 0;
  const x = clamp01(1 - gap / 2_600);
  return x * x * (3 - 2 * x);
}

export function smoothVisualState(current: ReactiveVisualState, target: ReactiveVisualState, deltaSeconds: number): ReactiveVisualState {
  const alpha = 1 - Math.exp(-Math.max(0, deltaSeconds) * 4.8);
  const lerp = (a: number, b: number) => a + (b - a) * alpha;
  return {
    intensity: lerp(current.intensity, target.intensity),
    pulse: lerp(current.pulse, target.pulse),
    energy: lerp(current.energy, target.energy),
    progressEnvelope: lerp(current.progressEnvelope, target.progressEnvelope),
    lyricImpulse: lerp(current.lyricImpulse, target.lyricImpulse),
    transitionProgress: lerp(current.transitionProgress, target.transitionProgress)
  };
}

export type RenderContext = {
  hidden: boolean;
  playing: boolean;
  pausedForMs: number;
  reducedMotion: boolean;
};

export function targetFrameIntervalMs(context: RenderContext, requestedFps: 30 | 60 = 60): number {
  if (context.hidden) return Number.POSITIVE_INFINITY;
  if (context.reducedMotion) return 100;
  if (!context.playing && context.pausedForMs > 30_000) return 50;
  if (!context.playing) return 1000 / Math.min(requestedFps, 24);
  return 1000 / requestedFps;
}

export function shouldRenderFrame(context: RenderContext, elapsedMs: number, requestedFps: 30 | 60 = 60): boolean {
  return elapsedMs + 0.5 >= targetFrameIntervalMs(context, requestedFps);
}

export type QualityTier = 'reduced' | 'balanced' | 'high';
export function particleBudget(tier: QualityTier, amount: number, reducedMotion: boolean): number {
  const normalized = clamp01(amount);
  const base = tier === 'high' ? 72 : tier === 'balanced' ? 46 : 28;
  const min = reducedMotion ? 4 : 12;
  return Math.round(min + base * normalized * (reducedMotion ? 0.18 : 1));
}

export function adaptQuality(current: QualityTier, averageFrameMs: number): QualityTier {
  if (averageFrameMs > 30) return 'reduced';
  if (averageFrameMs > 21) return current === 'high' ? 'balanced' : current;
  if (averageFrameMs < 15 && current === 'reduced') return 'balanced';
  return current;
}
