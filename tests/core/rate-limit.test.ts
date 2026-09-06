import { describe, expect, it } from 'vitest';
import { retryDelayMs } from '../../electron/main/spotify/rate-limit';
describe('rate limit backoff', () => {
  it('honors Retry-After seconds', () => expect(retryDelayMs(2,'5')).toBe(5000));
  it('caps absurd Retry-After values', () => expect(retryDelayMs(2,'999')).toBe(120000));
  it('returns a positive exponential delay without a header', () => expect(retryDelayMs(2,null)).toBeGreaterThan(0));
});
