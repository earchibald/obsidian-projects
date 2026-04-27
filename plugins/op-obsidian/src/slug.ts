// Shared slugify util — single source of truth for "non-alphanum runs → `-`,
// collapse, trim". Two presets in the codebase consume it today:
//
//   * tmux window naming (`tmuxWindowName`) — case-preserving, allows `_`,
//     no length cap, fallback `"agent"`.
//   * `{{slug}}` plugin var (PLUGIN_VAR_REGISTRY) — case-folded, kebab-only,
//     length-capped at 40, optional task-prefix stripping.
//
// Defaults are conservative: case-preserving, kebab-only, no cap, no fallback.
// Each preset opts into the behavior it needs. Extracted in OP-220.

export interface SlugifyOpts {
  /** Lower-case the output. When set, the post-fold char class is `[^a-z0-9(_)-]+`. */
  caseFold?: boolean;
  /** Permit `_` to survive into the output (otherwise `_` is a word boundary like any other punct). */
  allowUnderscore?: boolean;
  /** Hard cap on output length. Truncates at the last `-` boundary inside the cap when one exists; otherwise truncates flat. */
  maxLen?: number;
  /** Strip a leading `NN[a-z]?:` task-prefix (e.g. `10b:`, `1:`) before slugifying. */
  stripLeadingTaskPrefix?: boolean;
  /** Returned when the input collapses to empty after slugification. Default `""`. */
  fallback?: string;
}

export function slugify(input: string, opts: SlugifyOpts = {}): string {
  const {
    caseFold = false,
    allowUnderscore = false,
    maxLen,
    stripLeadingTaskPrefix = false,
    fallback = "",
  } = opts;

  let s = input ?? "";
  if (stripLeadingTaskPrefix) {
    s = s.replace(/^\s*\d+[a-z]?\s*:\s*/i, "");
  }
  if (caseFold) s = s.toLowerCase();

  const alpha = caseFold ? "a-z" : "A-Za-z";
  const underscore = allowUnderscore ? "_" : "";
  const charClass = new RegExp(`[^${alpha}0-9${underscore}-]+`, "g");

  s = s.replace(charClass, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  if (maxLen != null && s.length > maxLen) {
    let truncated = s.slice(0, maxLen);
    const lastDash = truncated.lastIndexOf("-");
    if (lastDash > 0) truncated = truncated.slice(0, lastDash);
    s = truncated.replace(/^-+|-+$/g, "");
  }

  return s || fallback;
}
