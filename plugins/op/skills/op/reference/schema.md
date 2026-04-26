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
  WORKFLOW.md       ← optional; project's SDLC policy (see "WORKFLOW.md" below)
```

---

## Frontmatter schemas

### ISSUES and RESOLVED ISSUES

```yaml
---
id: <PROJECT-N>          # e.g. JB-2  — stable, never changes
project: <slug>          # e.g. jira-bases
title: "<full title>"    # full pre-sanitization title; filenames are truncated and have forbidden chars stripped, this field keeps the original
type: issue
status: open | in-progress | blocked | resolved | wontfix
priority: low | med | high
created: YYYY-MM-DD      # date field (use today)
resolved:                # date field — set when status → resolved/wontfix
assignee: <github-handle>
commits:                 # optional; short-sha + subject, appended during work
  - <sha7> <subject>
pr:                      # optional; PR or MR URL if one exists
github_issue:            # optional; direct mapping to a GitHub issue URL
agent:                   # optional; agent runtime currently working the issue (e.g. claude, codex, gemini, copilot — only `claude` is exercised in this repo's dev/test workflow; gemini/copilot are accepted but untested)
agent_session:           # optional; opaque per-session id paired with `agent:` — used by op-work for conflict detection
version:                 # optional; semver string of the release that shipped this issue, set at resolve
flow:                    # optional; current stage of the multi-mode workflow (evaluate → planning → implementation → review → finalization → done)
complexity:              # optional; simple | complex — simple issues may skip evaluate/review modes
parent:                  # optional; <PARENT-ID> for many-to-one tracking-umbrella linking (see "Issue links")
children:                # optional; list of child <ISSUE-ID>s when this issue is a tracking umbrella
  - <ISSUE-ID>
depends_on:              # optional; list of <ISSUE-ID>s this issue blocks on
  - <ISSUE-ID>
depended_on_by:          # optional; inverse of depends_on, plugin-managed
  - <ISSUE-ID>
related_to:              # optional; symmetric soft link, plugin-managed
  - <ISSUE-ID>
tags:
  - project/<slug>
  - issue
---
```

**Filename convention:** `<PROJECT>-<N> <short-slug>.md` — full issue id first, then slug.
Example: `JB-2 prepend id to issue filenames.md`

Why: keeps the project key visible in file lists and makes wikilinks from TASKS self-documenting.

**Title field.** The filename is sanitized (forbidden chars `#^[]|\/:?"<>*` replaced with spaces, capped at 80 chars at a word boundary) and may lose information. `title:` in frontmatter holds the full original title verbatim, JSON-quoted so YAML parses safely. Bases views and pickers prefer it over the file basename. Plugin-managed at `op-new` — agents shouldn't write it directly.

**Body:** one-line summary checklist at minimum. Agents may expand freely.

**Git refs.** `commits:` and `pr:` are the canonical trail of *what shipped* for the issue. They live on the issue (not on TASKS) because TASKS are trashed on resolve; the issue and its refs persist in `RESOLVED ISSUES/` forever. Both fields are optional — meta-only projects without a code repo leave them unset.

**GitHub issue mapping.** `github_issue:` is an optional URL pointing at a GitHub issue that mirrors this op issue. Set manually via the plugin's "Set GitHub issue URL" command, auto-populated at creation time when the `autoCreateGithubIssue` plugin setting is on (runs `gh issue create` in the project's repo), or passed in at creation. When `closeGithubIssueOnResolve` is on, resolving the op issue runs `gh issue close` on the linked URL.

**Agent registration.** `agent:` records the runtime currently working the issue (`claude`, `codex`, `gemini`, `copilot`, …); `agent_session:` is an opaque per-session id the agent passes to `op-work` (e.g. `$CLAUDE_SESSION_ID`). Both are written by `obsidian op-work agent=<id> agent_session=<sid>` and act as a soft lock — if another agent or session is already registered, `op-work` returns a `conflict` in its JSON payload and refuses to overwrite unless `force=true`. Skill agents must surface a conflict to the user rather than auto-forcing. The fields are also written by the plugin's `op:open-agent` UI when launching, and cleared by `op-resolve`. Note: `gemini` and `copilot` are accepted by the dispatch code but are second-class and untested in this repo's dev workflow — only `claude` is exercised end-to-end. See the project README's "Supported AI runtimes" section.

**Version.** `version:` is **optional**. It records the release identifier (e.g. `0.1.7`) that shipped this issue, when the project tracks releases on issues. *When* and *how* to set it — patch/minor/major classification, lockstep across multiple version files, whether to bump per issue at all — is owned by the project, not by this skill. See the project's own `CLAUDE.md` (or equivalent) for the policy. Meta-only projects without a release artifact leave the field unset.

**Issue links.** Issues form a graph via plugin-managed link fields. The `op-obsidian` plugin owns both sides of every link — agents MUST use `op-set-link` / `op-remove-link` and never write the link frontmatter directly. Direct edits are tolerated for human convenience, but `op-link-check` will flag any drift across the vault and `op-link-check repair=true` will reconcile it.

Canonical relations (config-only addition surface — extend `RELATIONS` in `plugins/op-obsidian/src/relations.ts` to ship more):

