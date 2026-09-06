import type { CurrentTrack, LyricsProviderId, LyricsState } from '../../../src/types/core';
import { LyricsProviderError } from './lrclib-provider.ts';
import { LyricsCache } from './lyrics-cache.ts';
import { lyricsTrackKey, lyricsTrackQuery, type LyricsProvider } from './provider.ts';

type LyricsProviders = Record<LyricsProviderId, LyricsProvider>;
type LyricsManagerOptions = { now?: () => number };

const IDLE_STATE: LyricsState = { status: 'idle', provider: null, trackKey: null, result: null };

function providerForTrack(track: CurrentTrack): LyricsProviderId {
  return track.source === 'simulator' ? 'simulator' : 'lrclib';
}

function scopedTrackKey(track: CurrentTrack): string {
  return `${providerForTrack(track)}:${lyricsTrackKey(track)}`;
}

export class LyricsManager {
  private state: LyricsState = IDLE_STATE;
  private track: CurrentTrack | null = null;
  private requestSerial = 0;
  private enabled = false;
  private readonly cache: LyricsCache;
  private readonly providers: LyricsProviders;
  private readonly onState: (state: LyricsState) => void;

  constructor(providers: LyricsProviders, onState: (state: LyricsState) => void, options: LyricsManagerOptions = {}) {
    this.providers = providers;
    this.onState = onState;
    this.cache = new LyricsCache(options.now ?? Date.now);
  }

  getState(): LyricsState { return this.state; }

  async setEnabled(enabled: boolean): Promise<LyricsState> {
    if (this.enabled === enabled) return this.state;
    this.enabled = enabled;
    this.requestSerial += 1;
    if (!enabled) return this.publish(IDLE_STATE);
    return this.track ? this.load(this.track, false) : this.publish(IDLE_STATE);
  }

  async setTrack(track: CurrentTrack | null): Promise<LyricsState> {
    if (!track) {
      this.track = null;
      this.requestSerial += 1;
      return this.publish(IDLE_STATE);
    }

    if (!this.enabled) {
      this.track = track;
      return this.state.status === 'idle' ? this.state : this.publish(IDLE_STATE);
    }

    const nextKey = scopedTrackKey(track);
    if (this.track && scopedTrackKey(this.track) === nextKey && this.state.trackKey === nextKey) {
      this.track = track;
      return this.state;
    }
    this.track = track;
    return this.load(track, false);
  }

  async refresh(): Promise<LyricsState> {
    if (!this.enabled || !this.track) return this.state;
    this.cache.delete(scopedTrackKey(this.track));
    return this.load(this.track, true);
  }

  private async load(track: CurrentTrack, force: boolean): Promise<LyricsState> {
    const key = scopedTrackKey(track);
    const providerId = providerForTrack(track);
    const provider = this.providers[providerId];
    const cached = force ? undefined : this.cache.get(key);
    if (cached !== undefined) {
      return this.publish({
        status: cached ? cached.kind : 'not-found',
        provider: providerId,
        trackKey: key,
        result: cached,
        message: cached ? undefined : 'Lyrics unavailable for this track.'
      });
    }

    const serial = ++this.requestSerial;
    this.publish({ status: 'loading', provider: providerId, trackKey: key, result: null });
    try {
      const result = await provider.getLyrics(lyricsTrackQuery(track));
      if (serial !== this.requestSerial) return this.state;
      if (!result || result.rights.canCache) this.cache.set(key, result);
      return this.publish({
        status: result ? result.kind : 'not-found',
        provider: providerId,
        trackKey: key,
        result,
        message: result ? undefined : 'Lyrics unavailable for this track.'
      });
    } catch (error) {
      if (serial !== this.requestSerial) return this.state;
      if (error instanceof LyricsProviderError) {
        return this.publish({
          status: error.kind,
          provider: providerId,
          trackKey: key,
          result: null,
          message: error.message,
          retryAfterMs: error.retryAfterMs
        });
      }
      return this.publish({
        status: 'error',
        provider: providerId,
        trackKey: key,
        result: null,
        message: error instanceof Error ? error.message : 'Lyrics provider failed.'
      });
    }
  }

  private publish(state: LyricsState): LyricsState {
    this.state = state;
    this.onState(state);
    return state;
  }
}
