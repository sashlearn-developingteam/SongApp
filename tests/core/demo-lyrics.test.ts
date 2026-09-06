import { describe, expect, it } from 'vitest';
import { demoLyricsForTrack } from '../../src/features/lyrics/demo-provider';
import type { CurrentTrack } from '../../src/types/core';

const simulator: CurrentTrack = { source:'simulator', title:'Demo', artists:['A'], album:'B', durationMs:1, playing:true };
const spotify: CurrentTrack = { source:'spotify', title:'Real', artists:['A'], album:'B', durationMs:1, playing:true };

describe('demo lyrics provider', () => {
  it('returns original demo lyrics only for simulator tracks', () => {
    expect(demoLyricsForTrack(simulator)?.rights.canDisplay).toBe(true);
    expect(demoLyricsForTrack(spotify)).toBeNull();
  });
});
