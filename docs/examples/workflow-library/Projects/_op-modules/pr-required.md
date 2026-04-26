---
id: pr-required
title: PR-required gate
type: workflow-module
scope: review
order: 10
vars:
  - default_branch=main
  - { name: pr_title_pattern, default: "<ID>: <subject>", description: "Required PR title shape; <ID> is the issue id, <subject> is the imperative-mood summary." }
  - merge_command=gh pr merge --squash --delete-branch
---

Pull requests are required to merge to `{{vars.default_branch}}` — no
direct pushes. Title format is `{{vars.pr_title_pattern}}`; for this
issue that means a title shaped like `{{id}}: <imperative summary>`.

Before merging:

- Tests are green and the CI status check is passing.
- The PR description matches what the diff actually does (don't ship a
  diff whose summary lies about its scope).
- No untracked files belong with the change.
- Any adversarial review (see the matching review module) has been
  evaluated and addressed, or explicitly waived in the PR comments with
  a rationale.

Merge with `{{vars.merge_command}}`. If the local fast-forward fails
because another worktree holds `{{vars.default_branch}}`, that's
expected — verify the merge landed on the remote (e.g.
`gh pr view <#> --json state,mergedAt`) and then delete the remote
branch and tear down the worktree manually. The merge itself is on the
server; only the local cleanup needs the manual touch.
