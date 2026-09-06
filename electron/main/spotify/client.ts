import type { CurrentTrack } from '../../../src/types/core';
import type { SecureTokenStore, TokenBundle } from '../storage/secure-token-store';

const API = 'https://api.spotify.com/v1';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

export class SpotifyApiError extends Error {
  constructor(message: string, readonly status?: number, readonly retryAfter?: string | null) { super(message); }
}

export class SpotifyClient {
  constructor(private readonly clientId: string, private readonly tokenStore: SecureTokenStore) {}

  async refresh(tokens: TokenBundle): Promise<TokenBundle> {
    if (!tokens.refreshToken) throw new SpotifyApiError('No refresh token available.', 401);
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken, client_id: this.clientId });
    const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    if (!res.ok) throw new SpotifyApiError('Spotify token refresh failed.', res.status);
    const json = await res.json() as { access_token: string; expires_in: number; refresh_token?: string; token_type: string; scope?: string };
    const next: TokenBundle = {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? tokens.refreshToken,
      expiresAt: Date.now() + json.expires_in * 1000 - 30_000,
      tokenType: json.token_type,
      scope: json.scope ?? tokens.scope
    };
    await this.tokenStore.write(next);
    return next;
  }

  private async validToken(): Promise<TokenBundle> {
    const tokens = await this.tokenStore.read();
    if (!tokens) throw new SpotifyApiError('Spotify is not connected.', 401);
    if (Date.now() >= tokens.expiresAt) return this.refresh(tokens);
    return tokens;
  }

  async currentTrack(): Promise<CurrentTrack | null> {
    let tokens = await this.validToken();
    let res = await fetch(`${API}/me/player/currently-playing`, { headers: { authorization: `Bearer ${tokens.accessToken}` } });
    if (res.status === 401) {
      tokens = await this.refresh(tokens);
      res = await fetch(`${API}/me/player/currently-playing`, { headers: { authorization: `Bearer ${tokens.accessToken}` } });
    }
    if (res.status === 204) return null;
    if (!res.ok) throw new SpotifyApiError(`Spotify playback request failed (${res.status}).`, res.status, res.headers.get('retry-after'));
    const payload = await res.json() as any;
    const item = payload?.item;
    if (!item || item.type !== 'track') return null;
    const image = Array.isArray(item.album?.images) ? item.album.images[0]?.url : undefined;
    return {
      source: 'spotify',
      spotifyId: String(item.id),
      title: String(item.name ?? ''),
      artists: Array.isArray(item.artists) ? item.artists.map((a: any) => String(a.name)).filter(Boolean) : [],
      album: String(item.album?.name ?? ''),
      albumImage: typeof image === 'string' ? image : undefined,
      spotifyUrl: typeof item.external_urls?.spotify === 'string' ? item.external_urls.spotify : undefined,
      durationMs: Number(item.duration_ms ?? 0),
      progressMs: Number(payload.progress_ms ?? 0),
      playing: Boolean(payload.is_playing)
    };
  }
}
