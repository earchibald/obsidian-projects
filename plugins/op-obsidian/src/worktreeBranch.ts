// Worktree-branch name construction — single source of truth for the
// `worktree-<id>[-<slug>]` convention. Consumes the same `slugify` preset as
// the `{{slug}}` plugin var (caseFold + maxLen 40 + leading-task-prefix strip)
// so the descriptive tail an agent sees inline in modules matches the branch
// produced here.
//
// Returns bare `worktree-<id>` (no trailing dash) when `title` slugs to empty
// — all-punctuation, whitespace-only, or empty input. That fallback preserves
// the existing convention for unlabeled or just-created issues. Extracted in
// OP-225.
import { slugify } from "./slug";

export function worktreeBranchName(issueId: string, title: string | undefined): string {
  const slug = slugify(title ?? "", {
    caseFold: true,
    maxLen: 40,
    stripLeadingTaskPrefix: true,
  });
  return slug ? `worktree-${issueId}-${slug}` : `worktree-${issueId}`;
}
