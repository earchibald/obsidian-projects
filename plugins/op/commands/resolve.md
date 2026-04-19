---
description: "Close the currently in-progress issue — set status resolved, move to RESOLVED ISSUES/, trash TASKS notes. Pauses for user approval before moving the file. Optional args: <project-or-prefix> <N-or-ID> (defaults to the in-progress issue)."
---

Invoke the `op` skill and run the **resolve** verb with arguments: `$ARGUMENTS`.

If no arguments are provided, resolve the lowest-numbered `in-progress` issue. The skill will pause for explicit user approval before moving the file to `RESOLVED ISSUES/`. Output the three-section completion report (external changes, vault changes, manual follow-ups).
