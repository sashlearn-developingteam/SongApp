import { describe, expect, it } from 'vitest';
import { isAllowedExternalUrl, secureWebPreferences } from '../../electron/main/security/navigation-policy';
describe('renderer security', () => {
  it('allows exact Spotify HTTPS hosts', () => expect(isAllowedExternalUrl('https://open.spotify.com/track/123')).toBe(true));
  it('rejects lookalike hosts', () => expect(isAllowedExternalUrl('https://open.spotify.com.evil.example/track/123')).toBe(false));
  it('rejects non-HTTPS', () => expect(isAllowedExternalUrl('http://open.spotify.com/track/123')).toBe(false));
  it('locks renderer privileges down', () => expect(secureWebPreferences('/preload.js')).toMatchObject({nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}));
});
