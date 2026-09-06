import type { CurrentTrack, LyricsResult } from '../../types/core';

export interface LyricsProvider {
  searchTrack(track: CurrentTrack): Promise<string | null>;
  getLyrics(id: string): Promise<LyricsResult | null>;
}

export const DEMO_LYRICS: LyricsResult = {
  provider: 'Song App Demo',
  lines: [
    { text: 'The room is quiet, the speakers glow' },
    { text: 'A little color follows where we go' },
    { text: 'No borrowed words, no hidden tune' },
    { text: 'Just demo lines beneath the moon' }
  ],
  rights: {
    canDisplay: true,
    canSynchronize: false,
    canCache: true,
    commercialUse: true,
    attribution: 'Original demo text by Song App'
  }
};

export function demoLyricsForTrack(track: CurrentTrack | null): LyricsResult | null {
  return track?.source === 'simulator' ? DEMO_LYRICS : null;
}

export class DemoLyricsProvider implements LyricsProvider {
  async searchTrack(track: CurrentTrack): Promise<string | null> { return track.source === 'simulator' ? 'demo' : null; }
  async getLyrics(id: string): Promise<LyricsResult | null> { return id === 'demo' ? DEMO_LYRICS : null; }
}
