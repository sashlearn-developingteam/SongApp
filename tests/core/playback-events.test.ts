import { describe, expect, it } from 'vitest';
import { createPlaybackMemory, detectPlaybackEvents } from '../../src/features/playback-events';
import type { CurrentTrack } from '../../src/types/core';
const t = (title:string, playing=true, progressMs=10000): CurrentTrack => ({source:'simulator',title,artists:['A'],album:'B',durationMs:200000,playing,progressMs});
describe('playback event detector', () => {
  it('emits first track change', () => expect(detectPlaybackEvents(createPlaybackMemory(),t('A'))[0]?.type).toBe('track-changed'));
  it('emits pause', () => { const m=createPlaybackMemory(); detectPlaybackEvents(m,t('A',true)); expect(detectPlaybackEvents(m,t('A',false))[0]?.type).toBe('paused'); });
  it('emits resume', () => { const m=createPlaybackMemory(); detectPlaybackEvents(m,t('A',false)); expect(detectPlaybackEvents(m,t('A',true))[0]?.type).toBe('resumed'); });
  it('detects replay from a large progress reset', () => { const m=createPlaybackMemory(); detectPlaybackEvents(m,t('A',true,50000)); expect(detectPlaybackEvents(m,t('A',true,1000))[0]?.type).toBe('replay'); });
});
