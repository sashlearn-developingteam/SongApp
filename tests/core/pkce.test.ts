import { describe, expect, it } from 'vitest';
import { createPkcePair } from '../../electron/main/spotify/pkce';
describe('PKCE', () => {
  it('creates an RFC-safe verifier', () => expect(createPkcePair().verifier).toMatch(/^[A-Za-z0-9_-]{43,}$/));
  it('creates a base64url challenge', () => expect(createPkcePair().challenge).toMatch(/^[A-Za-z0-9_-]+$/));
  it('creates unique state values', () => expect(createPkcePair().state).not.toBe(createPkcePair().state));
});
