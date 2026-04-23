---
name: op
description: Run the Obsidian Projects workflow — scaffold new projects, create/work/resolve issues, and maintain schema-conformant notes in an Obsidian vault that follows the Projects schema. Use whenever the user invokes /op:* commands or references an Obsidian project by ID prefix (e.g. JB-3, TMB-9, OP-11).
---

# Obsidian Projects (op) workflow

You are operating on an Obsidian vault that uses the **Projects schema** — a Jira-lite issue tracker where each project is a folder under `Projects/` and each issue/task/doc is a markdown note with structured frontmatter. Schema details live in [`reference/schema.md`](reference/schema.md); read it on first use or when frontmatter shape comes up.

All vault mutations go through the **`op-obsidian`** plugin. Probe once per session and cache the result:

```bash
obsidian eval code='({enabled: app.plugins.enabledPlugins.has("op-obsidian"), version: app.plugins.plugins["op-obsidian"]?.manifest?.version})'
```

If the plugin is missing or disabled, **stop and ask the user to install/enable it** rather than improvising with raw `obsidian` CLI primitives — the plugin owns filename sanitization, ID numbering, frontmatter shape, atomic move-and-trash on resolve, and the JSON response payload. For emergencies where the user can't enable it, [`reference/cli-gotchas.md`](reference/cli-gotchas.md) documents the raw-CLI fallbacks (including the read-append-rewrite recipe for appending to `commits:` without `op-append-commit`).

**Delegating vault/CLI work.** This plugin ships an `obsidian-ops-specialist` subagent. When you're a coding agent working an issue and the next step is a raw Obsidian CLI call, a vault introspection, or a mutation the plugin owns, prefer delegating it via the Agent tool (`subagent_type: obsidian-ops-specialist`) over running the CLI yourself. The specialist knows the CLI gotchas, the op-obsidian dispatch surface, and keeps vault-side behavior consistent with this skill's lifecycle rules. You still own the skill's invariants — the specialist executes, you orchestrate.

Run `obsidian vault` once to learn the active vault path; cache it.

## Work in a git worktree for non-trivial issues

Default to an isolated git worktree (`EnterWorktree`, or the `superpowers:using-git-worktrees` skill) for any issue that touches more than a single file or spans more than one trivial edit. Keeping the main checkout clean lets parallel work, PR review, and vault sync coexist without branch-swap churn — and it matters more when you were **delegated** the issue by another agent, because the delegating agent may still be holding the main checkout open.

Skip the worktree only for the simplest issues: a one-line doc tweak, a single-field schema comment, or a typo fix. If in doubt, create the worktree — the cost is low and it's easy to exit cleanly at the end.

---

## Plugin commands

All `op-*` commands take `key=value` arguments (not `--flag`). Each prints a one-line summary to stdout and writes a full JSON payload to `Projects/_scratch/op-last-response.md` — read that note for structured fields (paths, trashed-task list, etc.).

| Command | Required | Optional | Effect |
| :--- | :--- | :--- | :--- |
| `op-scaffold` | `slug`, `prefix` | `repo_path`, `title`, `priority`, `scope` | creates `Projects/<slug>/<slug>.base` + `STATUS.md`; writes `repo_path:` (absolute path only) if given; seeds `<PREFIX>-1` if `title` given |
| `op-new` | `project`, `title` | `priority`, `scope`, `github_issue` | creates next-N issue with sanitized filename and schema-conformant frontmatter; when the plugin's `autoCreateGithubIssue` setting is on and no `github_issue` is passed, also runs `gh issue create` in the project's `repo_path` and writes the URL to `github_issue:` |
| `op-work` | `issue` | — | sets `status: in-progress`; creates the initial TASKS note |
| `op-append-commit` | `issue`, `sha`, `subject` | — | idempotent append to issue's `commits:` list |
| `op-set-pr` | `issue`, `url` | — | sets scalar `pr:` |
| `op-set-scope` | `issue`, `scope` | `mode=scope\|body` | default `mode=scope` replaces the issue body's `## Scope` section (appends it if missing); payload is markdown without H2 headings. `mode=body` replaces the entire body content after the optional `# Title` heading; payload may include H2s. This is the one mutation the plan-mode agent is allowed, so it can persist a refined plan back to the issue note. |
| `op-resolve` (or `op-close-current-issue`) | `issue` (or `path`) | `status=wontfix` | sets `status: resolved`, writes `resolved: <today>`, moves into `RESOLVED ISSUES/`, trashes linked TASKS — atomically. When `closeGithubIssueOnResolve` is on and the issue has a `github_issue:` URL, also runs `gh issue close` on it; the JSON response reports `githubClosed` / `githubCloseError` |

