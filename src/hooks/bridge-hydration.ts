export type BridgeHydrationTopic = 'settings' | 'track' | 'playbackEvent' | 'spotify' | 'lyrics';

type BridgeHydrationSnapshot = Record<BridgeHydrationTopic, number>;

export function createBridgeHydrationGate() {
  const versions: BridgeHydrationSnapshot = {
    settings: 0,
    track: 0,
    playbackEvent: 0,
    spotify: 0,
    lyrics: 0
  };

  return {
    mark(topic: BridgeHydrationTopic): void {
      versions[topic] += 1;
    },
    snapshot(): BridgeHydrationSnapshot {
      return { ...versions };
    },
    isFresh(topic: BridgeHydrationTopic, snapshot: BridgeHydrationSnapshot): boolean {
      return versions[topic] === snapshot[topic];
    }
  };
}
