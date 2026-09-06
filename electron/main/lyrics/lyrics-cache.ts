import type { LyricsResult } from '../../../src/types/core';

type Entry = {
  value: LyricsResult | null;
  expiresAt: number;
};

export class LyricsCache {
  private readonly entries = new Map<string, Entry>();
  private readonly now: () => number;
  private readonly successTtlMs: number;
  private readonly missTtlMs: number;
  constructor(now: () => number = Date.now, successTtlMs = 6 * 60 * 60 * 1000, missTtlMs = 3 * 60 * 1000) {
    this.now = now;
    this.successTtlMs = successTtlMs;
    this.missTtlMs = missTtlMs;
  }

  get(key: string): LyricsResult | null | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (this.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: LyricsResult | null): void {
    this.entries.set(key, {
      value,
      expiresAt: this.now() + (value ? this.successTtlMs : this.missTtlMs)
    });
  }

  delete(key: string): void { this.entries.delete(key); }
  clear(): void { this.entries.clear(); }
}
