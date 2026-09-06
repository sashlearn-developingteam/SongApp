import type { CurrentTrack, PlaybackEvent } from '../../types/core';

const reactions = {
  track: [
    'new song detected',
    'headphones earning their salary',
    'the desktop has opinions about this one',
    'main character soundtrack activated',
    'this one is suspiciously good',
    'excellent choice, questionable volume probably'
  ],
  replay: ['back already?', 'again. completely reasonable.', 'the replay button wins another round'],
  skip: ['speed-running the queue', 'the skip button is working overtime', 'auditions are moving quickly today'],
  pause: ['tiny intermission', 'music break detected', 'the room got quieter somehow'],
  resume: ['and we are back', 'soundtrack resumed', 'desktop reactivated']
} as const;

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(list: readonly string[], seed: string): string {
  return list[hash(seed) % list.length] ?? list[0] ?? '';
}

export function reactionFor(event: PlaybackEvent, level: 0 | 1 | 2 | 3, now = new Date()): string | null {
  if (level === 0 || event.type === 'stopped') return null;
  const timeSeed = `${now.getHours()}-${Math.floor(now.getMinutes() / 10)}`;
  switch (event.type) {
    case 'track-changed': return pick(reactions.track, `${event.track.title}-${timeSeed}-${level}`);
    case 'replay': return pick(reactions.replay, `${event.track.title}-${timeSeed}`);
    case 'rapid-skip': return pick(reactions.skip, `${event.count}-${timeSeed}`);
    case 'paused': return level >= 2 ? pick(reactions.pause, `${event.track.title}-${timeSeed}`) : null;
    case 'resumed': return level >= 2 ? pick(reactions.resume, `${event.track.title}-${timeSeed}`) : null;
  }
}

export function trackIdentity(track: CurrentTrack | null): string | null {
  if (!track) return null;
  return track.spotifyId ?? `${track.title}|${track.artists.join(',')}|${track.album}`;
}


export function shouldShowReaction(
  event: PlaybackEvent | null,
  frequency: 'low' | 'normal' | 'high'
): boolean {
  if (!event || event.type === 'stopped') return false;
  if (frequency === 'high') return true;
  if (frequency === 'normal') return event.type !== 'paused' && event.type !== 'resumed';
  return event.type === 'rapid-skip' || event.type === 'replay';
}
