---
description: "Create a new issue in an existing project. Args: <project-or-prefix> [description] — e.g. JB fix link escaping, or just jira-bases for interactive mode."
---

Invoke the `op` skill and run the **new** verb with arguments: `$ARGUMENTS`.

Follow the skill's description-length routing (none → interactive, brief → propose, detailed → structure + confirm). Always confirm before writing the file, even in auto mode. Sanitize the filename per the skill's Filename sanitization rules — Obsidian rejects `# ^ [ ] | \ / : ? " < > *` in note names and the raw title must never be passed straight to `obsidian create`.
