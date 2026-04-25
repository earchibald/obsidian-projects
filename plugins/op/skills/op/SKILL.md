---
name: op
description: Run the Obsidian Projects workflow — scaffold new projects, create/work/resolve issues, and maintain schema-conformant notes in an Obsidian vault that follows the Projects schema. Use whenever the user invokes /op:* commands or references an Obsidian project by ID prefix (e.g. JB-3, TMB-9, OP-11).
---

# Obsidian Projects (op) workflow

You are operating on an Obsidian vault that uses the **Projects schema** — a Jira-lite issue tracker where each project is a folder under `Projects/` and each issue/task/doc is a markdown note with structured frontmatter. Schema details live in [`reference/schema.md`](reference/schema.md); read it on first use or when frontmatter shape comes up.

## Scope of this skill

This skill manages **vault state and the issue schema** only — folder layout, frontmatter shape, ID numbering, status transitions, atomic resolve, the `op-*` command surface as capabilities. **It does not define a development workflow.** Whether you work straight to main, require PRs, run a multi-stage feature → integration → dev → main pipeline, use git worktrees, bump versions on every issue, or never bump versions at all is the **project's** decision, documented in that project's own `CLAUDE.md` (or equivalent). The skill stays out of the way.

The frontmatter fields `commits:`, `pr:`, `version:`, and `github_issue:` are **optional capabilities** the skill exposes for projects that want them. Whether and when to populate them is project policy. If your project's `CLAUDE.md` says nothing about commit tracking, branching, or release cadence, treat those concerns as out of scope for the skill — do what the project tells you, and if the project says nothing, ask the user rather than inventing a convention.

All vault mutations go through the **`op-obsidian`** plugin. Probe once per session and cache the result:

```bash
obsidian eval code='({enabled: app.plugins.enabledPlugins.has("op-obsidian"), version: app.plugins.plugins["op-obsidian"]?.manifest?.version})'
```

If the plugin is missing or disabled, **stop and ask the user to install/enable it** rather than improvising with raw `obsidian` CLI primitives — the plugin owns filename sanitization, ID numbering, frontmatter shape, atomic move-and-trash on resolve, and the JSON response payload. For emergencies where the user can't enable it, [`reference/cli-gotchas.md`](reference/cli-gotchas.md) documents the raw-CLI fallbacks (including the read-append-rewrite recipe for appending to `commits:` without `op-append-commit`).

**Delegating vault/CLI work.** This plugin ships an `obsidian-ops-specialist` subagent. When you're a coding agent working an issue and the next step is a raw Obsidian CLI call, a vault introspection, or a mutation the plugin owns, prefer delegating it via the Agent tool (`subagent_type: obsidian-ops-specialist`) over running the CLI yourself. The specialist knows the CLI gotchas, the op-obsidian dispatch surface, and keeps vault-side behavior consistent with this skill's lifecycle rules. You still own the skill's invariants — the specialist executes, you orchestrate.

Run `obsidian vault` once to learn the active vault path; cache it.

## Link back to the issue note

Whenever you surface a vault path to the user — post-action summaries, the "may I resolve?" confirmation pause, any step that mentions an issue or seed note — pair the path with a clickable `obsidian://` URI so the user can jump straight to the note without copy-pasting.

- Cache the vault **name** (not just the path) from the first `obsidian vault` call — it's the first tab-separated column on the `path\t…` line (e.g. `Agent-Vault`).
- Canonical URI: `obsidian://open?vault=<vault-name>&file=<vault-relative-path-without-.md>`.
- Source of truth for the vault-relative path: the plugin's JSON payload at `Projects/_scratch/op-last-response.md`. Prefer it over reconstructing paths by hand.
- Encoding: URI-encode the vault name if it contains spaces; for the file component, `encodeURIComponent` is safest but you may leave `/` unescaped for readability — Obsidian accepts either. Strip the trailing `.md`. `#` and `?` in filenames **must** be percent-encoded (`%23`, `%3F`) or the URI parses wrong.
- Render alongside the path so terminal users still see something useful:

  ```
  path: Projects/obsidian-projects/ISSUES/OP-102 ….md
  [Open in Obsidian](obsidian://open?vault=Agent-Vault&file=Projects%2Fobsidian-projects%2FISSUES%2FOP-102%20…)
  ```

Example: `obsidian://open?vault=Agent-Vault&file=Projects%2Fobsidian-projects%2FISSUES%2FOP-102%20Update%20agent%20guidance%20…`

---

## Plugin commands

All `op-*` commands take `key=value` arguments (not `--flag`). Each prints a one-line summary to stdout and writes a full JSON payload to `Projects/_scratch/op-last-response.md` — read that note for structured fields (paths, trashed-task list, etc.).

