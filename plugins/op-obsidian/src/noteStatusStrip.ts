/**
 * Pure helpers for the note-level status strip (OP-162 / §11 of OP-149).
 *
 * The strip renders below the primary-action chip and shows three
 * lazy-fetched, themed segments:
 *   `last commit: <sha7> "<subject>" · PR #<n> (<state>) · GH #<n> (<state>)`
 *
 * Each segment is omitted when its source field is empty (no dead chips).
 * The renderer in `noteDecorations.ts` consumes the {@link StripSegment}
 * array and the {@link GhStateCache} to decide what DOM to lay out; this
 * module owns the parsing, segment-shape, and cache TTL logic so the
 * renderer can stay thin and the behaviour is unit-testable.
 */

/** Frontmatter slice the strip cares about — a subset of `IssueEntry`. */
export interface StripFrontmatter {
  commits?: string[];
  pr?: string;
  githubIssue?: string;
}

/** Parsed `commits:` entry. The on-disk format is "<sha7> <subject>"; we
 * tolerate longer shas and split on the first space. */
export interface CommitInfo {
  sha: string;
  subject: string;
}

/** Cached GitHub state for one URL (PR or issue). `null` means we tried
 * and failed — render the link without state and don't retry until the
 * cache entry expires. */
export interface GhStateCacheEntry {
  state: string | null;
  expiresAt: number;
}

/** Single in-memory cache shared by all chip renders for one plugin
 * instance. Keys are the raw `pr:` / `github_issue:` URLs. */
export type GhStateCache = Map<string, GhStateCacheEntry>;

/** Default TTL for cached gh state. 60s is the floor — enough to absorb
 * a burst of mode toggles, short enough that a freshly-merged PR shows up
 * within a minute. */
export const GH_STATE_TTL_MS = 60_000;

/** One rendered segment of the strip. The renderer maps each kind to a
 * specific click handler (open URL, copy sha, etc.). */
export type StripSegment =
  | { kind: "commit"; sha: string; subject: string }
  | {
      kind: "pr";
      url: string;
      number: number | null;
      state: string | null;
      pending: boolean;
    }
  | {
      kind: "issue";
      url: string;
      number: number | null;
      state: string | null;
      pending: boolean;
    };

/**
 * Parse the latest entry of a `commits:` frontmatter list. Returns `null`
 * when the list is empty or the last entry is malformed (no whitespace).
 *
 * Format on-disk (set by `op-append-commit`): `<sha7> <subject>`. We only
 * care about the most recent entry — that's what the strip surfaces.
 */
export function parseLatestCommit(commits: string[] | undefined): CommitInfo | null {
  if (!commits || commits.length === 0) return null;
  const raw = commits[commits.length - 1];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const idx = trimmed.indexOf(" ");
  if (idx <= 0) {
    // No subject — render the sha alone. We treat that as a commit segment
    // with an empty subject so the renderer can still surface the click.
    return { sha: trimmed, subject: "" };
  }
  return {
    sha: trimmed.slice(0, idx),
    subject: trimmed.slice(idx + 1),
  };
}

/**
 * Pull the trailing `/<n>` segment off a GitHub URL. Returns `null` when
 * the URL doesn't end in a numeric path component (defensively — we don't
 * want a bad URL to crash the renderer).
 */
export function parseGithubNumber(url: string | undefined): number | null {
  if (!url) return null;
  const match = url.match(/\/(\d+)(?:[/#?].*)?$/);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Look up a URL's gh state; treat expired entries as a miss so the caller
 * kicks off a refresh. The 0-arg `now` param keeps tests deterministic.
 */
export function readGhCache(
  cache: GhStateCache,
  url: string,
  now: number,
): GhStateCacheEntry | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (entry.expiresAt <= now) return null;
  return entry;
}

/** Write a fresh state into the cache with the standard TTL. */
export function writeGhCache(
  cache: GhStateCache,
  url: string,
  state: string | null,
  now: number,
  ttl: number = GH_STATE_TTL_MS,
): void {
  cache.set(url, { state, expiresAt: now + ttl });
}

/**
 * Compose the strip segments for one issue note. Pure: takes the
 * frontmatter slice, the gh-state cache, and the current time and emits
 * the array the renderer iterates.
 *
 * Each segment is omitted when its source field is empty. PR/issue
 * segments are marked `pending: true` when the cache misses — the renderer
 * shows a placeholder dot and swaps in the real state when the async fetch
 * resolves and we re-render.
 */
export function composeStripSegments(
  fm: StripFrontmatter | null | undefined,
  cache: GhStateCache,
  now: number,
): StripSegment[] {
  if (!fm) return [];
  const out: StripSegment[] = [];

  const commit = parseLatestCommit(fm.commits);
  if (commit) {
    out.push({ kind: "commit", sha: commit.sha, subject: commit.subject });
  }

  const prUrl = typeof fm.pr === "string" ? fm.pr.trim() : "";
  if (prUrl) {
    const cached = readGhCache(cache, prUrl, now);
    out.push({
      kind: "pr",
      url: prUrl,
      number: parseGithubNumber(prUrl),
      state: cached?.state ?? null,
      pending: !cached,
    });
  }

  const issueUrl = typeof fm.githubIssue === "string" ? fm.githubIssue.trim() : "";
  if (issueUrl) {
    const cached = readGhCache(cache, issueUrl, now);
    out.push({
      kind: "issue",
      url: issueUrl,
      number: parseGithubNumber(issueUrl),
      state: cached?.state ?? null,
      pending: !cached,
    });
  }

  return out;
}

/**
 * Format the static (non-interactive) text of a single segment for use in
 * tests, screen-readers, or fallback rendering. The renderer normally lays
 * each segment out as its own clickable `<span>` but the formatted string
 * keeps the strip readable when CSS hasn't loaded.
 */
export function formatSegment(seg: StripSegment): string {
  switch (seg.kind) {
    case "commit": {
      const subj = seg.subject ? ` "${truncate(seg.subject, 40)}"` : "";
      return `last commit: ${seg.sha}${subj}`;
    }
    case "pr": {
      const n = seg.number !== null ? `#${seg.number}` : "PR";
      const state = seg.pending ? "…" : seg.state ?? "";
      return state ? `PR ${n} (${state.toLowerCase()})` : `PR ${n}`;
    }
    case "issue": {
      const n = seg.number !== null ? `#${seg.number}` : "GH";
      const state = seg.pending ? "…" : seg.state ?? "";
      return state ? `GH ${n} (${state.toLowerCase()})` : `GH ${n}`;
    }
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
