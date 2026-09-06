export type AmbientRuntime = {
  particleCount: number;
  frameIntervalMs: number;
  speed: number;
  drift: number;
};

export function ambientRuntime(
  amount: number,
  intensity: number,
  fpsTarget: 30 | 60,
  reducedMotion: boolean
): AmbientRuntime {
  const normalizedAmount = Math.min(1, Math.max(0, amount));
  const normalizedIntensity = Math.min(1, Math.max(0, intensity));
  return {
    particleCount: reducedMotion ? Math.round(4 + normalizedAmount * 5) : Math.round(10 + normalizedAmount * 34),
    frameIntervalMs: reducedMotion ? Number.POSITIVE_INFINITY : 1000 / fpsTarget,
    speed: reducedMotion ? 0 : 0.12 + normalizedIntensity * 0.38,
    drift: reducedMotion ? 0 : 6 + normalizedIntensity * 28
  };
}
