export function retryDelayMs(attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 120_000);
  }
  const base = Math.min(750 * 2 ** Math.max(0, attempt), 30_000);
  return Math.round(base + Math.random() * Math.min(750, base * 0.2));
}
