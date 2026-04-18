Scaffold a new project in the Agent-Vault schema. Arguments: `$ARGUMENTS` (format: `<slug> <ID-PREFIX> [<title>]`, e.g. `jira-bases JB "Jira-style bases for Obsidian"`).

## Setup

- **Invoke the `obsidian:obsidian-cli` skill before any vault interaction** — don't guess command names.
- **CLI gotchas worth memorizing:**
  - `obsidian move` destination is `to=<path>` (not `dest=`). Full form: `obsidian move path=<src> to=<dst>`.
  - `obsidian create` is markdown-only — it forces a `.md` extension. For non-`.md` files (`.base`, `.canvas`, etc.), use the Write tool against the vault path directly.
- Vault: Agent-Vault
- Vault path: /Users/earchibald/work/Agent-Vault
- Schema doc: Projects/Projects schema.md (read this before scaffolding; it is authoritative)
- Reference implementation: `Projects/jira-bases/jira-bases.base` and `Projects/jira-bases/STATUS.md`

## Step 1 — Parse & validate

Parse `$ARGUMENTS`:
- `<slug>` — lowercase, hyphenated, used as folder name and in tags (e.g. `jira-bases`).
- `<ID-PREFIX>` — short uppercase key used as issue ID prefix (e.g. `JB`).
- `<title>` — optional human-readable title for the base/STATUS header.

Refuse if:
- The slug has spaces or uppercase letters.
- `Projects/<slug>/` already exists (check with `obsidian files folder="Projects/<slug>"` — if it returns any entries, stop and ask the user whether to overwrite).

## Step 2 — Read schema

```bash
obsidian vault="Agent-Vault" read path="Projects/Projects schema.md"
obsidian vault="Agent-Vault" read path="Projects/jira-bases/jira-bases.base"
```

Match the reference base file's structure exactly. If the schema has changed since this prompt was written, follow the schema, not the reference.

## Step 3 — Scaffold

Obsidian folders are implicit — they come into existence when a file is created in them. Create these files (folders will follow):

1. **`Projects/<slug>/<slug>.base`** — copy the jira-bases base file, substituting:
   - `file.inFolder("Projects/<slug>")`
   - `project == "<slug>"`
   - Keep all five standard views: Open Issues, Board, Tasks by Issue, Resolved Log, Docs Index.

2. **`Projects/<slug>/STATUS.md`** — frontmatter + body. The `prefix` field is the canonical location of the project's ID prefix; write it here at scaffold time so future `/issue` and `/create-issue` runs don't have to guess.
   ```
   ---
   project: <slug>
   prefix: <ID-PREFIX>
   type: project-status
   ---
   ![[<slug>.base#Open Issues]]
   ```

3. **Placeholder files to materialize subfolders** — the schema requires `ISSUES/`, `RESOLVED ISSUES/`, `TASKS/`, `DOCS/`. Obsidian has no mkdir. Options:
   - Simplest: skip placeholders. Folders appear when the first real file lands there. Mention this in the summary so the user isn't surprised.
   - Alternative: create a first placeholder issue `<PREFIX>-1 getting started.md` with schema-conformant frontmatter (`status: open`, `priority: low`, `created: <today>`). Only do this if the user supplied a `<title>` or explicitly asked for a seed issue.

## Step 4 — Report

Output:
1. **Vault changes** — files created, with paths.
2. **Schema notes** — if any subfolders were left unmaterialized, call that out: "TASKS/ and RESOLVED ISSUES/ will appear on first use."
3. **Next step for the user** — suggest `/issue <slug>` once they've added an issue, or offer to create the first issue now.
