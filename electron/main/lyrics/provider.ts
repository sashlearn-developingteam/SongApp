import type { CurrentTrack, LyricsProviderId, LyricsResult } from '../../../src/types/core';

export type LyricsTrackQuery = {
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
};

export interface LyricsProvider {
  id: LyricsProviderId;
  name: string;
  getLyrics(track: LyricsTrackQuery): Promise<LyricsResult | null>;
}

export function lyricsTrackQuery(track: CurrentTrack): LyricsTrackQuery {
  return {
    title: track.title,
    artist: track.artists[0] ?? '',
    album: track.album || undefined,
    durationMs: track.durationMs || undefined
  };
}

export function normalizedMetadataPart(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lyricsTrackKey(track: CurrentTrack | LyricsTrackQuery): string {
  const title = normalizedMetadataPart(track.title);
  const artist = 'artists' in track
    ? normalizedMetadataPart(track.artists[0] ?? '')
    : normalizedMetadataPart(track.artist);
  const album = normalizedMetadataPart(track.album);
  const durationMs = Number.isFinite(track.durationMs) ? Number(track.durationMs) : 0;
  const roundedSeconds = Math.round(durationMs / 1000);
  return `${title}|${artist}|${album}|${roundedSeconds}`;
}
