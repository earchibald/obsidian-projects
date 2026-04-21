---
name: op
description: Run the Obsidian Projects workflow — scaffold new projects, create/work/resolve issues, and maintain schema-conformant notes in an Obsidian vault that follows the Projects schema. Use whenever the user invokes /op:* commands, references an Obsidian project by slug or ID prefix (e.g. JB-3, TMB-9, OP-11), or edits files under `Projects/<slug>/ISSUES|TASKS|DOCS|RESOLVED ISSUES/`.
---

# Obsidian Projects (op) workflow

You are operating on an Obsidian vault that uses the **Projects schema**: a Jira-lite issue tracker where each project is a folder under `Projects/` and each issue/task/doc is a markdown note with structured frontmatter. This skill is the authoritative reference for that workflow.

Before touching the vault, invoke the **`obsidian:obsidian-cli`** skill — it provides the CLI syntax for `property:set`, `move`, `delete`, `create`, etc. Do not guess CLI arguments.

---

## Finding the vault

Do not guess the vault path or search the filesystem for it. Use the Obsidian CLI:

- `obsidian vault` — prints `name` and `path` of the currently active vault (tab-separated).
- `obsidian vaults` — lists all known vault names, one per line. Pair with `obsidian vault=<name>` to target a specific one and read its `path`.

Run this once at the start of any `op` operation if you don't already know the vault path; cache it for the rest of the session. All `<vault>` placeholders in this skill refer to that path.

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
version:                 # optional; semver string set at resolve — see `work` verb
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

## Filename sanitization

Issue filenames are derived from the user-supplied title: `<PREFIX>-<N> <sanitized-title>.md`. Obsidian rejects certain characters in note names — passing them straight to `obsidian create` fails with a cryptic error (see OP-15). Always sanitize before writing, and show the final filename in the confirm step so the user can adjust it.

Rules (apply in order to the title portion only, never to `<PREFIX>-<N>`):

1. **Replace** each character in `# ^ [ ] | \ / : ? " < > *` with a single space.
2. **Collapse** runs of whitespace into a single space.
3. **Trim** leading/trailing whitespace and periods (filesystems dislike trailing `.`).
4. **Truncate** to 80 characters; if the truncation lands mid-word, cut back to the previous space.
5. If the result is empty, fall back to the id alone: `<PREFIX>-<N>.md`.

Preserve case, hyphens, commas, and apostrophes — the goal is readable titles, not aggressive kebab-casing. Existing filenames in the vault show the convention: `OP-14 skill update, task work should include tracking of work done with gitrefs.md`.

Apply the same rules to any seed-issue title passed to `scaffold`.

---

## CLI gotchas

- `obsidian move` destination is `to=<path>` (not `dest=`). Full: `obsidian move path=<src> to=<dst>`.
- `obsidian create` forces `.md`. For `.base` / `.canvas`, use the Write tool against the vault path directly.
- `obsidian <subcommand> --help` creates a note called `Untitled N.md` (the CLI treats `--help` as content). Use `obsidian help` at the top level only; rely on the `obsidian:obsidian-cli` skill for subcommand syntax.
- `obsidian search query="prefix: <PREFIX>"` fails with `Error: Operator "prefix" not recognized`. The CLI parses a leading `<word>:` as a search operator, so it collides with any frontmatter-style query. For prefix → slug lookups, scan `Projects/*/STATUS.md` frontmatter directly instead of using search.
- `obsidian search` can fail wholesale with `ENOENT: no such file or directory, open '<stale-path>'` when a single entry in the vault index points at a moved or deleted file. Recovery: restart Obsidian or force a reindex. The `op` skill must not depend on `obsidian search` for correctness — use filesystem scans for deterministic lookups.
- **There is no `property:add` / `property:append`.** The CLI exposes only `property:read`, `property:set`, and `property:remove`. To append to a list-valued property (e.g. `commits:`), read the current list, append in memory, and rewrite the whole list via `property:set name=<k> value='["item1","item2",...]' type=list path=<file>`. Guessing `property:add` fails with `Error: Command "property:add" not found. Did you mean: property:set, property:read?`.

---

## Verb: scaffold

Args: `<slug> <PREFIX> [<title>]`. Creates a new project folder.

