import { describe, expect, it } from 'vitest';
import { shouldShowReaction } from '../../src/features/reactions/reaction-engine';
import type { CurrentTrack } from '../../src/types/core';
const track: CurrentTrack = { source:'simulator', title:'Demo', artists:['A'], album:'B', durationMs:1, playing:true };
describe('reaction frequency', () => {
  it('keeps low frequency for notable events only', () => {
    expect(shouldShowReaction({ type:'track-changed', track }, 'low')).toBe(false);
    expect(shouldShowReaction({ type:'replay', track }, 'low')).toBe(true);
  });
  it('allows normal track changes but not pause chatter', () => {
    expect(shouldShowReaction({ type:'track-changed', track }, 'normal')).toBe(true);
    expect(shouldShowReaction({ type:'paused', track }, 'normal')).toBe(false);
  });
  it('allows all non-stop semantic events at high frequency', () => {
    expect(shouldShowReaction({ type:'paused', track }, 'high')).toBe(true);
    expect(shouldShowReaction({ type:'stopped' }, 'high')).toBe(false);
  });
});
