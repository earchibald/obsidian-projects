export interface RecencyEntry {
  id: string;
  /** ISO-8601 timestamp recorded when the issue was last touched. */
  at: string;
}

export const RECENCY_CAP = 25;

/**
 * Read an unknown `recent:` value out of settings into a usable log. Anything
 * that isn't an array, or whose entries don't shape-match `{id, at}`, is
 * dropped entirely — the caller falls back to `[]`. Hand-corrupting `recent`
 * in `data.json` (typing garbage, replacing with `null`/`{}`) must leave the
 * rest of the settings recovery path untouched.
 */
export function sanitizeRecency(value: unknown): RecencyEntry[] {
  if (!Array.isArray(value)) return [];
  const out: RecencyEntry[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    const at = (item as { at?: unknown }).at;
    if (typeof id !== "string" || !id) continue;
    if (typeof at !== "string" || !at) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, at });
    if (out.length >= RECENCY_CAP) break;
  }
  return out;
}

/**
 * Append a fresh touch onto the recency log. Idempotent on `id`: an existing
 * entry is moved to the head with the new timestamp rather than duplicated.
 * Caps at {@link RECENCY_CAP} entries (oldest discarded).
 */
export function appendRecency(
  log: ReadonlyArray<RecencyEntry>,
  id: string,
  atIso: string,
  cap: number = RECENCY_CAP,
): RecencyEntry[] {
  if (!id) return [...log];
  const head: RecencyEntry = { id, at: atIso };
  const tail = log.filter((e) => e.id !== id);
  const next = [head, ...tail];
  return next.length > cap ? next.slice(0, cap) : next;
}

/** The most recently touched entry, or `undefined` for an empty log. */
export function mostRecent(log: ReadonlyArray<RecencyEntry>): RecencyEntry | undefined {
  return log.length > 0 ? log[0] : undefined;
}

/** Format an ISO timestamp as `5m ago` / `2h ago` / `3d ago` / `<date>`. */
export function relativeTime(atIso: string, now: Date = new Date()): string {
  const t = Date.parse(atIso);
  if (!Number.isFinite(t)) return "";
  const diffMs = now.getTime() - t;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return atIso.slice(0, 10);
}
