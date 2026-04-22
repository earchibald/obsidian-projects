---
name: op
description: Run the Obsidian Projects workflow — scaffold new projects, create/work/resolve issues, and maintain schema-conformant notes in an Obsidian vault that follows the Projects schema. Use whenever the user invokes /op:* commands, references an Obsidian project by slug or ID prefix (e.g. JB-3, TMB-9, OP-11), or edits files under `Projects/<slug>/ISSUES|TASKS|DOCS|RESOLVED ISSUES/`.
---

# Obsidian Projects (op) workflow

You are operating on an Obsidian vault that uses the **Projects schema** — a Jira-lite issue tracker where each project is a folder under `Projects/` and each issue/task/doc is a markdown note with structured frontmatter. Schema details live in [`reference/schema.md`](reference/schema.md); read it on first use or when frontmatter shape comes up.

All vault mutations go through the **`op-obsidian`** plugin. Probe once per session and cache the result:

```bash
obsidian eval code='({enabled: app.plugins.enabledPlugins.has("op-obsidian"), version: app.plugins.plugins["op-obsidian"]?.manifest?.version})'
```

If the plugin is missing or disabled, **stop and ask the user to install/enable it** rather than improvising with raw `obsidian` CLI primitives — the plugin owns filename sanitization, ID numbering, frontmatter shape, atomic move-and-trash on resolve, and the JSON response payload. For emergencies where the user can't enable it, [`reference/cli-gotchas.md`](reference/cli-gotchas.md) documents the raw-CLI fallbacks (including the read-append-rewrite recipe for appending to `commits:` without `op-append-commit`).

Run `obsidian vault` once to learn the active vault path; cache it.

---

## Plugin commands

All `op-*` commands take `key=value` arguments (not `--flag`). Each prints a one-line summary to stdout and writes a full JSON payload to `Projects/_scratch/op-last-response.md` — read that note for structured fields (paths, trashed-task list, etc.).

| Command | Required | Optional | Effect |
| :--- | :--- | :--- | :--- |
| `op-scaffold` | `slug`, `prefix` | `repo_path`, `title`, `priority`, `scope` | creates `Projects/<slug>/<slug>.base` + `STATUS.md`; writes `repo_path:` (absolute path only) if given; seeds `<PREFIX>-1` if `title` given |
| `op-new` | `project`, `title` | `priority`, `scope` | creates next-N issue with sanitized filename and schema-conformant frontmatter |
| `op-work` | `issue` | — | sets `status: in-progress`; creates the initial TASKS note |
| `op-append-commit` | `issue`, `sha`, `subject` | — | idempotent append to issue's `commits:` list |
| `op-set-pr` | `issue`, `url` | — | sets scalar `pr:` |
| `op-resolve` (or `op-close-current-issue`) | `issue` (or `path`) | `status=wontfix` | sets `status: resolved`, writes `resolved: <today>`, moves into `RESOLVED ISSUES/`, trashes linked TASKS — atomically |

`scope` is a single value containing newline-separated bullets.

Prefix → slug is **not** a plugin command — scan `Projects/*/STATUS.md` directly and read the `prefix:` frontmatter to disambiguate. Do not use `obsidian search` for this (it misreads `prefix:` as a query operator).

---

## Verb: scaffold

`/op:scaffold <slug> <PREFIX> [<title>]`

