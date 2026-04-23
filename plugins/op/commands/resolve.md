---
description: "Close an issue — set status resolved, move to RESOLVED ISSUES/, trash TASKS notes. Pauses for user approval before moving the file. Optional args: <project-or-prefix> <N-or-ID> (defaults to the lowest-numbered in-progress issue)."
---

Invoke the `op` skill and run the **resolve** verb with arguments: `$ARGUMENTS`.

When no `N-or-ID` is supplied, apply the skill's auto-pick rule for `in-progress` issues:

- **Exactly one `in-progress` issue** → resolve it.
- **Zero `in-progress` issues** → stop and ask the user which issue to resolve (do not silently fall through to `open` — resolving an open issue without work being done is almost always wrong).
- **More than one `in-progress` issue** → stop and ask the user to pick one; do not default to the lowest-numbered.

The skill will pause for explicit user approval before moving the file to `RESOLVED ISSUES/`. Output the three-section completion report (external changes, vault changes, manual follow-ups).

Per the skill, write `## Summary` before the confirmation pause.
