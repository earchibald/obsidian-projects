---
type: schema
project: all
---

# Projects Schema

This document is the authoritative reference for how agent sessions create and maintain project notes in this vault. Follow it exactly.

---

## Folder layout (per project)

```
Projects/<project-slug>/
  ISSUES/           ← open issues
  RESOLVED ISSUES/  ← closed issues (moved here on completion)
  TASKS/            ← subtask notes (deleted on completion)
  DOCS/             ← specs, plans, ADRs, runbooks
  <project>.base    ← Bases dashboard
  STATUS.md         ← embeds open-issues view for at-a-glance status
```

---

## Frontmatter schemas

### ISSUES and RESOLVED ISSUES

```yaml
---
id: <PROJECT-N>          # e.g. JB-2  — stable, never changes
project: <slug>          # e.g. jira-bases
type: issue
status: open | in-progress | blocked | resolved | wontfix
priority: low | med | high
created: YYYY-MM-DD      # date field (use today)
resolved:                # date field — set when status → resolved/wontfix
assignee: <github-handle>
tags:
  - project/<slug>
  - issue
---
```

**Filename convention:** `<PROJECT>-<N> <short-slug>.md` — full issue id first, then slug.
Example: `JB-2 prepend id to issue filenames.md`

Why: keeps the project key visible in file lists and makes wikilinks from TASKS self-documenting.

**Body:** one-line summary checklist at minimum. Agents may expand freely.

---

### TASKS

```yaml
---
id: <ISSUE-ID>.<N>       # e.g. JB-2.1
issue: "[[<issue-filename-no-ext>]]"   # wikilink back to parent issue
project: <slug>
type: task
status: pending | in-progress | completed | blocked
tags:
  - project/<slug>
  - task
---
```

**Lifecycle:** create at session start, delete (via trash) when issue resolves.

---

### DOCS

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

---

## Issue ID numbering

The issue ID is `<PREFIX>-<N>`.

**Prefix** — canonical location is `prefix:` in `STATUS.md` frontmatter (see [STATUS.md](#statusmd)). Read it from there. Fall back to scanning existing issue filenames only for legacy projects that predate this field.

**Number N** — scan **both** `ISSUES/` and `RESOLVED ISSUES/` for existing `id` values, find the highest `N`, and increment by 1 for each new issue.

Use `obsidian vault="<vault>" files folder="Projects/<slug>/ISSUES"` and `files folder="Projects/<slug>/RESOLVED ISSUES"` to enumerate. The filename prefix (`<PREFIX>-<N>`) reveals the id directly; fall back to `property:read name=id file=<name>` if needed.

---

## Agent workflow (per session)

1. **Read this file first** to orient.
2. **Read the target issue** to understand scope.
3. **Create TASKS notes** (one per logical subtask) before touching any code or external systems.
4. **Update issue** `status: in-progress` at session start.
5. **Before any external action** (repo create, push, release, deploy) — confirm with user unless they granted explicit upfront authorization.
6. **On completion:**
   - Set issue `status: resolved`, add `resolved: <date>`.
   - `obsidian move` the issue to `RESOLVED ISSUES/`.
   - Delete TASKS notes via `obsidian delete` (goes to trash, not permanent).
   - Do NOT delete DOCS.

---

## Optimized agent kickoff prompt

```
Vault: Agent-Vault. Project path: Projects/<project-slug>. Issue: <N> <slug>.

Read Projects/Projects schema.md first, then the issue file, then proceed.

Conventions are in the schema doc. Key points:
- Create TASKS notes before starting work; delete them on completion.
- Update issue status → in-progress at start, resolved on completion, then move to RESOLVED ISSUES/.
- Confirm before any action affecting shared systems (GitHub, releases, external APIs).
- On completion output: (a) external changes (URLs, commands run), (b) vault changes, (c) manual follow-ups for me.
```

---

## Bases dashboard

Every project must have a `<project>.base` file in its root folder with at minimum:

- **Open Issues** — `type == "issue" && status != "resolved" && status != "wontfix"`
- **Tasks by Issue** — `type == "task" && status != "completed"`, grouped by `issue`
- **Resolved Log** — `type == "issue" && (status == "resolved" || status == "wontfix")`, sort `resolved desc`
- **Docs Index** — `type == "doc"`, grouped by `doc_type`

See `Projects/jira-bases/jira-bases.base` as the reference implementation.

---

## STATUS.md

Each project root must contain a `STATUS.md` that carries project-level metadata in its frontmatter and embeds the open-issues view in its body:

```markdown
---
project: <slug>
prefix: <PREFIX>
type: project-status
---
![[<project>.base#Open Issues]]
```

**Frontmatter fields:**
- `project` — slug, matches the folder name.
- `prefix` — canonical issue-ID prefix (e.g. `JB`, `TMB`). This is the authoritative location for the prefix; commands that need it (`/issue`, `/create-issue`) MUST read it from here first.
- `type: project-status` — lets Bases distinguish STATUS notes from issues/tasks/docs.

**Fallback for legacy projects:** if `prefix` is missing from STATUS.md, fall back to scanning issue filenames (`Projects/<slug>/ISSUES/*.md` and `RESOLVED ISSUES/*.md`). If neither the field nor any issue exists, stop and ask the user — a freshly scaffolded project with zero issues has no implicit prefix, so the scaffolder is responsible for writing `prefix` at creation time.


---

## Cross-project surfaces

The `Projects/` root contains aggregate views that span every project. These are **not** owned by any single project — leave them in place when scaffolding or cleaning up.

- **`Projects/all-projects.base`** — base filtered to `file.inFolder("Projects") && type != "schema"`, with views grouped by `project` (Open Issues, Board, Tasks by Project, Resolved Log, Docs Index).
- **`Projects/All Projects.md`** — status surface embedding the cross-project views.

When adding a new project, no edits to these files are needed — they pick up any note whose frontmatter includes a `project` key and lives under `Projects/`.


---

## DOCS folder: git-versioned superpowers subfolder

When a project has an associated code repo, the repo's `docs/superpowers/` tree (plans, specs, ADRs, research, testing) should be reachable from the vault so agents can read and write it in place.

**Layout:** `DOCS/` is a real vault folder. Inside it, **`DOCS/superpowers/` is a symlink** into the repo. Vault-only docs (project logs, prompt libraries, anything that shouldn't be committed) live directly in `DOCS/` alongside the symlink.

**Direction:** repo is canonical for everything under `superpowers/`; the vault holds only the symlink pointing at it.

```bash
# One-time setup (repo is canonical source of superpowers/)
mkdir -p <vault>/Projects/<slug>/DOCS
ln -s <repo>/docs/superpowers <vault>/Projects/<slug>/DOCS/superpowers
```

**Post-setup reconciliation:** Obsidian won't index files inside a symlink added mid-session. Force a rescan for each subfolder that exists under the symlink (typically `plans`, `specs`, `research`, `testing`):

```bash
obsidian vault="<vault>" eval code='(async()=>{const a=app.vault.adapter;const base="Projects/<slug>/DOCS/superpowers";for(const sub of ["plans","specs","research","testing"]){await a.reconcileFolderCreation(base+"/"+sub, base+"/"+sub);}})()'
```

On subsequent vault opens, indexing is automatic.

**Meta-only projects** (like `obsidian-projects` — no code repo) keep a plain `DOCS/` folder with no `superpowers/` symlink.

**Writing docs:**
- Repo-tracked (`doc_type: plan | spec | adr | runbook` tied to code work) → write under `DOCS/superpowers/{plans,specs,…}/`.
- Vault-only (project log, prompt references, anything not version-controlled) → write directly under `DOCS/`.
