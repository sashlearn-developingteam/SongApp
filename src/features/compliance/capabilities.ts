import type { CurrentTrack, LyricsRights } from '../../types/core';

export type ContentCapabilities = {
  canDisplayMetadata: boolean;
  canDisplayArtwork: boolean;
  canTransformArtwork: boolean;
  canDisplayLyrics: boolean;
  canSynchronizeLyrics: boolean;
  canCacheLyrics: boolean;
  canSynchronizeVisualsToPlayback: boolean;
};

export function capabilitiesFor(track: CurrentTrack | null, rights?: LyricsRights): ContentCapabilities {
  const spotify = track?.source === 'spotify';
  return {
    canDisplayMetadata: Boolean(track),
    canDisplayArtwork: Boolean(track?.albumImage),
    canTransformArtwork: !spotify,
    canDisplayLyrics: Boolean(rights?.canDisplay),
    canSynchronizeLyrics: false,
    canCacheLyrics: Boolean(rights?.canCache),
    canSynchronizeVisualsToPlayback: false
  };
}

export function canRenderLyrics(rights: LyricsRights | undefined, enabled: boolean): boolean {
  return enabled && Boolean(rights?.canDisplay);
}
