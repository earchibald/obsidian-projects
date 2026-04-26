// Pure helpers for OP-205 (3e) — the bad-model recovery dialog. No Obsidian
// imports. The dialog (`recoveryDialog.ts`) is the only consumer; tests live
// alongside in `recoveryPatch.test.ts`.
//
// Three jobs:
//
//   1. `planBadModelPatch` — given the raw WORKFLOW.md text and the bad model
//      name, find the (single) frontmatter occurrence and compute the new
//      text. v1 contract is strict: replace only when the bad name appears
//      EXACTLY ONCE in the frontmatter. Multiple matches surface as
//      `"ambiguous"` so the dialog disables the patch button rather than
//      silently rewriting the wrong copy.
//
//   2. `formatUnifiedDiff` — render a minimal one-or-two-hunk unified diff for
//      the dialog's confirm step. We never patch more than a handful of lines,
//      so a hand-rolled implementation beats pulling a diff dependency.
//
//   3. `formatBackupTimestamp` + `findLatestBackup` — the `.bak-<YYYYMMDD-HHmmss>`
//      naming + lex-sortable selection used by the patch + revert flows. UTC
//      to keep the timestamp reproducible across DST/timezones, matching the
//      `today()` convention in `promptBuild.ts`.

export type PlanBadModelPatchResult =
  | { status: "ok"; newText: string; diff: string }
  | { status: "ambiguous"; matches: number }
  | { status: "not-found" };

export interface PlanBadModelPatchInput {
  /** Full file contents of WORKFLOW.md. */
  raw: string;
  /** Vault-relative path; only used for the diff headers. */
  path: string;
  /** The model name to substitute (`BadModelSpec.badName`). */
  badName: string;
  /** The canonical id to replace it with (validated by the caller). */
  replacement: string;
}

/**
 * Compute the patched WORKFLOW.md text + a unified diff describing the change.
 *
 * Scope: only the YAML frontmatter (`---` … `---` at the top of the file). A
 * body mention of the bad name (in prose, a comment, an example) does not
 * count — the patch is a frontmatter rewrite.
 *
 * Word boundaries: a matching token is a contiguous run of [A-Za-z0-9._-]
 * characters that equals `badName`. Two consequences:
 *   - `model: opus` matches `opus` cleanly even when the value is unquoted.
 *   - `model: [opuss, opus]` matches `opus` once (not twice — `opuss` is a
 *     different token).
 *   - A quoted form `model: "opus"` matches because the quotes are not part
 *     of the token; the surrounding quotes are preserved by replacing only
 *     the inner span.
 *
 * Single-occurrence enforcement: when more than one frontmatter occurrence is
 * found we return `{ status: "ambiguous", matches }`. The dialog disables the
 * patch button and points the user at manual editing. Patching the wrong copy
 * silently is the failure mode this rule rules out.
 */
export function planBadModelPatch(
  input: PlanBadModelPatchInput,
): PlanBadModelPatchResult {
  const frontmatter = extractFrontmatter(input.raw);
  if (!frontmatter) return { status: "not-found" };

  const re = new RegExp(`(^|[^A-Za-z0-9._-])(${escapeRegex(input.badName)})(?=$|[^A-Za-z0-9._-])`, "g");
  const fmText = frontmatter.text;
  const matches: Array<{ start: number; end: number }> = [];
  for (const m of fmText.matchAll(re)) {
    const idx = (m.index ?? 0) + m[1].length;
    matches.push({ start: idx, end: idx + m[2].length });
  }
  if (matches.length === 0) return { status: "not-found" };
  if (matches.length > 1) return { status: "ambiguous", matches: matches.length };

  const hit = matches[0];
  const newFm = fmText.slice(0, hit.start) + input.replacement + fmText.slice(hit.end);
  const newText =
    input.raw.slice(0, frontmatter.bodyStart) + newFm + input.raw.slice(frontmatter.bodyEnd);
  const diff = formatUnifiedDiff(input.raw, newText, input.path);
  return { status: "ok", newText, diff };
}

interface FrontmatterSpan {
  /** Index where the frontmatter content (after the opening `---\n`) starts. */
  bodyStart: number;
  /** Index where the frontmatter content ends (before the closing `---\n`). */
  bodyEnd: number;
  /** Slice between bodyStart and bodyEnd. */
  text: string;
}

