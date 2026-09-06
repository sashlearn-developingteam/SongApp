import { useEffect, useMemo, useState } from 'react';
import type { CurrentTrack, LyricsResult } from '../../types/core';
import { activeLyricLineIndex, cadenceEnergy } from './sync';

export function useSyncedLyrics(
  track: CurrentTrack | null,
  result: LyricsResult | null,
  allowSynchronization: boolean
): { activeIndex: number; cadence: number } {
  const lines = result?.kind === 'synced' ? result.lines : [];
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!track || !allowSynchronization || result?.kind !== 'synced' || lines.length === 0) {
      setActiveIndex(-1);
      return;
    }

    let timer = 0;
    let disposed = false;
    const capturedAt = performance.now();
    const baseProgress = track.progressMs ?? 0;

    const update = () => {
      if (disposed) return;
      const elapsed = track.playing ? Math.max(0, performance.now() - capturedAt) : 0;
      const position = Math.min(track.durationMs, baseProgress + elapsed);
      const index = activeLyricLineIndex(lines, position);
      setActiveIndex((current) => current === index ? current : index);
      const nextStart = lines[index + 1]?.startMs;
      if (track.playing && nextStart !== undefined) {
        const wait = Math.max(16, nextStart - position + 12);
        timer = window.setTimeout(update, Math.min(wait, 10_000));
      }
    };

    update();
    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [allowSynchronization, lines, result?.kind, track?.durationMs, track?.playing, track?.progressMs, track?.spotifyId, track?.source, track?.title]);

  const cadence = useMemo(() => result?.kind === 'synced' ? cadenceEnergy(result.lines, activeIndex) : 0, [activeIndex, result]);
  return { activeIndex, cadence };
}
