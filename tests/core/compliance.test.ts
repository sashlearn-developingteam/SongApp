import { describe, expect, it } from 'vitest';
import { capabilitiesFor, canRenderLyrics } from '../../src/features/compliance/capabilities';
import type { CurrentTrack, LyricsRights } from '../../src/types/core';

const spotifyTrack: CurrentTrack = { source:'spotify', spotifyId:'1', title:'Track', artists:['Artist'], album:'Album', albumImage:'https://i.scdn.co/image/x', spotifyUrl:'https://open.spotify.com/track/1', durationMs:1, playing:true };
const rights: LyricsRights = { canDisplay:true, canSynchronize:true, canCache:false, commercialUse:true };

describe('compliance capabilities', () => {
  it('never permits Spotify artwork transformation', () => expect(capabilitiesFor(spotifyTrack).canTransformArtwork).toBe(false));
  it('never permits audio/visual synchronization', () => expect(capabilitiesFor(spotifyTrack).canSynchronizeVisualsToPlayback).toBe(false));
  it('never permits lyric synchronization at app level', () => expect(capabilitiesFor(spotifyTrack, rights).canSynchronizeLyrics).toBe(false));
  it('requires both rights and user enablement to render lyrics', () => { expect(canRenderLyrics(rights,true)).toBe(true); expect(canRenderLyrics(rights,false)).toBe(false); });
});
