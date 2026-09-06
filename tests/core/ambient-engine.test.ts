import { describe, expect, it } from 'vitest';
import { ambientRuntime } from '../../src/features/overlays/ambient-engine';

describe('ambient runtime', () => {
  it('uses the requested frame target', () => {
    expect(ambientRuntime(0.5, 0.5, 30, false).frameIntervalMs).toBeCloseTo(1000 / 30);
    expect(ambientRuntime(0.5, 0.5, 60, false).frameIntervalMs).toBeCloseTo(1000 / 60);
  });

  it('turns continuous motion off for reduced motion', () => {
    const runtime = ambientRuntime(1, 1, 60, true);
    expect(runtime.speed).toBe(0);
    expect(runtime.drift).toBe(0);
    expect(runtime.frameIntervalMs).toBe(Number.POSITIVE_INFINITY);
  });

  it('maps particle amount and intensity to actual runtime work', () => {
    expect(ambientRuntime(1, 1, 60, false).particleCount).toBeGreaterThan(ambientRuntime(0, 1, 60, false).particleCount);
    expect(ambientRuntime(0.5, 1, 60, false).speed).toBeGreaterThan(ambientRuntime(0.5, 0, 60, false).speed);
  });
});
