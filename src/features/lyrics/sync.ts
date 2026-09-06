import type { TimedLyricLine } from '../../types/core';

export function activeLyricLineIndex(lines: TimedLyricLine[], positionMs: number): number {
  if (!lines.length || positionMs < lines[0].startMs) return -1;
  let low = 0;
  let high = lines.length - 1;
  let answer = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].startMs <= positionMs) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer;
}

export function cadenceEnergy(lines: TimedLyricLine[], activeIndex: number): number {
  if (activeIndex <= 0 || activeIndex >= lines.length) return 0.2;
  const gap = Math.max(120, lines[activeIndex].startMs - lines[activeIndex - 1].startMs);
  const energy = 1 - Math.min(1, Math.max(0, (gap - 450) / 5_800));
  return Math.max(0.08, Math.min(1, energy));
}
