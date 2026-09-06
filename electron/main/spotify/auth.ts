import { shell } from 'electron';
import { createServer } from 'node:http';
import type { SecureTokenStore, TokenBundle } from '../storage/secure-token-store';
import { createPkcePair } from './pkce';

const AUTHORIZE = 'https://accounts.spotify.com/authorize';
const TOKEN = 'https://accounts.spotify.com/api/token';
const SCOPE = 'user-read-currently-playing';

export class SpotifyAuth {
  constructor(
    private readonly clientId: string,
    private readonly redirectUri: string,
    private readonly store: SecureTokenStore
  ) {}

  async connect(): Promise<TokenBundle> {
    if (!this.clientId) throw new Error('MAIN_VITE_SPOTIFY_CLIENT_ID is not configured.');
    const { verifier, challenge, state } = createPkcePair();
    const redirect = new URL(this.redirectUri);
    if (redirect.hostname !== '127.0.0.1') throw new Error('Spotify redirect must use 127.0.0.1 loopback.');

    const codePromise = new Promise<string>((resolve, reject) => {
      const server = createServer((req, res) => {
        try {
          const url = new URL(req.url ?? '/', this.redirectUri);
          if (url.pathname !== redirect.pathname) { res.writeHead(404).end(); return; }
          if (url.searchParams.get('state') !== state) { res.writeHead(400).end('Invalid state.'); reject(new Error('OAuth state mismatch.')); server.close(); return; }
          const code = url.searchParams.get('code');
          if (!code) { res.writeHead(400).end('Missing authorization code.'); reject(new Error('Missing Spotify authorization code.')); server.close(); return; }
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end('<h2>Song App is connected.</h2><p>You can close this tab.</p>');
          resolve(code); server.close();
        } catch (error) { reject(error); server.close(); }
      });
      server.on('error', reject);
      server.listen(Number(redirect.port), '127.0.0.1');
      setTimeout(() => { server.close(); reject(new Error('Spotify authorization timed out.')); }, 120_000).unref();
    });

    const url = new URL(AUTHORIZE);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('scope', SCOPE);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('state', state);
    await shell.openExternal(url.toString());

    const code = await codePromise;
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: this.redirectUri, client_id: this.clientId, code_verifier: verifier });
    const res = await fetch(TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    if (!res.ok) throw new Error(`Spotify token exchange failed (${res.status}).`);
    const json = await res.json() as { access_token: string; refresh_token?: string; expires_in: number; token_type: string; scope: string };
    const tokens: TokenBundle = {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: Date.now() + json.expires_in * 1000 - 30_000,
      tokenType: json.token_type,
      scope: json.scope
    };
    await this.store.write(tokens);
    return tokens;
  }

  disconnect(): Promise<void> { return this.store.clear(); }
  async connected(): Promise<boolean> { return Boolean(await this.store.read()); }
}