| Command | Required | Optional | Effect |
| :--- | :--- | :--- | :--- |
| `op-scaffold` | `slug`, `prefix` | `repo_path`, `title`, `priority`, `scope`, `scope_mode` | creates `Projects/<slug>/<slug>.base` + `STATUS.md`; writes `repo_path:` (absolute path only) if given; seeds `<PREFIX>-1` if `title` given. `scope_mode=bullets\|body` matches `op-new` semantics |
| `op-new` | `project`, `title` | `priority`, `scope`, `scope_mode`, `github_issue` | creates next-N issue with sanitized filename and schema-conformant frontmatter. Default `scope_mode=bullets` splits `scope=` on newlines and wraps each line as `- [ ]`; rejects payloads containing `## ` H2s or code fences (would be flattened). Pass `scope_mode=body` to write `scope=` verbatim under `## Scope` (bullets, paragraphs, code fences allowed; H2s still rejected since they would terminate the section). When the plugin's `autoCreateGithubIssue` setting is on and no `github_issue` is passed, also runs `gh issue create` in the project's `repo_path` and writes the URL to `github_issue:` |
| `op-work` | `issue` | — | sets `status: in-progress`; creates the initial TASKS note |
| `op-append-commit` | `issue`, `sha`, `subject` | — | idempotent append to issue's `commits:` list |
| `op-set-pr` | `issue`, `url` | — | sets scalar `pr:` |
| `op-get-workflow` | `project` | — | reads `Projects/<project>/WORKFLOW.md` (the project's SDLC policy, optional). Returns `{exists, path, content, size}`. Read-only. |
| `op-set-scope` | `issue`, `scope` | `mode=scope\|body` | default `mode=scope` replaces the issue body's `## Scope` section (appends it if missing); payload is markdown without H2 headings. `mode=body` replaces the entire body content after the optional `# Title` heading; payload may include H2s. This is the one mutation the plan-mode agent is allowed, so it can persist a refined plan back to the issue note. |
| `op-set-link` | `issue`, `relation`, `target` | — | writes both sides of an inter-issue link atomically. Plugin owns the inverse — agents MUST NOT touch link frontmatter directly. Relations: `parent` / `children` (many-to-one), `depends_on` / `depended_on_by` (many-to-many), `related_to` (symmetric). |
| `op-remove-link` | `issue`, `relation`, `target` | — | removes both sides of a link. Idempotent. |
| `op-link-check` | — | `repair=true` | walks every issue, reports any one-sided link drift (`missing-inverse` / `dangling-target`); with `repair=true` reconciles drift by re-applying links. |
| `op-migrate-links` | — | — | one-shot rewrite of legacy `parent_issue` / `subissues` to canonical `parent` / `children`. Idempotent. |
| `op-resolve` (or `op-close-current-issue`) | `issue` (or `path`) | `status=wontfix` | sets `status: resolved`, writes `resolved: <today>`, moves into `RESOLVED ISSUES/`, trashes linked TASKS — atomically. When `closeGithubIssueOnResolve` is on and the issue has a `github_issue:` URL, also runs `gh issue close` on it; the JSON response reports `githubClosed` / `githubCloseError` |

`scope` is a single value containing newline-separated bullets. To pass richer markdown (paragraphs, sub-bullets, code fences) for the issue's `## Scope` section, set `scope_mode=body` and the payload is written verbatim. H2 headings (`## ...`) are rejected in either mode because they would terminate the Scope section.

**URI senders (`obsidian://op-new?…`):** Obsidian's protocol parser is `Record<string, string>` and last-wins, so repeated `scope=a&scope=b` keys collapse to only the last value. Pack multi-value lists into a single `scope=` param using `%0A` (newline) or `,` as the delimiter; the plugin's `collectRepeated` helper splits on either. Spaces and `+`: the parser uses `decodeURIComponent`, which leaves `+` untouched — but the plugin normalizes `+` → space at the dispatch boundary to match `URLSearchParams.toString()` semantics. To preserve a literal `+`, encode it as `%2B`.

Prefix → slug is **not** a plugin command — scan `Projects/*/STATUS.md` directly and read the `prefix:` frontmatter to disambiguate. Do not use `obsidian search` for this (it misreads `prefix:` as a query operator). **Legacy fallback:** if no `STATUS.md` declares that prefix (pre-`prefix:`-field projects, or the file is missing), scan `Projects/*/ISSUES/<PREFIX>-*.md` and `Projects/*/RESOLVED ISSUES/<PREFIX>-*.md` filenames instead and infer the slug from the parent folder. If still no match, stop and ask the user for the slug, then write `prefix:` into that project's `STATUS.md` before continuing so the next lookup is deterministic.

---

## Verb: scaffold

`/op:scaffold <slug> <PREFIX> [<title>]`

1. Validate `slug` (lowercase + hyphens, `Projects/<slug>/` doesn't already exist).
2. If the project has a code repo, ask the user for its absolute path (e.g. `/Users/you/Projects/<slug>`) and pass it as `repo_path=`. The plugin writes it to `STATUS.md` frontmatter, where `op:open-agent` reads it to set the agent's working directory and skip the working-dir modal. Must be absolute — no `~`, no vault-relative. Skip this prompt for meta-only projects with no repo.
3. Run `obsidian op-scaffold slug=<slug> prefix=<PREFIX> [repo_path=/abs/path] [title="…"] [priority=med] [scope="bullet 1\nbullet 2"]`.
4. Report `projectFolder`, `basePath`, `statusPath`, and `seedPath` (if any) from the JSON response — and include the `obsidian://` link for `seedPath` if it was created. Suggest `/op:new <slug>` next.

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
4. Run `obsidian op-new project=<slug> title="<title>" priority=<low|med|high> [scope="bullet 1\nbullet 2"]`. For multi-paragraph scope or scope with code fences/sub-bullets, add `scope_mode=body` so the payload is written verbatim under `## Scope` instead of being wrapped per-line as `- [ ]`. Bullets-mode payloads must not contain `## ` H2s or code fences — the plugin rejects them rather than mangle the body.
5. Report the new id and path, and include the `obsidian://` link for the new issue note so the user can open it in one click; suggest `/op:issue <PREFIX>-<N>`.

---

## Verb: work

`/op:issue <project-or-prefix> [<N-or-ID>]`

### Pick the issue

Accepts `slug N`, `slug PREFIX-N`, `PREFIX N`, `PREFIX-N`, or just `slug`/`PREFIX` (auto-pick). Without N, prefer the lowest-numbered `in-progress`, else the lowest-numbered `open`. Multiple matches → stop and ask.

### Start

1. `obsidian op-work issue=<PREFIX>-<N>`. Emit a one-line ack with the issue's `obsidian://` link so the user can open the note while you write `## Plan`.
2. **Check for a project workflow.** Read `Projects/<slug>/WORKFLOW.md` if it exists — that's the project's authoritative SDLC policy (branching, version cadence, PR rules, commit-to-issue mapping). Programmatic access: `obsidian op-get-workflow project=<slug>` returns `{exists, path, content}`. If absent, the project has no opinion — ask the user when policy ambiguity comes up. (When you're launched via `op:open-agent`, the kickoff prompt already inlines the workflow text up to a configurable cap; use the CLI when you need the full file or want to verify.)
3. If the body is empty or one line, scope is ambiguous — state your interpretation and confirm before implementing, even in auto mode.
4. Reconcile scope vs. current repo/vault state — skip items already done; flag drift between the schema and observed reality.
5. **Write the `## Plan` section now** (approach, key decisions, files to touch, risks). Reconcile, don't overwrite: if the section already has user or prior-agent content, extend/refine rather than replace. Replace the italic placeholder if still present.
6. The plugin creates the first TASKS note for you. For additional logical subtasks, create more TASKS notes (`obsidian create` is fine for these auxiliary notes — they're trashed at resolve).
7. **Mirror every TASK note into a `## Tasks` checklist in the issue body.** After creating the TASK notes (planned upfront, or fix-up tasks discovered mid-session), append a line to the issue body's `## Tasks` section for each one:

   ```markdown
   ## Tasks

   - [ ] <ISSUE-ID>.<N> — <task title>
   ```

   Reconcile rather than overwrite: if the section already exists (prior session, completed task, user-authored entry), preserve existing entries (`- [completed]` / `- [x]`) and append any new tasks not already listed. Mark entries `- [completed]` when the corresponding TASK note flips to `status: completed`. The body checklist is the durable record — TASK notes are trashed at resolve, the issue body isn't.

   When a TASK note flips to `status: completed`, also **append a `### <ISSUE-ID>.<N> — <title>` block under `## Notes`** recording what was done and any deviations from the plan. Idempotent: if that block already exists, update it in place rather than duplicating.
8. Confirm before any action affecting shared systems (push, release, deploy, external API).

**Reconcile rule for legacy issues.** If the issue body is missing any of `## Plan`, `## Notes`, or `## Summary`, insert the missing sections in canonical order (`Scope → Plan → Tasks → Notes → Summary`) before writing. Never modify user-authored prose in other sections.

### Tracking refs (capabilities, not policy)

The plugin exposes two capabilities for recording git artifacts on an issue:

```bash
# Append a commit ref (idempotent; safe to call repeatedly)
obsidian op-append-commit issue=<PREFIX>-<N> sha=<sha7> subject=<subject>

# Set the PR URL on an issue
obsidian op-set-pr issue=<PREFIX>-<N> url=<pr-url>
```

**When and whether to call these is project policy** — the project's `CLAUDE.md` decides whether `commits:` is mirrored 1:1 to commits, batch-filled at resolve, or never populated at all; whether PRs are required or skipped; whether commit subjects must reference the issue id. If the project says nothing, ask the user rather than inventing a cadence.

For diagnostic detail on what to do when these calls fail (git not a repo, missing id, plugin unreachable mid-session), see [`reference/cli-gotchas.md`](reference/cli-gotchas.md).

### Linking issues

Issue-to-issue links live as plugin-managed frontmatter fields. **Never write `parent`, `children`, `depends_on`, `depended_on_by`, or `related_to` directly** — call `op-set-link` / `op-remove-link` and let the plugin maintain both sides. Direct frontmatter edits are tolerated for human convenience but `op-link-check` will flag the drift.

Canonical relations and call shape:

```bash
# X is a child of umbrella Y (many-to-one)
obsidian op-set-link issue=OP-95 relation=parent target=OP-92

# Equivalent from the umbrella side (same effect — plugin writes both)
obsidian op-set-link issue=OP-92 relation=children target=OP-95

# X blocks on Y (many-to-many)
obsidian op-set-link issue=OP-X relation=depends_on target=OP-Y

# X and Y are related (symmetric)
obsidian op-set-link issue=OP-X relation=related_to target=OP-Y

# Remove a link (idempotent)
obsidian op-remove-link issue=OP-95 relation=parent target=OP-92

# Audit the entire vault for one-sided drift
obsidian op-link-check                # report-only
obsidian op-link-check repair=true    # reconcile drift in place
```

Resolved-folder issues are valid link targets — a parent→child link must remain valid after the child resolves and moves into `RESOLVED ISSUES/`. The plugin's resolver looks at both folders.

When you discover a parent/child relationship mid-session, set the link with `op-set-link` and append a one-line note in the issue's `## Notes` block — don't paste a bare wikilink.

If the issue has a `github_issue:` frontmatter field, it mirrors a GitHub issue. The URL may have been populated automatically at `op-new` time (when `autoCreateGithubIssue` is on) or set later via the plugin's "Set GitHub issue URL" command. While working, treat it as a one-way mirror: you may comment on, label, or reference the GH issue, but do **not** close it manually — the plugin closes it atomically during `op-resolve` (see below). If the user asks "is the GitHub issue still open?", check live state with `gh issue view <url>` rather than inferring from the op status.

---

## Verb: resolve

`/op:resolve` (or run at the tail of `work`).

1. **Write the `## Summary` section** in the issue body (shipped behavior, PR link, `<sha7> <subject>` commits, follow-ups) before the confirmation pause. Show its diff in the resolution preview. Replace the italic placeholder if still present; reconcile with any existing prose rather than overwriting.
2. **Always pause for explicit user confirmation before mutating vault or repo** — even in auto mode. Show the planned transition:
   - Source → target: `Projects/<slug>/ISSUES/<filename>` → `…/RESOLVED ISSUES/<filename>` — include the issue's current `obsidian://` link so the user can click through and verify before approving

   - Frontmatter: `status` → `resolved` (or `wontfix`), `resolved` → `<today>`
   - TASKS to trash (list each path)
   - `commits:` status: "set" / "empty" — surface either as a fact; whether to back-fill is the project's call
   - Any project-specific resolve actions (release, version bump, deploy) — only if the project's policy calls for them; otherwise omit
   - GitHub issue: if `github_issue:` is set and `closeGithubIssueOnResolve` is on, note that the plugin will run `gh issue close` on the URL as part of `op-resolve` — do **not** close it yourself beforehand
3. **`commits:` back-fill is optional and project-driven.** If the project's policy is to record shipped commits on the issue and `commits:` is empty, offer to back-fill from `git log` (referencing the issue id) via `op-append-commit`. If the project doesn't track commits this way — or doesn't have a code repo — skip this step.
4. **Project-specific release/version steps run here, if the project has any.** If the project's policy ties resolve to a release or version bump, follow the project's `CLAUDE.md` (or equivalent) for the procedure. The schema reserves `version:` on the issue for recording the release identifier shipped, but *when* and *how* to set it is the project's call. Meta-only projects with no release artifact skip this step entirely.
5. `obsidian op-resolve issue=<PREFIX>-<N>` (or `status=wontfix`). The plugin moves the file, sets `status` and `resolved:`, and trashes linked TASKS atomically. If the issue has a `github_issue:` URL and `closeGithubIssueOnResolve` is on, the plugin also runs `gh issue close` on it — check `githubClosed` / `githubCloseError` in the JSON response. **DOCS are never touched.**
6. Report: external changes (URLs, commands run, including the linked GH issue if it was auto-closed), vault changes (paths from the JSON response — include the `obsidian://` link for the **post-move** `RESOLVED ISSUES/…` path so the user can open the resolved note directly), and any manual follow-ups (e.g. retrying `gh issue close` manually if `githubCloseError` is set).

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
