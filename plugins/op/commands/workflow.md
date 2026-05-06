---
description: "Return WORKFLOW.md or compiled workflow for a project. Args: <PROJECT|PREFIX> — e.g. OP or obsidian-projects."
---

Invoke the `op` skill and run the **workflow** verb with arguments: `$ARGUMENTS`.

Read-only. Resolves the project from a slug (folder name under Projects/) or an issue-ID prefix (e.g. OP → obsidian-projects). Returns the project's WORKFLOW.md content (legacy mode) or the compiled modular workflow (modules mode), depending on the `workflowMode` setting.
