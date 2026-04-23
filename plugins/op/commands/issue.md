---
description: "Start or resume work on an Obsidian vault issue. Args: <project-or-prefix> [<N-or-ID>] — e.g. JB-3, jira-bases 3, or just JB to auto-pick the lowest-numbered in-progress issue (else lowest-numbered open)."
---

Invoke the `op` skill and run the **work** verb with arguments: `$ARGUMENTS`.

When no `N-or-ID` is supplied, apply the skill's auto-pick rule: prefer the lowest-numbered `in-progress` issue in the project, else the lowest-numbered `open` issue. If multiple issues tie or nothing matches, stop and ask the user rather than guessing.

At session end, run the **resolve** verb (or invoke `/op:resolve`) to close out the issue per the skill's lifecycle rules.

Per the skill, write `## Plan` at start; append `### <ID>.<N>` blocks under `## Notes` as tasks complete.
