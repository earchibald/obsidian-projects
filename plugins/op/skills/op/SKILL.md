---
name: op
description: Run the Obsidian Projects workflow — scaffold new projects, create/work/resolve issues, and maintain schema-conformant notes in an Obsidian vault that follows the Projects schema. Use whenever the user invokes /op:* commands, references an Obsidian project by slug or ID prefix (e.g. JB-3, TMB-9, OP-11), or edits files under `Projects/<slug>/ISSUES|TASKS|DOCS|RESOLVED ISSUES/`.
---

# Obsidian Projects (op) workflow

You are operating on an Obsidian vault that uses the **Projects schema**: a Jira-lite issue tracker where each project is a folder under `Projects/` and each issue/task/doc is a markdown note with structured frontmatter. This skill is the authoritative reference for that workflow.

Before touching the vault, invoke the **`obsidian:obsidian-cli`** skill — it provides the CLI syntax for `property:set`, `move`, `delete`, `create`, etc. Do not guess CLI arguments.

---

## Verbs

All operations fall into one of four verbs. Slash commands (`/op:scaffold`, `/op:new`, `/op:issue`, `/op:resolve`) are thin entry points into these:

| Verb | Purpose | Typical trigger |
| :--- | :--- | :--- |
| **scaffold** | Create a new project folder with base, STATUS, and frontmatter | `/op:scaffold <slug> <PREFIX> [title]` |
| **new** | Create a new issue in an existing project | `/op:new <project-or-prefix> [description]` |
| **work** | Start work on an existing issue (lifecycle, TASKS, resolve) | `/op:issue <project-or-prefix> [N]` |
| **resolve** | Close the in-progress issue (set status, move file, trash tasks) | `/op:resolve` (or tail end of `work`) |

Each verb shares the same prerequisites: read the schema (inline below or via `reference/schema.md` for the full version), understand the project's vault state, and confirm before external actions.

---

## Schema (inline summary)

Full version: [`reference/schema.md`](reference/schema.md). The summary below is enough for most operations.

### Folder layout per project

```
Projects/<project-slug>/
  ISSUES/           ← open issues
  RESOLVED ISSUES/  ← closed issues (moved here on completion)
  TASKS/            ← subtask notes (deleted on completion)
  DOCS/             ← specs, plans, ADRs, runbooks
  <project>.base    ← Bases dashboard
  STATUS.md         ← embeds open-issues view + declares `prefix:`
```

### Frontmatter — ISSUES / RESOLVED ISSUES

```yaml
---
id: <PREFIX>-<N>         # e.g. JB-2 — stable, never changes
project: <slug>          # e.g. jira-bases
type: issue
status: open | in-progress | blocked | resolved | wontfix
priority: low | med | high
created: YYYY-MM-DD
resolved:                # set on resolve/wontfix
assignee: <github-handle>
commits:                 # optional; appended during work — see `work` verb
  - <sha7> <subject>
pr:                      # optional; PR or MR URL
tags:
  - project/<slug>
  - issue
---
```

Filename: `<PREFIX>-<N> <short-slug>.md`. Example: `JB-2 prepend id to issue filenames.md`.

`commits:` and `pr:` live on the issue (not the task) so the git trail survives the trashing of TASKS on resolve, and lands in `RESOLVED ISSUES/` as a permanent record. Both optional; leave unset for meta-only projects with no code repo.

### Frontmatter — TASKS

```yaml
---
id: <ISSUE-ID>.<N>       # e.g. JB-2.1
issue: "[[<issue-filename-no-ext>]]"
project: <slug>
type: task
status: pending | in-progress | completed | blocked
tags:
  - project/<slug>
  - task
---
```

Lifecycle: create at session start, **trash** when the parent issue resolves.

### Frontmatter — DOCS

```yaml
---
project: <slug>
type: doc
doc_type: spec | plan | adr | runbook
issue: "[[<issue-filename-no-ext>]]"   # optional
created: YYYY-MM-DD
status: draft | accepted | superseded
tags:
  - project/<slug>
  - doc
---
```

DOCS are **never** trashed on issue completion.

### STATUS.md

Every project root has a `STATUS.md`:

```markdown
---
project: <slug>
prefix: <PREFIX>
type: project-status
---
![[<slug>.base#Open Issues]]
```

The `prefix:` field is the canonical location of the project's ID prefix — always read it from there.

### Base dashboard

Every project has `<project>.base` with at minimum: Open Issues, Board, Tasks by Issue, Resolved Log, Docs Index. Copy `Projects/jira-bases/jira-bases.base` as the reference implementation.

### Issue ID numbering

`<PREFIX>-<N>`:
- **Prefix** comes from `STATUS.md` frontmatter. Fall back to scanning existing filenames only for legacy projects.
- **N** = max existing N across `ISSUES/` + `RESOLVED ISSUES/`, plus 1.

