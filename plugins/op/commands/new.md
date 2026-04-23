---
description: "Create a new issue in an existing project. Args: <project-or-prefix> [description] — e.g. JB fix link escaping, or just jira-bases for interactive mode."
---

Invoke the `op` skill and run the **new** verb with arguments: `$ARGUMENTS`.

Follow the skill's description-length routing: none → interactive prompt; brief (≤ 140 chars, single line) → propose title, priority guess, and a 2–5 bullet checklist; detailed (> 140 chars or multi-line) → propose title, priority, summary paragraph, and checklist, preserving any explicit acceptance criteria verbatim. Always pause for explicit user confirmation before writing the file, even in auto mode — issue creation is a commitment artifact. Sanitize the filename per the skill's Filename sanitization rules — Obsidian rejects `# ^ [ ] | \ / : ? " < > *` in note names and the raw title must never be passed straight to `obsidian create`.