`scope` is a single value containing newline-separated bullets.

**URI senders (`obsidian://op-new?…`):** Obsidian's protocol parser is `Record<string, string>` and last-wins, so repeated `scope=a&scope=b` keys collapse to only the last value. Pack multi-value lists into a single `scope=` param using `%0A` (newline) or `,` as the delimiter; the plugin's `collectRepeated` helper splits on either. Spaces and `+`: the parser uses `decodeURIComponent`, which leaves `+` untouched — but the plugin normalizes `+` → space at the dispatch boundary to match `URLSearchParams.toString()` semantics. To preserve a literal `+`, encode it as `%2B`.

Prefix → slug is **not** a plugin command — scan `Projects/*/STATUS.md` directly and read the `prefix:` frontmatter to disambiguate. Do not use `obsidian search` for this (it misreads `prefix:` as a query operator). **Legacy fallback:** if no `STATUS.md` declares that prefix (pre-`prefix:`-field projects, or the file is missing), scan `Projects/*/ISSUES/<PREFIX>-*.md` and `Projects/*/RESOLVED ISSUES/<PREFIX>-*.md` filenames instead and infer the slug from the parent folder. If still no match, stop and ask the user for the slug, then write `prefix:` into that project's `STATUS.md` before continuing so the next lookup is deterministic.

---

## Verb: scaffold

`/op:scaffold <slug> <PREFIX> [<title>]`

