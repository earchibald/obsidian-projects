---
description: "Scaffold a new Obsidian Projects project (folder, base, STATUS.md). Args: <slug> <PREFIX> [title] — e.g. jira-bases JB Jira-style bases. Optional priority and scope are gathered interactively when a title is supplied."
---

Invoke the `op` skill and run the **scaffold** verb with arguments: `$ARGUMENTS`.

Follow the skill's scaffold rules: validate the slug (lowercase + hyphens; `Projects/<slug>/` must not exist), ask for an absolute `repo_path` when the project has a code repo, and only seed the first issue (`PREFIX-1`) when a title is supplied. Confirm with the user before mutating the vault.
