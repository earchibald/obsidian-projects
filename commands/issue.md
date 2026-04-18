Work on an Obsidian vault issue. Arguments: `$ARGUMENTS` (format: `<project-or-prefix> [<issue-number-or-id>]`, e.g. `jira-bases 3`, `jira-bases JB-3`, `JB 3`, `JB-3`, or just `jira-bases` / `JB` to auto-pick the next open issue).

## Setup

- **Invoke the `obsidian:obsidian-cli` skill before any vault interaction** in this command — it provides the CLI syntax for `property:set`, `move`, `delete`, `create`, etc. Don't guess command names.
- **CLI quirk:** `obsidian <subcommand> --help` creates a note called `Untitled N.md` in the vault root (the CLI treats `--help` as content). Use `obsidian help` at the top level only; for subcommand syntax, rely on the skill docs.
- **CLI gotchas worth memorizing:**
  - `obsidian move` destination is `to=<path>` (not `dest=`). Full form: `obsidian move path=<src> to=<dst>`.
  - `obsidian create` is markdown-only — it forces a `.md` extension. For non-`.md` files (`.base`, `.canvas`, etc.), use the Write tool against the vault path directly.
- Vault: Agent-Vault
- Vault path: /Users/earchibald/work/Agent-Vault
- Schema doc: Projects/Projects schema.md

## Step 1 — Resolve the issue file

Parse `$ARGUMENTS`:
- First token = project slug (e.g. `jira-bases`) **or** an ID-PREFIX abbreviation (e.g. `JB`). A token is treated as a prefix when it is all-uppercase letters with no hyphens and does not match a folder under `Projects/`.
- Second token (optional) = issue reference: either a bare number (`3`) or a full ID (`JB-3`).
- **Shorthand:** a single token like `JB-3` (ID-PREFIX + `-N`) is equivalent to `JB 3` — split on the hyphen.

**Resolving a prefix to a slug:** the canonical source is the `prefix:` field in each project's `STATUS.md` frontmatter (per schema). Preferred approach:

```bash
obsidian vault="Agent-Vault" search query="prefix: <PREFIX>"
```

Match the result whose path is `Projects/<slug>/STATUS.md` — the enclosing folder name is the slug.

**Legacy fallback:** if no STATUS.md declares the prefix, look for any file matching `Projects/*/ISSUES/<PREFIX>-*.md` or `Projects/*/RESOLVED ISSUES/<PREFIX>-*.md` and use the enclosing folder. If multiple projects share a prefix (shouldn't happen, but possible), stop and ask the user.

List the issues folder:

```bash
obsidian vault="Agent-Vault" files folder="Projects/<slug>/ISSUES"
```

**If an issue reference was provided:** extract the numeric part N and find the file whose filename prefix matches `<PROJECT>-<N> ` (e.g. `JB-3 `). Also check `Projects/<slug>/RESOLVED ISSUES` if not found. Do not require the user to supply the slug portion of the filename.

**If only the project was provided:** select the NEXT issue to work on by reading frontmatter of each file in `Projects/<slug>/ISSUES`:

1. **Prefer `in-progress`** — if any issue has `status: in-progress`, pick the lowest-numbered one (resuming abandoned work beats starting new). Check `TASKS/` for stale task notes belonging to it and either resume them or clean up.
2. **Otherwise pick the lowest-numbered `open` issue.**
3. If neither exists, stop and report to the user.

## Step 2 — Read schema and issue

```bash
obsidian vault="Agent-Vault" read path="Projects/Projects schema.md"
obsidian vault="Agent-Vault" read path="<resolved-issue-path>"
```

Follow the schema exactly for all TASKS, DOCS, and status lifecycle.

## Step 3 — Work the issue

- Set issue `status: in-progress`.
- **If the issue body is empty or a single line**, the scope is ambiguous. State your interpretation back to the user and confirm before implementing — even in auto mode. A terse title is not a mandate.
- **Reconcile scope vs. reality first:** re-read the issue scope and check each item against the current repo/vault state. Some items may already be satisfied (schema already documents the pattern, file already exists, etc.) — note these and skip. Don't redo done work.
- **Verify plugin dependencies up front.** If the issue depends on a community plugin (Templater, Dataview, etc.), check it's installed before implementing — otherwise you'll ship something the user can't run. Example: `obsidian eval code='Object.keys(app.plugins.plugins)'`. If missing, note it as a manual follow-up and proceed only if the deliverable is still useful without it.
- **Flag stale schema.** If the schema doc contradicts observed vault state (e.g. filename convention drifted because a prior issue changed it), surface the discrepancy to the user rather than silently following the stale rule.
- Create TASKS notes in `Projects/<slug>/TASKS/` — one per logical subtask. For trivial single-step issues, a task note is optional.
- Confirm with the user before any action that affects shared systems (GitHub push, release, deploy, external API).

## Step 4 — On completion

- Set issue `status: resolved`, `resolved: <today>`.
- Move issue to `Projects/<slug>/RESOLVED ISSUES/`.
- Trash TASKS notes via `obsidian delete` (do not trash DOCS).
- Output:
  1. External changes (URLs, commands run)
  2. Vault changes (files moved/created/deleted)
  3. Manual follow-ups for the user
