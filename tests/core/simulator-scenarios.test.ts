import { describe, expect, it } from 'vitest';
import { buildSimulatorScenario } from '../../electron/main/simulator/scenarios';

describe('developer simulator scenarios', () => {
  it('emits semantic pause/replay/rapid-skip events', () => {
    expect(buildSimulatorScenario('pause', null).event?.type).toBe('paused');
    expect(buildSimulatorScenario('replay', null).event?.type).toBe('replay');
    expect(buildSimulatorScenario('rapid-skip', null).event?.type).toBe('rapid-skip');
  });

  it('gives normal demo tracks original local artwork and preserves the missing-artwork scenario', () => {
    expect(buildSimulatorScenario('track-start', null).track?.albumImage).toContain('data:image/svg+xml');
    expect(buildSimulatorScenario('missing-artwork', null).track?.albumImage).toBeUndefined();
  });

  it('keeps diagnostic scenarios descriptive without pretending to be Spotify content', () => {
    const result = buildSimulatorScenario('rate-limit', null);
    expect(result.track).toBeNull();
    expect(result.message.toLowerCase()).toContain('rate');
  });
});