1. Validate `slug` (lowercase + hyphens, `Projects/<slug>/` doesn't already exist).
2. Run `obsidian op-scaffold slug=<slug> prefix=<PREFIX> [title="…"] [priority=med] [scope="bullet 1\nbullet 2"]`.
3. Report `projectFolder`, `basePath`, `statusPath`, and `seedPath` (if any) from the JSON response. Suggest `/op:new <slug>` next.

---

## Verb: new

`/op:new <project-or-prefix> [description]`

1. Resolve `project-or-prefix` to a slug (folder match, else prefix scan over STATUS.md).
2. Gather scope by description length:
   - **None** → ask interactively for title, priority (default `med`), optional scope bullets.
   - **Brief** (≤~140 chars) → propose title, priority guess, 2–5 bullet checklist; confirm.
   - **Detailed** → propose title, priority, summary paragraph + checklist; preserve any explicit acceptance criteria verbatim; confirm.
3. **Always confirm** before writing — even in auto mode. Issue creation is a commitment artifact.
4. Run `obsidian op-new project=<slug> title="<title>" priority=<low|med|high> [scope="bullet 1\nbullet 2"]`.
5. Report the new id and path; suggest `/op:issue <PREFIX>-<N>`.

---

## Verb: work

`/op:issue <project-or-prefix> [<N-or-ID>]`

### Pick the issue

Accepts `slug N`, `slug PREFIX-N`, `PREFIX N`, `PREFIX-N`, or just `slug`/`PREFIX` (auto-pick). Without N, prefer the lowest-numbered `in-progress`, else the lowest-numbered `open`. Multiple matches → stop and ask.

### Start

1. `obsidian op-work issue=<PREFIX>-<N>`.
2. If the body is empty or one line, scope is ambiguous — state your interpretation and confirm before implementing, even in auto mode.
3. Reconcile scope vs. current repo/vault state — skip items already done; flag drift between the schema and observed reality.
4. The plugin creates the first TASKS note for you. For additional logical subtasks, create more TASKS notes (`obsidian create` is fine for these auxiliary notes — they're trashed at resolve).
5. Confirm before any action affecting shared systems (push, release, deploy, external API).

### Track refs as work lands

After each commit on this issue:

```bash
sha=$(git rev-parse --short=7 HEAD)
sub=$(git log -1 --pretty=%s)
obsidian op-append-commit issue=<PREFIX>-<N> sha="$sha" subject="$sub"
```

When a PR opens: `obsidian op-set-pr issue=<PREFIX>-<N> url=<pr-url>`.

Skip both for meta-only projects with no git repo.

### Semver bumping (at resolve time)

Every issue that ships code bumps the project's version file — one bump per issue, recorded as `version:` on the issue.

**Files** (bump in lockstep if multiple ship):
- `<repo>/plugins/<name>/.claude-plugin/plugin.json` (Claude Code plugins)
- `<repo>/manifest.json` (Obsidian community plugins)
- `<repo>/package.json` (node packages)

**Classify**:
- **patch** — docs, bug fixes, internal refactors, schema clarifications.
- **minor** — new user-facing behavior (new verb, new slash command, new optional field, additive arg).
- **major** — breaking change (removed/renamed field, removed verb, schema migration). Confirm before bumping major.

Pre-`1.0.0` projects MAY treat breakage as minor; prefer explicit major once the schema stabilizes. Skip entirely for meta-only projects with no version file.

---

## Verb: resolve

`/op:resolve` (or run at the tail of `work`).

1. **Stop and get explicit user approval** — even in auto mode. Show the planned transition:
   - Source → target: `Projects/<slug>/ISSUES/<filename>` → `…/RESOLVED ISSUES/<filename>`
   - Frontmatter: `status` → `resolved` (or `wontfix`), `resolved` → `<today>`
   - TASKS to trash (list each path)
   - `commits:` status: "set" / "empty — will back-fill from git log" / "empty — skipping (no repo)"
   - Version bump: "`<file>`: `<old>` → `<new>` (`patch`/`minor`/`major`)" — or "skipping (no version file)"
2. **Back-fill `commits:` if empty.** Scan `git log` for commits referencing the issue id since the last resolved-issue date; append each via `obsidian op-append-commit`.
3. **Bump the version file**, commit it (with the issue id in the subject), append that commit via `op-append-commit`, then `obsidian property:set name=version value=<new> path="<issue-path>"`. Skip for meta-only projects.
4. `obsidian op-resolve issue=<PREFIX>-<N>` (or `status=wontfix`). The plugin moves the file, sets `status` and `resolved:`, and trashes linked TASKS atomically. **DOCS are never touched.**
5. Report: external changes (URLs, commands run), vault changes (paths from the JSON response), and any manual follow-ups.

---

## Cross-project surfaces

`Projects/all-projects.base` and `Projects/All Projects.md` aggregate every project — leave them alone when scaffolding/cleaning. New projects land in them automatically via the `project` frontmatter key.

## DOCS folder: superpowers symlink

Projects with a code repo keep `DOCS/superpowers/` as a symlink into `<repo>/docs/superpowers/`. Vault-only docs (logs, prompt libraries) live directly in `DOCS/` alongside the symlink. One-time setup:

```bash
mkdir -p <vault>/Projects/<slug>/DOCS
ln -s <repo>/docs/superpowers <vault>/Projects/<slug>/DOCS/superpowers
obsidian eval code='(async()=>{const a=app.vault.adapter;const base="Projects/<slug>/DOCS/superpowers";for(const sub of ["plans","specs","research","testing"]){await a.reconcileFolderCreation(base+"/"+sub, base+"/"+sub);}})()'
```

Repo-tracked docs (`doc_type: plan|spec|adr|runbook`) → `DOCS/superpowers/{plans,specs,…}/`. Vault-only docs → `DOCS/` directly. Meta-only projects keep a plain `DOCS/` folder, no symlink.
