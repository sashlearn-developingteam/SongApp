import type { CurrentTrack } from '../../../src/types/core';
import { SpotifyApiError, type SpotifyClient } from './client';
import { retryDelayMs } from './rate-limit';

export class PlaybackPoller {
  private timer: NodeJS.Timeout | null = null;
  private stopped = true;
  private attempt = 0;

  constructor(private readonly client: SpotifyClient, private readonly onTrack: (track: CurrentTrack | null) => void, private readonly onError: (message: string) => void) {}

  start(): void { if (!this.stopped) return; this.stopped = false; void this.tick(); }
  stop(): void { this.stopped = true; if (this.timer) clearTimeout(this.timer); this.timer = null; }

  private schedule(ms: number): void { if (!this.stopped) this.timer = setTimeout(() => void this.tick(), ms); }

  private async tick(): Promise<void> {
    if (this.stopped) return;
    try {
      const track = await this.client.currentTrack();
      this.attempt = 0;
      this.onTrack(track);
      this.schedule(track?.playing ? 2_500 : 5_000);
    } catch (error) {
      this.attempt += 1;
      const spotifyError = error instanceof SpotifyApiError ? error : null;
      this.onError(error instanceof Error ? error.message : 'Spotify polling failed.');
      this.schedule(retryDelayMs(this.attempt, spotifyError?.retryAfter));
    }
  }
}
