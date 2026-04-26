---
id: commit-mapping
title: Commit-to-issue mapping
type: workflow-module
scope: implement
order: 10
vars:
  - commit_command=op-append-commit
  - commit_field=commits
---

After every commit on this issue's branch, append the short sha and
subject to the issue note's `{{vars.commit_field}}:` list. Cadence is
**per-commit, not batched** — `{{vars.commit_field}}:` is the durable
record of what shipped, and a missing entry is a permanent gap.

Use:

```
sha=$(git rev-parse --short=7 HEAD)
sub=$(git log -1 --pretty=%s)
obsidian {{vars.commit_command}} issue={{id}} sha="$sha" subject="$sub"
```

If the command fails (vault unreachable, plugin disabled, issue file
moved mid-session), record the `<sha7> <subject>` pair in your scratch
notes and batch-append at resolve time — don't block the commit cadence
on vault health.

Skip this rule entirely for meta-only projects with no git repo.
