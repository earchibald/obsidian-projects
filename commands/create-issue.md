Create a new issue in an Agent-Vault project. Arguments: `$ARGUMENTS` (format: `<project-or-prefix> [<description>]`, e.g. `jira-bases`, `JB fix link escaping in code blocks`, `tts-me-baby "detailed multi-paragraph spec..."`).

## Setup

- **Invoke the `obsidian:obsidian-cli` skill before any vault interaction** — don't guess command names.
- **CLI gotchas worth memorizing:**
  - `obsidian move` destination is `to=<path>` (not `dest=`). Full form: `obsidian move path=<src> to=<dst>`.
  - `obsidian create` is markdown-only — it forces a `.md` extension. For non-`.md` files, use the Write tool.
- Vault: Agent-Vault
- Vault path: /Users/earchibald/work/Agent-Vault
- Schema doc: Projects/Projects schema.md (authoritative — read it if you haven't already this session)

## Step 1 — Parse arguments

Split `$ARGUMENTS` on the first whitespace:
- **First token** = project slug (`jira-bases`) or ID prefix (`JB`). Resolve the same way `/issue` does:
  - If it matches a folder under `Projects/`, use as slug.
  - Otherwise treat as a prefix: find any file matching `Projects/*/ISSUES/<PREFIX>-*.md` or `Projects/*/RESOLVED ISSUES/<PREFIX>-*.md`; the enclosing folder is the slug.
  - If no match, stop and ask the user.
- **Remaining text** (optional) = description. Classify by length:
  - **None** → interactive mode.
  - **Brief** (≤ ~140 chars, no newlines) → propose + confirm.
  - **Detailed** (multi-line, or substantially longer) → structure + confirm.

## Step 2 — Determine the ID prefix and next number

- Read the prefix from any existing issue filename under `Projects/<slug>/ISSUES` or `Projects/<slug>/RESOLVED ISSUES`. Filenames always begin with `<PREFIX>-<N> `.
- If the project has no existing issues, ask the user for the prefix.
- Next `N` = max existing `N` across both folders + 1. Start at 1 if none.

## Step 3 — Gather scope (interact with the user)

**Interactive mode (no description):**
Ask for, in order:
1. One-sentence title.
2. Priority (`low` / `med` / `high`) — default `med` if they don't care.
3. Scope — a short bulleted list of deliverables or acceptance criteria. Offer to skip if the title is self-explanatory.

**Brief mode:**
Propose back to the user:
- Title (cleaned up from the brief).
- Filename slug (lowercase, hyphenated, derived from title; keep under ~8 words).
- Priority guess (default `med` unless the wording implies urgency).
- A 2–5 bullet scope checklist inferred from the brief.

Wait for confirmation or edits before writing.

**Detailed mode:**
Propose back:
- Title.
- Filename slug.
- Priority guess.
- Body structure: a short summary paragraph + a checklist of deliverables extracted from the detailed text. Preserve any explicit acceptance criteria verbatim.

Wait for confirmation or edits before writing.

**Always confirm before writing the file**, even in auto mode. Issue creation is a commitment artifact — a wrong title or misread scope lingers.

## Step 4 — Write the issue file

Filename: `Projects/<slug>/ISSUES/<PREFIX>-<N> <slug-from-title>.md`

Frontmatter (schema-conformant):

```yaml
---
id: <PREFIX>-<N>
project: <slug>
type: issue
status: open
priority: <low|med|high>
created: <YYYY-MM-DD>
assignee: <github-handle>   # default: earchibald unless user says otherwise
tags:
  - project/<slug>
  - issue
---
```

Body:
- `# <Title>` H1.
- Agreed scope (checklist, paragraphs, or both — whatever the user confirmed).

Use `obsidian create` with `silent` so the file doesn't auto-open.

**Do not set `status: in-progress`.** This command only creates. `/issue` handles the work lifecycle.

## Step 5 — Report

Output:
1. **Vault changes** — the file path created.
2. **Next step** — suggest `/issue <PREFIX>-<N>` to start work on it.
