import { describe, expect, it } from 'vitest';
import { reactionFor } from '../../src/features/reactions/reaction-engine';
import type { CurrentTrack } from '../../src/types/core';
const track: CurrentTrack = { source:'simulator', title:'Midnight Geometry', artists:['Northbound'], album:'Demo', durationMs:200000, playing:true };
describe('reaction engine', () => {
  it('is silent at level zero', () => expect(reactionFor({type:'track-changed',track},0,new Date(0))).toBeNull());
  it('returns deterministic local copy', () => expect(reactionFor({type:'track-changed',track},2,new Date(0))).toBe(reactionFor({type:'track-changed',track},2,new Date(0))));
  it('reacts to rapid skipping', () => expect(reactionFor({type:'rapid-skip',count:4},2,new Date(0))).toBeTruthy());
  it('does not react to stop state', () => expect(reactionFor({type:'stopped'},3,new Date(0))).toBeNull());
});
