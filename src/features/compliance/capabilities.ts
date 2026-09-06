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
    canSynchronizeLyrics: Boolean(rights?.canSynchronize) && Boolean(track) && !spotify,
    canCacheLyrics: Boolean(rights?.canCache),
    canSynchronizeVisualsToPlayback: Boolean(track) && !spotify
  };
}

export function canRenderLyrics(rights: LyricsRights | undefined, enabled: boolean): boolean {
  return enabled && Boolean(rights?.canDisplay);
}
