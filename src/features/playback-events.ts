import type { CurrentTrack, PlaybackEvent } from '../types/core';
import { trackIdentity } from './reactions/reaction-engine';

type PlaybackMemory = {
  previous: CurrentTrack | null;
  recentChangeTimes: number[];
};

export function createPlaybackMemory(): PlaybackMemory {
  return { previous: null, recentChangeTimes: [] };
}

export function detectPlaybackEvents(memory: PlaybackMemory, current: CurrentTrack | null, now = Date.now()): PlaybackEvent[] {
  const events: PlaybackEvent[] = [];
  const previous = memory.previous;
  const previousId = trackIdentity(previous);
  const currentId = trackIdentity(current);

  if (!current && previous) events.push({ type: 'stopped' });
  if (current && !previous) events.push({ type: 'track-changed', track: current });
  if (current && previous && currentId !== previousId) {
    events.push({ type: 'track-changed', track: current });
    memory.recentChangeTimes.push(now);
  }
  if (current && previous && currentId === previousId) {
    if (previous.playing && !current.playing) events.push({ type: 'paused', track: current });
    if (!previous.playing && current.playing) events.push({ type: 'resumed', track: current });
    if ((previous.progressMs ?? 0) > 20_000 && (current.progressMs ?? 0) < 5_000) events.push({ type: 'replay', track: current });
  }

  memory.recentChangeTimes = memory.recentChangeTimes.filter((t) => now - t < 12_000);
  if (memory.recentChangeTimes.length >= 3) {
    events.push({ type: 'rapid-skip', count: memory.recentChangeTimes.length });
    memory.recentChangeTimes = [];
  }
  memory.previous = current;
  return events;
}
