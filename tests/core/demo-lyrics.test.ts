import { describe, expect, it } from 'vitest';
import { SimulatorLyricsProvider } from '../../electron/main/lyrics/simulator-provider';

describe('simulator lyrics provider', () => {
  it('returns app-owned synchronized demo text with explicit rights', async () => {
    const result = await new SimulatorLyricsProvider().getLyrics({ title:'Demo', artist:'Song App' });
    expect(result.kind).toBe('synced');
    expect(result.provider).toBe('simulator');
    expect(result.rights.canDisplay).toBe(true);
    expect(result.rights.canSynchronize).toBe(true);
  });
});
