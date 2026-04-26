---
id: branching
title: Branching discipline
type: workflow-module
scope: kickoff
order: 10
vars:
  - default_branch=main
  - branch_strategy=worktree
---

Always isolate work from `{{vars.default_branch}}` before making changes
— even one-line tweaks. The branch strategy for this project is
`{{vars.branch_strategy}}`:

- `worktree` — create an isolated git worktree (e.g. via your harness's
  `EnterWorktree` tool, or `git worktree add`). The delegating agent's
  checkout and yours can coexist on the same repo without conflict.
- `feature-branch` — create a feature branch off
  `{{vars.default_branch}}` and push only to that branch. Never push
  directly to `{{vars.default_branch}}`.

Override `vars.branch_strategy` in your project's `STATUS.md` `vars:`
block (project scope) if your team prefers feature branches over
worktrees. The default is `worktree` because it's the only strategy that
lets multiple agents work on the same checkout in parallel without
fighting over `HEAD`.