1. Validate: slug lowercase + hyphens, `Projects/<slug>/` does not exist.
2. Read `reference/schema.md` (if you haven't) and `Projects/jira-bases/jira-bases.base` as reference.
3. Write:
   - `Projects/<slug>/<slug>.base` — derived from jira-bases, with `file.inFolder("Projects/<slug>")` and `project == "<slug>"`.
   - `Projects/<slug>/STATUS.md` — frontmatter with `prefix: <PREFIX>`, body `![[<slug>.base#Open Issues]]`.
   - Optional seed issue `<PREFIX>-1` only if `<title>` was supplied. Run the title through [Filename sanitization](#filename-sanitization) before building the path.
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
   - Path: `Projects/<slug>/ISSUES/<PREFIX>-<N> <sanitized-title>.md` — apply the rules in [Filename sanitization](#filename-sanitization) before building the path. Never pass the raw title straight to `obsidian create`.
   - Frontmatter: schema-conformant, `status: open`, `assignee: earchibald` unless overridden.
   - Body: `# <Title>` + scope. Keep the raw title in the `# <Title>` body heading even when the filename was sanitized — the heading is lossless, the filename is sanitized for the filesystem.
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
6. **Create TASKS notes in `Projects/<slug>/TASKS/` before any implementation work.** One note per logical subtask. Always — even a single-step issue gets one task note. No exceptions, no "trivial" escape hatch. The task list is what you're about to do; writing it down is how you plan.
7. Confirm before any action affecting shared systems (GitHub push, release, deploy, external API).

### Track git refs as work lands

After each commit that advances the in-progress issue, append `<sha7> <subject>` to the issue's `commits:` list. When a PR is opened for the issue, set `pr:` to the URL. The resolve verb records the shipped release as `version:` — see [Semver bumping](#semver-bumping) below.

There is **no `property:add` / `property:append`** CLI verb (see CLI gotchas). Appending to a list property is a read → append-in-memory → `property:set` (rewrite whole list) cycle:

```bash
ISSUE="Projects/<slug>/ISSUES/<PREFIX>-<N> <title>.md"
sha=$(git -C <repo> rev-parse --short=7 HEAD)
sub=$(git -C <repo> log -1 --pretty=%s)
new="$sha $sub"

# 1. Read the current list (YAML — one "- item" per line, or empty).
current=$(obsidian property:read name=commits path="$ISSUE")

# 2. Build the new list in memory, then 3. rewrite it whole.
#    Pass a JSON array as the value and type=list.
obsidian property:set name=commits type=list \
  value='["<sha1> <subj1>","<sha2> <subj2>","'"$new"'"]' \
  path="$ISSUE"
```

For `pr:` (scalar), a plain `property:set name=pr value=<url> path="$ISSUE"` is fine.

The trail lives on the issue so it survives TASKS being trashed at resolve time. Skip this step for meta-only projects with no git repo.

### Semver bumping

Every issue that ships code also bumps the project's version file per semver. The bump is part of the **resolve** step — one bump per issue — and the shipped version is recorded on the issue as `version:`.

**Version file.** Use whichever the project ships:
- `<repo>/plugins/<name>/.claude-plugin/plugin.json` for Claude Code plugins
- `<repo>/manifest.json` for Obsidian community plugins
- `<repo>/package.json` for node packages

If a project ships multiple (e.g. plugin.json and manifest.json kept in sync), bump all of them together.

**Classifying the bump** (read the issue scope + diff):
- **patch** (`0.1.6 → 0.1.7`) — docs, skill-text tweaks, bug fixes, internal refactors, schema clarifications that don't change the data model.
- **minor** (`0.1.6 → 0.2.0`) — new user-facing behavior: new verb, new slash command, new optional frontmatter field, additive CLI argument.
- **major** (`0.1.6 → 1.0.0`) — breaking change: removed/renamed frontmatter field, removed verb, incompatible schema change requiring vault migration. Flag and confirm with the user before bumping major.

Pre-`1.0.0` projects MAY treat breaking changes as minor, but prefer an explicit major bump once the schema stabilizes.

**When to bump.** At resolve time, as part of the final commit that closes the issue. Convention is to mention the bump in the commit subject (e.g. `Document foo (OP-NN); bump to 0.1.7`). Do **not** bump per-commit mid-issue — the version records the release that contains the work, not the number of commits.

**Record it on the issue.** Before moving the issue to `RESOLVED ISSUES/`, set `version:` to the new semver string:

```bash
obsidian property:set name=version value=0.1.7 path="$ISSUE"
```

Skip this step for meta-only projects with no version file.

### Finish

See the **resolve** verb below.

---

## Verb: resolve

Close the in-progress issue.

1. **Stop and get explicit user approval before making any changes.** Show the user the planned lifecycle transition:
   - Source → target: `Projects/<slug>/ISSUES/<filename>` → `Projects/<slug>/RESOLVED ISSUES/<filename>`
   - Frontmatter change: `status` → `resolved` (or `wontfix`), `resolved` → `<today>`
   - TASKS notes to trash: list each path
   - `commits:` status: "set" / "empty — will back-fill from git log" / "empty — skipping (no repo)"
   - Version bump: "`<file>`: `<old>` → `<new>` (`patch`/`minor`/`major`)" — or "skipping (no version file)". See [Semver bumping](#semver-bumping) for classification.
   Proceed only after the user confirms. This gate applies even in auto mode — moving an issue to `RESOLVED ISSUES/` is the closing commitment and must not be implicit.
2. **Back-fill git refs if missing.** If the project has a git repo and the issue's `commits:` list is empty, offer to back-fill before moving. Scan `git log` for commits whose message references the issue id (e.g. `(OP-14)` or the issue number) since the last resolved-issue date, and append each `<sha7> <subject>` to `commits:`. Skip for meta-only projects with no repo.
3. **Bump the version file** per semver (see [Semver bumping](#semver-bumping)), commit it (with the issue id in the subject), append the bump commit's `<sha7> <subject>` to `commits:`, and set `version:` on the issue to the new semver. Skip for meta-only projects with no version file.
4. Set issue `status: resolved`, `resolved: <today>`.
5. `obsidian move` the issue to `Projects/<slug>/RESOLVED ISSUES/`.
6. Delete TASKS notes via `obsidian delete` (trash, not permanent).
7. **Do NOT delete DOCS.**
8. Output:
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
