---
id: review-and-merge
title: Review and merge
type: workflow-module
scope: review
order: 10
---

Before merging:

- Tests are green and the CI status check is passing.
- The PR description matches what the diff actually does (don't ship a
  diff whose summary lies about its scope).
- No untracked files belong with the change.

Merge with `gh pr merge --squash --delete-branch`. If the squash fails
locally because another worktree holds `main`, that's expected — verify
the merge landed on GitHub via `gh pr view <#> --json state,mergedAt` and
then delete the remote branch and tear down the worktree manually.
