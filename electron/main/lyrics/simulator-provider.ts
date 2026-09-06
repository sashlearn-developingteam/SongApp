import type { LyricsProvider, LyricsTrackQuery } from './provider.ts';
import type { LyricsResult } from '../../../src/types/core';

const RIGHTS = {
  canDisplay: true,
  canSynchronize: true,
  canCache: true,
  commercialUse: true,
  attribution: 'Original demo text by Song App'
} as const;

export class SimulatorLyricsProvider implements LyricsProvider {
  readonly id = 'simulator' as const;
  readonly name = 'Song App Simulator';

  async getLyrics(_track: LyricsTrackQuery): Promise<LyricsResult> {
    return {
      kind: 'synced',
      provider: 'simulator',
      lines: [
        { startMs: 1_500, endMs: 6_000, text: 'The room is quiet, the speakers glow' },
        { startMs: 6_000, endMs: 10_000, text: 'A little color follows where we go' },
        { startMs: 10_000, endMs: 16_000, text: 'No borrowed words, no hidden tune' },
        { startMs: 16_000, endMs: 23_000, text: 'Just demo lines beneath the moon' }
      ],
      rights: { ...RIGHTS },
      attribution: RIGHTS.attribution
    };
  }
}
