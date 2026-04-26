---
id: branching
title: Branching discipline
type: workflow-module
scope: kickoff
order: 10
---

Always create a feature branch off `main` before making changes — no
exceptions, including one-line tweaks. Branch names use
`<issue-id>-<slug>` (e.g. `OP-212-author-tutorials`). Push commits to that
branch only; never directly to `main`.

If you're working on a delegated issue and the main checkout is held by
another agent, isolate further by creating a git worktree first. The
delegating agent's checkout and yours can coexist as long as you don't
share the same working tree.
