import { describe, expect, it } from 'vitest';
import { deriveReactiveTarget, particleBudget, targetFrameIntervalMs } from '../../src/features/overlays/reactive-background-engine';

describe('reactive background runtime', () => {
  it('uses requested frame target while reducing work when motion is reduced', () => {
    expect(targetFrameIntervalMs({ hidden:false, playing:true, pausedForMs:0, reducedMotion:false }, 30)).toBeCloseTo(1000 / 30);
    expect(targetFrameIntervalMs({ hidden:false, playing:true, pausedForMs:0, reducedMotion:false }, 60)).toBeCloseTo(1000 / 60);
    expect(targetFrameIntervalMs({ hidden:false, playing:true, pausedForMs:0, reducedMotion:true }, 60)).toBeGreaterThan(50);
  });

  it('keeps reduced motion atmospheric but bounded', () => {
    const normal = deriveReactiveTarget({ playing:true, progress:.5, lyricCadence:.8, lyricImpulse:1, trackTransition:.4, userIntensity:1, allowSynchronizedSignals:true, reducedMotion:false });
    const reduced = deriveReactiveTarget({ playing:true, progress:.5, lyricCadence:.8, lyricImpulse:1, trackTransition:.4, userIntensity:1, allowSynchronizedSignals:true, reducedMotion:true });
    expect(reduced.intensity).toBeGreaterThan(0);
    expect(reduced.energy).toBeLessThan(normal.energy);
    expect(reduced.pulse).toBeLessThan(normal.pulse);
  });

  it('maps particle amount and quality to actual work', () => {
    expect(particleBudget('high', 1, false)).toBeGreaterThan(particleBudget('high', 0, false));
    expect(particleBudget('high', 1, false)).toBeGreaterThan(particleBudget('reduced', 1, false));
  });
});