| Relation | Cardinality | Inverse | Shape |
| :--- | :--- | :--- | :--- |
| `parent` ↔ `children` | many-to-one | each other | scalar ↔ list |
| `depends_on` ↔ `depended_on_by` | many-to-many | each other | list ↔ list |
| `related_to` ↔ `related_to` | many-to-many (symmetric) | self | list ↔ list |

Field values are **bare ids** (e.g. `OP-92`), not wikilinks — ids are stable across renames; the plugin can resolve to a wikilink at read time if a UI ever needs it. Resolved-folder issues are valid link targets; a parent→child link must remain valid after the child resolves and moves into `RESOLVED ISSUES/`.

**Verbs:**
- `op-set-link issue=<src> relation=<rel> target=<dst>` — write both sides atomically. Self-links and unknown relations are rejected. For many-to-one (`parent` / `children`), reassigning the scalar side cleans up the previous holder's inverse list.
- `op-remove-link issue=<src> relation=<rel> target=<dst>` — remove both sides. Idempotent.
- `op-link-check [repair=true]` — scan every issue's link fields for drift; report `missing-inverse` and `dangling-target` entries; with `repair=true`, re-apply links to fix any one-sided drift (dangling targets are reported, not auto-fixed).
- `op-migrate-links` — one-shot rewrite of the legacy `parent_issue` / `subissues` interim fields (introduced by OP-92, replaced here) to canonical `parent` / `children`. Idempotent.

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
6. **During work:** if the project tracks shipped commits on the issue, append `<sha7> <subject>` to `commits:` via `op-append-commit`; if it tracks PRs, set `pr:` via `op-set-pr`. Cadence (per commit, batch at resolve, or never) is the **project's** choice — see its `CLAUDE.md`. Skip both when the project says nothing or has no git repo.
7. **On completion (vault-side invariants the skill enforces):**
   - Set issue `status: resolved`, add `resolved: <date>`.
   - Move the issue to `RESOLVED ISSUES/`.
   - Trash TASKS notes (goes to trash, not permanent).
   - Do NOT touch DOCS.

   These steps run atomically inside `op-resolve`. **Project-specific resolve actions** (release, version bump, deploy, branch merge) layer on top of this and are governed by the project's own conventions, not by this skill.

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
repo_path: /Users/you/Projects/<slug>   # optional, absolute path
---
![[<project>.base#Open Issues]]
```

**Frontmatter fields:**
- `project` — slug, matches the folder name.
- `prefix` — canonical issue-ID prefix (e.g. `JB`, `TMB`). This is the authoritative location for the prefix; commands that need it (`/issue`, `/create-issue`) MUST read it from here first.
- `type: project-status` — lets Bases distinguish STATUS notes from issues/tasks/docs.
- `repo_path` — *optional* absolute path to the project's code repo. When set, the `op-obsidian` plugin's `op:open-agent` command uses it as the agent's working directory and skips the working-dir modal. Must be an absolute path — no `~` expansion, no vault-relative paths. Leave unset for meta-only projects with no repo; the plugin falls back to the per-project working-dir setting, then prompts.

**Fallback for legacy projects:** if `prefix` is missing from STATUS.md, fall back to scanning issue filenames (`Projects/<slug>/ISSUES/*.md` and `RESOLVED ISSUES/*.md`). If neither the field nor any issue exists, stop and ask the user — a freshly scaffolded project with zero issues has no implicit prefix, so the scaffolder is responsible for writing `prefix` at creation time.


---

## WORKFLOW.md

`Projects/<slug>/WORKFLOW.md` is **optional** and per-project. It documents the project's SDLC policy — branching model, PR rules, version-bump cadence, commit-to-issue mapping, deploy procedure, anything that varies project-to-project. The `op` skill itself is workflow-agnostic (per OP-106); WORKFLOW.md is the seam where the project gets to express its own opinion.

**Frontmatter:**

```yaml
---
project: <slug>
type: workflow
updated: YYYY-MM-DD       # optional
---
```

**Body:** freeform agent-optimized prose. There is no enforced structure — the audience is a working agent, so write terse, imperative guidance ("Always work in a worktree", "Run `npm test` before committing", etc.).

**Surfacing to working agents:**
- The `op-obsidian` plugin's `op:open-agent` kickoff prompt inlines the WORKFLOW.md content automatically (capped at the configurable `injection.maxWorkflowChars`, default 2000). Over the cap → the prompt surfaces only the path with a "read this first" hint.
- Programmatic access for agents: `obsidian op-get-workflow project=<slug>` returns `{exists, path, content, size}`.

**Authoring:**
- Palette command **op: edit project workflow (WORKFLOW.md)** (or `obsidian op-edit-workflow project=<slug>`) launches a dedicated agent session in tmux that interviews the user about branching/version/PR/commit policy and writes the file. The session has full edit capability but is bounded to the workflow file (no `op-work` / `op-resolve` / version bump). tmux window naming: `op-workflow-<slug>` to keep it distinct from issue sessions in the shared `op-agents` session.

**`type: workflow`** is a top-level type alongside `issue`, `task`, `doc`, `project-status`, and `schema`. Cross-project base aggregations should exclude it (`type != "workflow"`) so it doesn't pollute Issue/Task/Doc lists.

**Optional, opinion-driven:** absent ⇒ no opinion. The skill defaults to asking the user when policy ambiguity comes up. Projects without code repos (or without a workflow-driven feel) leave the file unset.

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