---

## CLI gotchas

- `obsidian move` destination is `to=<path>` (not `dest=`). Full: `obsidian move path=<src> to=<dst>`.
- `obsidian create` forces `.md`. For `.base` / `.canvas`, use the Write tool against the vault path directly.
- `obsidian <subcommand> --help` creates a note called `Untitled N.md` (the CLI treats `--help` as content). Use `obsidian help` at the top level only; rely on the `obsidian:obsidian-cli` skill for subcommand syntax.
- `obsidian search query="prefix: <PREFIX>"` fails with `Error: Operator "prefix" not recognized`. The CLI parses a leading `<word>:` as a search operator, so it collides with any frontmatter-style query. For prefix → slug lookups, scan `Projects/*/STATUS.md` frontmatter directly instead of using search.
- `obsidian search` can fail wholesale with `ENOENT: no such file or directory, open '<stale-path>'` when a single entry in the vault index points at a moved or deleted file. Recovery: restart Obsidian or force a reindex. The `op` skill must not depend on `obsidian search` for correctness — use filesystem scans for deterministic lookups.

---

## Verb: scaffold

Args: `<slug> <PREFIX> [<title>]`. Creates a new project folder.

1. Validate: slug lowercase + hyphens, `Projects/<slug>/` does not exist.
2. Read `reference/schema.md` (if you haven't) and `Projects/jira-bases/jira-bases.base` as reference.
3. Write:
   - `Projects/<slug>/<slug>.base` — derived from jira-bases, with `file.inFolder("Projects/<slug>")` and `project == "<slug>"`.
   - `Projects/<slug>/STATUS.md` — frontmatter with `prefix: <PREFIX>`, body `![[<slug>.base#Open Issues]]`.
   - Optional seed issue `<PREFIX>-1` only if `<title>` was supplied.
4. Report: files created, note that TASKS/ and RESOLVED ISSUES/ materialize on first use, suggest `/op:new <slug>` next.

---

## Verb: new

Args: `<project-or-prefix> [description]`. Creates a new issue.

1. **Resolve project**: if first token matches a `Projects/*/` folder, use as slug; else treat as PREFIX and resolve by **direct scan** — read every `Projects/*/STATUS.md` and pick the one whose frontmatter `prefix:` equals `<PREFIX>`. Legacy fallback: scan existing `Projects/*/ISSUES/<PREFIX>-*.md` filenames. Do **not** use `obsidian search` here — it collides with the `prefix:` operator syntax and can crash on a stale index (see CLI gotchas).
2. **Read prefix**: `obsidian property:read name=prefix path="Projects/<slug>/STATUS.md"`. Legacy fallback: scan existing issue filenames. If unknown, ask user; once supplied, write to STATUS.md with `property:set name=prefix value=<PREFIX> path="Projects/<slug>/STATUS.md"` before continuing.
3. **Next N**: max N across `ISSUES/` + `RESOLVED ISSUES/` + 1. Start at 1 if none.
4. **Gather scope** based on description length:
   - **None** → ask interactively: title, priority (default `med`), scope bullets (optional).
   - **Brief** (≤~140 chars) → propose title, filename slug, priority guess, 2–5 bullet checklist. Confirm.
   - **Detailed** (multi-line) → propose title, filename slug, priority, summary paragraph + checklist. Preserve explicit acceptance criteria verbatim. Confirm.
5. **Always confirm** before writing, even in auto mode. Issue creation is a commitment artifact.
6. **Write** via `obsidian create … silent`:
   - Path: `Projects/<slug>/ISSUES/<PREFIX>-<N> <slug-from-title>.md`
   - Frontmatter: schema-conformant, `status: open`, `assignee: earchibald` unless overridden.
   - Body: `# <Title>` + scope.
7. **Do not** set `status: in-progress` — that's the `work` verb.
8. Report: file path + suggest `/op:issue <PREFIX>-<N>`.

---

## Verb: work (issue)

Args: `<project-or-prefix> [<N-or-ID>]`. Resume or start work on an issue.

### Resolve the issue file

- Accept any of: `jira-bases 3`, `jira-bases JB-3`, `JB 3`, `JB-3`, or `jira-bases` / `JB` alone (auto-pick next).
- Prefix → slug: **direct scan** — read every `Projects/*/STATUS.md` and pick the one whose frontmatter `prefix:` equals `<PREFIX>`. Legacy fallback: scan `Projects/*/ISSUES/<PREFIX>-*.md` and `Projects/*/RESOLVED ISSUES/<PREFIX>-*.md`. If multiple matches: stop and ask. Do **not** use `obsidian search` here — it collides with the `prefix:` operator syntax and can crash on a stale index (see CLI gotchas).
- With N: find filename starting with `<PREFIX>-<N> ` in `ISSUES/` then `RESOLVED ISSUES/`.
- Without N: prefer lowest-numbered `status: in-progress`; else lowest-numbered `open`; else stop and report.

### Start

1. Set `status: in-progress` on the issue.
2. **If body is empty or one line**: scope is ambiguous — state your interpretation and confirm before implementing, even in auto mode.
3. **Reconcile scope vs. reality**: re-read scope and check each item against current repo/vault state. Skip items already satisfied; don't redo done work.
4. **Verify plugin dependencies** (Templater, Dataview, etc.) before implementing: `obsidian eval code='Object.keys(app.plugins.plugins)'`. If missing, note as manual follow-up; proceed only if the deliverable is still useful without.
5. **Flag stale schema**: if schema contradicts observed vault state (filename convention drifted, etc.), surface the discrepancy.
6. Create TASKS notes in `Projects/<slug>/TASKS/` — one per logical subtask. Optional for trivial single-step issues.
7. Confirm before any action affecting shared systems (GitHub push, release, deploy, external API).

### Track git refs as work lands

After each commit that advances the in-progress issue, append `<sha7> <subject>` to the issue's `commits:` list. When a PR is opened for the issue, set `pr:` to the URL.

```bash
# After committing:
sha=$(git -C <repo> rev-parse --short=7 HEAD)
sub=$(git -C <repo> log -1 --pretty=%s)
# Then via obsidian-cli, append to the issue's commits list.
```

The trail lives on the issue so it survives TASKS being trashed at resolve time. Skip this step for meta-only projects with no git repo.

### Finish

See the **resolve** verb below.

---

## Verb: resolve

Close the in-progress issue.

1. **Stop and get explicit user approval before making any changes.** Show the user the planned lifecycle transition:
   - Source → target: `Projects/<slug>/ISSUES/<filename>` → `Projects/<slug>/RESOLVED ISSUES/<filename>`
   - Frontmatter change: `status` → `resolved` (or `wontfix`), `resolved` → `<today>`
   - TASKS notes to trash: list each path, or "(none)"
   - `commits:` status: "set" / "empty — will back-fill from git log" / "empty — skipping (no repo)"
   Proceed only after the user confirms. This gate applies even in auto mode — moving an issue to `RESOLVED ISSUES/` is the closing commitment and must not be implicit.
2. **Back-fill git refs if missing.** If the project has a git repo and the issue's `commits:` list is empty, offer to back-fill before moving. Scan `git log` for commits whose message references the issue id (e.g. `(OP-14)` or the issue number) since the last resolved-issue date, and append each `<sha7> <subject>` to `commits:`. Skip for meta-only projects with no repo.
3. Set issue `status: resolved`, `resolved: <today>`.
4. `obsidian move` the issue to `Projects/<slug>/RESOLVED ISSUES/`.
5. Delete TASKS notes via `obsidian delete` (trash, not permanent).
6. **Do NOT delete DOCS.**
7. Output:
   1. External changes (URLs, commands run)
   2. Vault changes (files moved/created/deleted)
   3. Manual follow-ups for the user

For `wontfix`, same flow but set `status: wontfix`.

---

## Cross-project surfaces

The `Projects/` root holds aggregate views that span every project — **leave them alone when scaffolding or cleaning up**:

- `Projects/all-projects.base` — filtered to `file.inFolder("Projects") && type != "schema"`.
- `Projects/All Projects.md` — status surface embedding the cross-project views.

New projects are picked up automatically by any note with a `project` frontmatter key under `Projects/`.

---

## DOCS folder: superpowers symlink

Projects with a code repo keep `DOCS/superpowers/` as a symlink into the repo's `docs/superpowers/` tree. The repo is canonical for everything under `superpowers/`; vault-only docs (project logs, prompt libraries) live directly in `DOCS/` alongside the symlink.

One-time setup:

```bash
mkdir -p <vault>/Projects/<slug>/DOCS
ln -s <repo>/docs/superpowers <vault>/Projects/<slug>/DOCS/superpowers
```

Post-setup reconciliation (Obsidian won't index files inside a mid-session symlink):

```bash
obsidian vault="<vault>" eval code='(async()=>{const a=app.vault.adapter;const base="Projects/<slug>/DOCS/superpowers";for(const sub of ["plans","specs","research","testing"]){await a.reconcileFolderCreation(base+"/"+sub, base+"/"+sub);}})()'
```

Writing docs:
- Repo-tracked (`doc_type: plan|spec|adr|runbook` tied to code work) → `DOCS/superpowers/{plans,specs,…}/`.
- Vault-only → directly under `DOCS/`.

Meta-only projects (no code repo) keep a plain `DOCS/` folder with no symlink.
