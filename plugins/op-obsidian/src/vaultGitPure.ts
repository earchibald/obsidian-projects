// Pure helpers for the OP-261 vault-git auto-commit + flush feature.
// Splitting these from `vaultGit.ts` (which shells out via `child_process`)
// keeps them vitest-friendly with no I/O.

export const VAULT_GIT_DEFAULT_GITIGNORE = `.obsidian/workspace*
Projects/_scratch/
*.tmp
`;

export interface CommitMessageInput {
  cmd: string;
  issueId?: string;
  subject?: string;
}

/**
 * Format the commit subject for an op-* mutation. Shape:
 *   `<cmd>: <id> · <subject>`
 *
 * Each segment is optional except `cmd`. We collapse cleanly:
 *   - no issue, with subject:    `<cmd> · <subject>`
 *   - issue, no subject:         `<cmd>: <id>`
 *   - just cmd:                  `<cmd>`
 *
 * Newlines in `subject` get folded to spaces — git accepts multi-line
 * messages but the per-call audit story prefers one-liners.
 */
export function formatCommitMessage(input: CommitMessageInput): string {
  const cmd = input.cmd.trim();
  const id = input.issueId?.trim();
  const sub = input.subject?.trim().replace(/\s*\n+\s*/g, " ");
  let head = cmd;
  if (id) head = `${cmd}: ${id}`;
  if (sub) head = `${head} · ${sub}`;
  return head;
}

export interface FlushLogEntry {
  sha: string;
  subject: string;
}

export interface FlushPlan {
  // Commit immediately *before* the squash range (`reset --soft <fromExclusiveSha>`
  // lands here). The squashed commit is built on top.
  fromExclusiveSha: string;
  // Newest commit included in the squash (always log[0].sha when non-null).
  toSha: string;
  // Number of commits being squashed.
  count: number;
  // The shas being squashed, newest-first (matches git log order).
  squashedShas: string[];
}

/**
 * Compute the squash range for `op-flush-vault-history issue=<ID>`.
 *
 * Walks `log` (assumed `git log` order — index 0 is HEAD) from the top and
 * returns the run of consecutive commits whose subject contains the issue id.
 * The walk stops on the first non-matching commit; non-issue work mid-stream
 * is preserved.
 *
 * Returns `null` when:
 *   - HEAD's subject doesn't contain the issue id (nothing to flush from
 *     this tip — caller surfaces a "not at issue tip" notice), or
 *   - fewer than 2 consecutive issue commits found (single commit is already
 *     "flushed" — squashing 1 → 1 is a no-op).
 *
 * The "since the last `## Summary` write per issue" framing in the spec
 * lands naturally: `op-resolve` writes Summary as the most recent op-* call,
 * so the consecutive run includes that Summary write back through the rest
 * of the issue's WIP commits.
 */
export function computeFlushPlan(
  log: readonly FlushLogEntry[],
  issueId: string,
): FlushPlan | null {
  if (!issueId) return null;
  if (log.length === 0) return null;
  if (!subjectMentionsIssue(log[0].subject, issueId)) return null;

  let runEnd = 0;
  while (runEnd < log.length && subjectMentionsIssue(log[runEnd].subject, issueId)) {
    runEnd++;
  }
  if (runEnd < 2) return null;
  // The `from-exclusive` parent of the squash range is the first commit that
  // is *not* part of the run. If the run extends to the bottom of the log
  // window, we have no parent visible — refuse rather than guessing.
  if (runEnd >= log.length) return null;
  return {
    fromExclusiveSha: log[runEnd].sha,
    toSha: log[0].sha,
    count: runEnd,
    squashedShas: log.slice(0, runEnd).map((e) => e.sha),
  };
}

/**
 * Does the commit subject reference the given issue id? We require the id
 * to appear as a whole word — substring matches like `OP-26` matching
 * `OP-261` would mis-bracket the squash range.
 */
function subjectMentionsIssue(subject: string, issueId: string): boolean {
  if (!subject || !issueId) return false;
  // `(?<![A-Za-z0-9-])` + `(?![A-Za-z0-9])` makes the boundary tolerate the
  // hyphen *inside* the id (so OP-261 matches) but rejects extension digits
  // (OP-261 does not match OP-2611).
  const re = new RegExp(
    `(?<![A-Za-z0-9-])${escapeRegExp(issueId)}(?![A-Za-z0-9])`,
  );
  return re.test(subject);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