1. Validate `slug` (lowercase + hyphens, `Projects/<slug>/` doesn't already exist).
2. If the project has a code repo, ask the user for its absolute path (e.g. `/Users/you/Projects/<slug>`) and pass it as `repo_path=`. The plugin writes it to `STATUS.md` frontmatter, where `op:open-agent` reads it to set the agent's working directory and skip the working-dir modal. Must be absolute — no `~`, no vault-relative. Skip this prompt for meta-only projects with no repo.
3. Run `obsidian op-scaffold slug=<slug> prefix=<PREFIX> [repo_path=/abs/path] [title="…"] [priority=med] [scope="bullet 1\nbullet 2"]`.
4. Report `projectFolder`, `basePath`, `statusPath`, and `seedPath` (if any) from the JSON response. Suggest `/op:new <slug>` next.

---

## Verb: new

`/op:new <project-or-prefix> [description]`

1. Resolve `project-or-prefix` to a slug (folder match, else prefix scan over STATUS.md).
2. Gather scope by description length:
   - **None** → ask interactively for title, priority (default `med`), optional scope bullets.
   - **Brief** (description ≤ 140 chars, single line) → propose title, priority guess, 2–5 bullet checklist; confirm.
   - **Detailed** (> 140 chars, or multi-line regardless of length) → propose title, priority, summary paragraph + checklist; preserve any explicit acceptance criteria verbatim; confirm.
   - **If unsure** (borderline length, ambiguous structure) → treat as detailed and surface the ambiguity in the confirm step rather than guessing silently.
3. **Always pause for explicit user confirmation before mutating vault or repo** — even in auto mode. Issue creation is a commitment artifact.
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
4. **Write the `## Plan` section now** (approach, key decisions, files to touch, risks). Reconcile, don't overwrite: if the section already has user or prior-agent content, extend/refine rather than replace. Replace the italic placeholder if still present.
5. The plugin creates the first TASKS note for you. For additional logical subtasks, create more TASKS notes (`obsidian create` is fine for these auxiliary notes — they're trashed at resolve).
6. **Mirror every TASK note into a `## Tasks` checklist in the issue body.** After creating the TASK notes (planned upfront, or fix-up tasks discovered mid-session), append a line to the issue body's `## Tasks` section for each one:

   ```markdown
   ## Tasks

   - [ ] <ISSUE-ID>.<N> — <task title>
   ```

   Reconcile rather than overwrite: if the section already exists (prior session, completed task, user-authored entry), preserve existing entries (`- [completed]` / `- [x]`) and append any new tasks not already listed. Mark entries `- [completed]` when the corresponding TASK note flips to `status: completed`. The body checklist is the durable record — TASK notes are trashed at resolve, the issue body isn't.

   When a TASK note flips to `status: completed`, also **append a `### <ISSUE-ID>.<N> — <title>` block under `## Notes`** recording what was done and any deviations from the plan. Idempotent: if that block already exists, update it in place rather than duplicating.
7. Confirm before any action affecting shared systems (push, release, deploy, external API).

**Reconcile rule for legacy issues.** If the issue body is missing any of `## Plan`, `## Notes`, or `## Summary`, insert the missing sections in canonical order (`Scope → Plan → Tasks → Notes → Summary`) before writing. Never modify user-authored prose in other sections.

### Track refs as work lands

After each commit on this issue:

```bash
sha=$(git rev-parse --short=7 HEAD)
sub=$(git log -1 --pretty=%s)
obsidian op-append-commit issue=<PREFIX>-<N> sha="$sha" subject="$sub"
```

When a PR opens: `obsidian op-set-pr issue=<PREFIX>-<N> url=<pr-url>`.

Skip both for meta-only projects with no git repo.

**If something fails, do this:**

- `git rev-parse` / `git log` errors (not a repo, detached state, empty history) → note the failure once, skip the append for that commit, and continue with the work. Do **not** retry in a loop, and do **not** synthesize a sha. Surface the skipped commits in the resolve-time back-fill step instead.
- Missing or unknown issue id (the caller didn't pass one, or the id doesn't resolve to a file) → stop and ask the user for the `<PREFIX>-<N>`. Never append to a guessed issue — the `commits:` trail is a permanent record and wrong attribution is worse than a missing entry.
- `obsidian op-append-commit` returns an error (vault unreachable, plugin disabled, issue file moved mid-session) → re-probe the plugin (`app.plugins.enabledPlugins.has("op-obsidian")`) and re-resolve the issue path. If it still fails, record the `<sha7> <subject>` pair in the session (or a scratch note) and batch-append at resolve time; don't block the commit cadence on vault health.

### GitHub issue linkage

If the issue has a `github_issue:` frontmatter field, it mirrors a GitHub issue. The URL may have been populated automatically at `op-new` time (when `autoCreateGithubIssue` is on) or set later via the plugin's "Set GitHub issue URL" command. While working, treat it as a one-way mirror: you may comment on, label, or reference the GH issue, but do **not** close it manually — the plugin closes it atomically during `op-resolve` (see below). If the user asks "is the GitHub issue still open?", check live state with `gh issue view <url>` rather than inferring from the op status.

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

1. **Write the `## Summary` section** in the issue body (shipped behavior, PR link, `<sha7> <subject>` commits, follow-ups) before the confirmation pause. Show its diff in the resolution preview. Replace the italic placeholder if still present; reconcile with any existing prose rather than overwriting.
2. **Always pause for explicit user confirmation before mutating vault or repo** — even in auto mode. Show the planned transition:
   - Source → target: `Projects/<slug>/ISSUES/<filename>` → `…/RESOLVED ISSUES/<filename>`
   - Frontmatter: `status` → `resolved` (or `wontfix`), `resolved` → `<today>`
   - TASKS to trash (list each path)
   - `commits:` status: "set" / "empty — will back-fill from git log" / "empty — skipping (no repo)"
   - Version bump: "`<file>`: `<old>` → `<new>` (`patch`/`minor`/`major`)" — or "skipping (no version file)"
   - GitHub issue: if `github_issue:` is set and `closeGithubIssueOnResolve` is on, note that the plugin will run `gh issue close` on the URL as part of `op-resolve` — do **not** close it yourself beforehand
3. **Back-fill `commits:` if empty.** Scan `git log` for commits referencing the issue id since the last resolved-issue date; append each via `obsidian op-append-commit`.
4. **Bump the version file**, commit it (with the issue id in the subject), append that commit via `op-append-commit`, then `obsidian property:set name=version value=<new> path="<issue-path>"`. Skip for meta-only projects.
5. `obsidian op-resolve issue=<PREFIX>-<N>` (or `status=wontfix`). The plugin moves the file, sets `status` and `resolved:`, and trashes linked TASKS atomically. If the issue has a `github_issue:` URL and `closeGithubIssueOnResolve` is on, the plugin also runs `gh issue close` on it — check `githubClosed` / `githubCloseError` in the JSON response. **DOCS are never touched.**
6. Report: external changes (URLs, commands run, including the linked GH issue if it was auto-closed), vault changes (paths from the JSON response), and any manual follow-ups (e.g. retrying `gh issue close` manually if `githubCloseError` is set).

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
