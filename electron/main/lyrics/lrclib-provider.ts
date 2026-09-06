import type { LyricsResult, TimedLyricLine } from '../../../src/types/core';
import { parseLrc } from './lrc-parser.ts';
import {
  normalizedMetadataPart,
  type LyricsProvider,
  type LyricsTrackQuery
} from './provider.ts';

const BASE_URL = 'https://lrclib.net/api';
const LRCLIB_RIGHTS = {
  canDisplay: true,
  canSynchronize: false,
  canCache: true,
  commercialUse: false,
  attribution: 'Lyrics: LRCLIB · community source · commercial lyric rights are not granted by Song App'
} as const;

type ProviderErrorKind = 'offline' | 'rate-limited' | 'error';

export class LyricsProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly retryAfterMs?: number;
  readonly status?: number;
  constructor(kind: ProviderErrorKind, message: string, retryAfterMs?: number, status?: number) {
    super(message);
    this.name = 'LyricsProviderError';
    this.kind = kind;
    this.retryAfterMs = retryAfterMs;
    this.status = status;
  }
}

type LrclibCandidate = {
  id?: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

type LrclibProviderOptions = {
  fetchImpl?: typeof fetch;
  userAgent: string;
  timeoutMs?: number;
  now?: () => number;
};

function parseRetryAfter(value: string | null, now: number): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(120_000, Math.round(seconds * 1000));
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.min(120_000, Math.max(0, date - now));
}

function isCandidate(value: unknown): value is LrclibCandidate {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.trackName === 'string'
    && typeof item.artistName === 'string'
    && typeof item.albumName === 'string'
    && Number.isFinite(Number(item.duration))
    && typeof item.instrumental === 'boolean'
    && (item.plainLyrics === null || typeof item.plainLyrics === 'string' || item.plainLyrics === undefined)
    && (item.syncedLyrics === null || typeof item.syncedLyrics === 'string' || item.syncedLyrics === undefined);
}

function metadataMatches(query: LyricsTrackQuery, candidate: LrclibCandidate): boolean {
  if (normalizedMetadataPart(query.title) !== normalizedMetadataPart(candidate.trackName)) return false;
  if (normalizedMetadataPart(query.artist) !== normalizedMetadataPart(candidate.artistName)) return false;
  if (query.album && normalizedMetadataPart(query.album) !== normalizedMetadataPart(candidate.albumName)) return false;
  if (query.durationMs && Math.abs(Math.round(query.durationMs / 1000) - Number(candidate.duration)) > 3) return false;
  return true;
}

function toResult(candidate: LrclibCandidate): LyricsResult | null {
  if (candidate.syncedLyrics) {
    const parsedLines = parseLrc(candidate.syncedLyrics);
    const firstDisplayableIndex = parsedLines.findIndex((line) => line.text.trim().length > 0);
    const lines = firstDisplayableIndex >= 0 ? parsedLines.slice(firstDisplayableIndex) : [];
    if (lines.length) {
      return {
        kind: 'synced',
        provider: 'lrclib',
        lines,
        rights: { ...LRCLIB_RIGHTS },
        attribution: LRCLIB_RIGHTS.attribution
      };
    }
  }
  if (candidate.plainLyrics?.trim()) {
    return {
      kind: 'plain',
      provider: 'lrclib',
      text: candidate.plainLyrics,
      rights: { ...LRCLIB_RIGHTS, canSynchronize: false },
      attribution: LRCLIB_RIGHTS.attribution
    };
  }
  if (candidate.instrumental) {
    return {
      kind: 'instrumental',
      provider: 'lrclib',
      rights: { ...LRCLIB_RIGHTS, canSynchronize: false },
      attribution: LRCLIB_RIGHTS.attribution
    };
  }
  return null;
}

export class LrclibProvider implements LyricsProvider {
  readonly id = 'lrclib' as const;
  readonly name = 'LRCLIB';
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly now: () => number;
  private readonly options: LrclibProviderOptions;
  private blockedUntil = 0;
  private backoffAttempt = 0;

  constructor(options: LrclibProviderOptions) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.now = options.now ?? Date.now;
  }

  async getLyrics(track: LyricsTrackQuery): Promise<LyricsResult | null> {
    const now = this.now();
    if (now < this.blockedUntil) {
      throw new LyricsProviderError('rate-limited', 'LRCLIB is temporarily rate limited.', this.blockedUntil - now, 429);
    }

    const exact = await this.requestCandidate('/get', track);
    if (exact && metadataMatches(track, exact)) {
      const exactResult = toResult(exact);
      if (exactResult) {
        this.backoffAttempt = 0;
        return exactResult;
      }
    }

    const candidates = await this.search(track);
    const matched = candidates.find((candidate) => metadataMatches(track, candidate));
    this.backoffAttempt = 0;
    return matched ? toResult(matched) : null;
  }

  private queryParams(track: LyricsTrackQuery, includeDuration: boolean): URLSearchParams {
    const params = new URLSearchParams({
      track_name: track.title,
      artist_name: track.artist
    });
    if (track.album) params.set('album_name', track.album);
    if (includeDuration && track.durationMs && Number.isFinite(track.durationMs)) {
      params.set('duration', String(Math.round(track.durationMs / 1000)));
    }
    return params;
  }

  private async requestCandidate(path: string, track: LyricsTrackQuery): Promise<LrclibCandidate | null> {
    const response = await this.request(`${BASE_URL}${path}?${this.queryParams(track, true)}`);
    if (response.status === 404) return null;
    const json = await this.readJson(response);
    if (!isCandidate(json)) throw new LyricsProviderError('error', 'LRCLIB returned an invalid lyrics payload.', undefined, response.status);
    return json;
  }

  private async search(track: LyricsTrackQuery): Promise<LrclibCandidate[]> {
    const response = await this.request(`${BASE_URL}/search?${this.queryParams(track, false)}`);
    if (response.status === 404) return [];
    const json = await this.readJson(response);
    if (!Array.isArray(json)) throw new LyricsProviderError('error', 'LRCLIB search returned an invalid payload.', undefined, response.status);
    return json.filter(isCandidate);
  }

  private async request(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.options.userAgent,
          Accept: 'application/json'
        },
        signal: controller.signal
      });

      if (response.status === 429 || response.status === 503) {
        this.backoffAttempt += 1;
        const explicit = parseRetryAfter(response.headers.get('retry-after'), this.now());
        const fallback = Math.min(30_000, 800 * 2 ** Math.min(this.backoffAttempt, 5));
        const retryAfterMs = explicit ?? fallback;
        this.blockedUntil = this.now() + retryAfterMs;
        throw new LyricsProviderError('rate-limited', 'LRCLIB asked Song App to slow down.', retryAfterMs, response.status);
      }
      if (response.status === 404) return response;
      if (!response.ok) throw new LyricsProviderError('error', `LRCLIB request failed (${response.status}).`, undefined, response.status);
      return response;
    } catch (error) {
      if (error instanceof LyricsProviderError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LyricsProviderError('error', 'LRCLIB request timed out.');
      }
      if (error instanceof TypeError) throw new LyricsProviderError('offline', 'Unable to reach LRCLIB.');
      throw new LyricsProviderError('error', error instanceof Error ? error.message : 'LRCLIB request failed.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new LyricsProviderError('error', 'LRCLIB returned malformed JSON.', undefined, response.status);
    }
  }
}

export { metadataMatches as lrclibMetadataMatches, toResult as normalizeLrclibCandidate };