function extractFrontmatter(raw: string): FrontmatterSpan | null {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) return null;
  const opener = raw.startsWith("---\r\n") ? 5 : 4;
  // Closing fence: a line that is exactly "---" (optionally followed by \r).
  const re = /\r?\n---(?:\r?\n|$)/g;
  re.lastIndex = opener;
  const m = re.exec(raw);
  if (!m) return null;
  return {
    bodyStart: opener,
    // The slice ends *before* the leading newline of the closing fence so the
    // closing `---` itself is preserved by the surrounding `raw` slice.
    bodyEnd: m.index + 1,
    text: raw.slice(opener, m.index + 1),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Pad-zero a UTC date to `YYYYMMDD-HHmmss`. UTC is intentional: the timestamp
 * is durable across DST/timezones, and lex-sort matches chronological order.
 */
export function formatBackupTimestamp(date: Date): string {
  const yyyy = String(date.getUTCFullYear()).padStart(4, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

/** Build the absolute backup path for a given workflow path + timestamp. */
export function backupPathFor(workflowPath: string, timestamp: string): string {
  return `${workflowPath}.bak-${timestamp}`;
}

const BACKUP_SUFFIX_RE = /\.bak-(\d{8}-\d{6})$/;

/**
 * Pick the most recent backup for `workflowPath` from the given list of
 * sibling vault paths. Returns `null` when no `.bak-*` matches.
 *
 * Selection is lex-sort over the timestamp suffix — the `YYYYMMDD-HHmmss`
 * shape is contrived to make string comparison match chronological order.
 */
export function findLatestBackup(siblingPaths: string[], workflowPath: string): string | null {
  const prefix = `${workflowPath}.bak-`;
  const candidates = siblingPaths.filter(
    (p) => p.startsWith(prefix) && BACKUP_SUFFIX_RE.test(p),
  );
  if (candidates.length === 0) return null;
  candidates.sort();
  return candidates[candidates.length - 1];
}

/**
 * Minimal unified-diff renderer. Produces standard `---`/`+++`/`@@` headers
 * plus one hunk per contiguous block of changed lines (3 lines of context on
 * each side, clamped at file edges).
 *
 * We never apply this elsewhere — the result is human-display-only — so we
 * skip features a real diff library carries (rename detection, byte-mode
 * patches, function-context lines). For one-or-two-line edits the output
 * matches `diff -u` byte-for-byte where it matters.
 */
export function formatUnifiedDiff(oldText: string, newText: string, path: string): string {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const ops = lcsDiff(oldLines, newLines);
  const hunks = groupHunks(ops, 3);
  const out: string[] = [`--- a/${path}`, `+++ b/${path}`];
  for (const h of hunks) {
    out.push(`@@ -${h.oldStart},${h.oldLen} +${h.newStart},${h.newLen} @@`);
    for (const line of h.lines) out.push(line);
  }
  return out.join("\n");
}

function splitLines(s: string): string[] {
  if (s === "") return [];
  const parts = s.split(/\r?\n/);
  // A trailing newline produces a phantom empty trailing element that we drop
  // — diff hunks treat the trailing newline as a file-level convention, not as
  // a "blank last line."
  if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

type DiffOp =
  | { kind: "ctx"; line: string }
  | { kind: "del"; line: string }
  | { kind: "add"; line: string };

/**
 * Classic LCS-table line diff. Quadratic in the number of lines on each side,
 * which is fine for WORKFLOW.md (typically <500 lines). Each `del` precedes
 * its matching `add` to keep the visual order consistent with `diff -u`.
 */
function lcsDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "ctx", line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", line: a[i] });
      i++;
    } else {
      out.push({ kind: "add", line: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ kind: "del", line: a[i++] });
  while (j < m) out.push({ kind: "add", line: b[j++] });
  return out;
}

interface Hunk {
  oldStart: number;
  oldLen: number;
  newStart: number;
  newLen: number;
  lines: string[];
}

/**
 * Walk the linear op stream and emit one hunk per cluster of changes plus
 * `context` lines on either side (collapsed when consecutive clusters fall
 * within `2 * context + 1` lines of each other — matches `diff -u` defaults).
 */
function groupHunks(ops: DiffOp[], context: number): Hunk[] {
  const hunks: Hunk[] = [];
  let i = 0;
  // Cumulative {oldLine, newLine} for each op index.
  const oldLineAt: number[] = new Array(ops.length + 1);
  const newLineAt: number[] = new Array(ops.length + 1);
  oldLineAt[0] = 1;
  newLineAt[0] = 1;
  for (let k = 0; k < ops.length; k++) {
    const o = ops[k];
    oldLineAt[k + 1] = oldLineAt[k] + (o.kind === "ctx" || o.kind === "del" ? 1 : 0);
    newLineAt[k + 1] = newLineAt[k] + (o.kind === "ctx" || o.kind === "add" ? 1 : 0);
  }

  while (i < ops.length) {
    if (ops[i].kind === "ctx") {
      i++;
      continue;
    }
    let start = Math.max(0, i - context);
    while (start > 0 && ops[start - 1].kind === "ctx" && i - start < context) start--;
    let end = i;
    while (end < ops.length) {
      // Extend to include nearby change clusters separated by < 2*context
      // pure-context ops.
      if (ops[end].kind !== "ctx") {
        end++;
        continue;
      }
      let runEnd = end;
      while (runEnd < ops.length && ops[runEnd].kind === "ctx") runEnd++;
      if (runEnd >= ops.length) break;
      if (runEnd - end > 2 * context) break;
      end = runEnd;
    }
    const tail = Math.min(ops.length, end + context);
    const slice = ops.slice(start, tail);

    const lines: string[] = [];
    for (const o of slice) {
      if (o.kind === "ctx") lines.push(` ${o.line}`);
      else if (o.kind === "del") lines.push(`-${o.line}`);
      else lines.push(`+${o.line}`);
    }

    const oldStart = oldLineAt[start];
    const newStart = newLineAt[start];
    const oldLen = oldLineAt[tail] - oldLineAt[start];
    const newLen = newLineAt[tail] - newLineAt[start];
    hunks.push({ oldStart, oldLen, newStart, newLen, lines });
    i = tail;
  }
  return hunks;
}
