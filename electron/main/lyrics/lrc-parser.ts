import type { TimedLyricLine } from '../../../src/types/core';

const TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

function fractionToMs(value: string | undefined): number {
  if (!value) return 0;
  if (value.length === 1) return Number(value) * 100;
  if (value.length === 2) return Number(value) * 10;
  return Number(value.slice(0, 3));
}

export function parseLrc(input: string): TimedLyricLine[] {
  if (!input) return [];
  const parsed: Array<TimedLyricLine & { order: number }> = [];
  let order = 0;

  for (const rawLine of input.replace(/\r\n?/g, '\n').split('\n')) {
    TIMESTAMP.lastIndex = 0;
    const matches = [...rawLine.matchAll(TIMESTAMP)];
    if (matches.length === 0) continue;
    const textStart = matches.at(-1)?.index;
    const lastMatch = matches.at(-1)?.[0] ?? '';
    const text = typeof textStart === 'number' ? rawLine.slice(textStart + lastMatch.length) : '';

    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = fractionToMs(match[3]);
      if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) continue;
      parsed.push({ startMs: minutes * 60_000 + seconds * 1000 + fraction, text, order: order++ });
    }
  }

  parsed.sort((a, b) => a.startMs - b.startMs || a.order - b.order);
  return parsed.map(({ startMs, text }, index) => ({
    startMs,
    text,
    endMs: parsed[index + 1]?.startMs
  }));
}
