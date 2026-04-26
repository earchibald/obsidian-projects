---
name: op
description: Run the Obsidian Projects workflow — scaffold new projects, create/work/resolve issues, and maintain schema-conformant notes in an Obsidian vault that follows the Projects schema. Use whenever the user invokes /op:* commands or references an Obsidian project by ID prefix (e.g. JB-3, TMB-9, OP-11).
---

# Obsidian Projects (op) workflow

You are operating on an Obsidian vault that uses the **Projects schema** — a Jira-lite issue tracker where each project is a folder under `Projects/` and each issue/task/doc is a markdown note with structured frontmatter. Schema details live in `reference/schema.md` inside the op skill folder (the path your Claude Code surfaced this body from); read it on first use or when frontmatter shape comes up.

## Scope of this skill

This skill manages **vault state and the issue schema** only — folder layout, frontmatter shape, ID numbering, status transitions, atomic resolve, the `op-*` command surface as capabilities. **It does not define a development workflow.** Whether you work straight to main, require PRs, run a multi-stage feature → integration → dev → main pipeline, use git worktrees, bump versions on every issue, or never bump versions at all is the **project's** decision, documented in that project's own `CLAUDE.md` (or equivalent). The skill stays out of the way.

The frontmatter fields `commits:`, `pr:`, `version:`, and `github_issue:` are **optional capabilities** the skill exposes for projects that want them. Whether and when to populate them is project policy. If your project's `CLAUDE.md` says nothing about commit tracking, branching, or release cadence, treat those concerns as out of scope for the skill — do what the project tells you, and if the project says nothing, ask the user rather than inventing a convention.

All vault mutations go through the **`op-obsidian`** plugin. Probe once per session and cache the result:

```bash
obsidian eval code='({enabled: app.plugins.enabledPlugins.has("op-obsidian"), version: app.plugins.plugins["op-obsidian"]?.manifest?.version})'
```

If the plugin is missing or disabled, **stop and ask the user to install/enable it** rather than improvising with raw `obsidian` CLI primitives — the plugin owns filename sanitization, ID numbering, frontmatter shape, atomic move-and-trash on resolve, and the JSON response payload. For emergencies where the user can't enable it, the op skill's `reference/cli-gotchas.md` documents the raw-CLI fallbacks (including the read-append-rewrite recipe for appending to `commits:` without `op-append-commit`).

**Delegating vault/CLI work.** This plugin ships an `obsidian-ops-specialist` subagent. When you're a coding agent working an issue and the next step is a raw Obsidian CLI call, a vault introspection, or a mutation the plugin owns, prefer delegating it via the Agent tool (`subagent_type: obsidian-ops-specialist`) over running the CLI yourself. The specialist knows the CLI gotchas, the op-obsidian dispatch surface, and keeps vault-side behavior consistent with this skill's lifecycle rules. You still own the skill's invariants — the specialist executes, you orchestrate.

Run `obsidian vault` once to learn the active vault name and path; cache both.

**Target the vault explicitly on every CLI call.** The `obsidian` CLI accepts a top-level `vault=<name>` argument that routes the command at that named vault regardless of which Obsidian window is currently focused — e.g. `obsidian vault=Agent-Vault eval code='app.vault.getName()'`. Use it. Without it, the CLI binds to whichever vault happens to be the active window at that moment, which is a race when more than one agent (or the user) can switch focus between calls. The form is `vault=<name>` (key=value), **not** `--vault <name>`; `obsidian help` documents it as the only top-level option. See the op skill's `reference/cli-gotchas.md` for the canonical worked example.

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
| `op-work` | `issue` | `agent`, `agent_session` (alias: `session`), `force` | sets `status: in-progress`; creates the initial TASKS note. Optional params: `agent=` records the working agent id; `agent_session=` adds an opaque per-session id. If a different agent or session is already registered, returns `conflict` in the JSON payload and refuses to write (pass `force=true` to override). Force-overwriting a different agent without supplying `agent_session=` clears the stale session from the previous agent. |
| `op-append-commit` | `issue`, `sha`, `subject` | — | idempotent append to issue's `commits:` list |
| `op-set-pr` | `issue`, `url` | — | sets scalar `pr:` |
| `op-get-workflow` | `project` | — | reads `Projects/<project>/WORKFLOW.md` (the project's workflow file — modern `type: workflow` / `schema: 1` shape preferred; legacy plain prose still parses via the fallback ladder). Returns `{exists, path, content, size}`. Read-only. |
| `op-edit-workflow` | `project` | — | launches an agent in tmux to interview the user and author/refine `Projects/<project>/WORKFLOW.md` as a modern workflow file (frontmatter `type: workflow`, `schema: 1`, `default_agent`, `default_model`, ordered `steps:` referencing module ids; optional `extends:` to a global default). Window naming `op-workflow-<slug>` keeps it distinct from issue sessions. The session has full edit capability but is bounded to writing the workflow file (no `op-work` / `op-resolve` / version bump). |
| `op-edit-module` | `module` | `scope=global\|project`, `project` | launches an agent in tmux to author/refine a workflow module file. `scope=global` writes to `Projects/_op-modules/<id>.md`; `scope=project` writes to `Projects/<project>/MODULES/<id>.md` and requires `project=`. The session is bounded to a single module file — no `op-work` / `op-resolve` / version bump. Like `op-edit-workflow`, this is the editor entry point; agents working an issue should not call it directly without user intent. |
| `op-explain-workflow` | `issue`, `mode` | `agent` | renders the composed prompt for `<issue>` at `mode=kickoff\|evaluate\|plan\|implement\|review\|finalize`. **Read-only and non-destructive.** Use it to verify what an agent launch would inject before launching, or as a smoke probe after editing modules / workflow files. JSON payload: `composed.text` (verbatim launch text), `composed.chunks` (per-module breakdown with id / scope / sizeChars), `vars` (one row per **referenced user var** with its resolved value and the precedence layer that supplied it — `module` / `global` / `project` / `launch` / `null` if unresolved), `diagnostics` formatted through the unified WorkflowDiagnostic stream, plus the resolved `agent` and (when selectable) `model`. Does not return the workflow file path. |
| `op-list-vars` | — | `project`, `issue` | enumerates the **plugin var registry** (`PLUGIN_VAR_REGISTRY` — the always-on namespace covering `{{id}}`, `{{repo_path}}`, `{{today}}`, etc.), with `name`, `description`, `example`, and `currentValue` (resolved against the supplied `project=` / `issue=` context, or `null` when context-less or `compute` returned undefined). **Read-only.** This is the registry browser and the same data the Settings → "Available variables" reference panel renders. For **user-var** introspection (module-declared `vars:` and the four-layer precedence chain), use `op-explain-workflow` — its `vars` array has the per-var precedence breakdown. |
| `op-export-module` | `module`, `dest` | `scope=global\|project`, `project`, `include_used_workflow=true\|false` | bundles a module file into a single self-contained markdown export at `dest`. Includes the module's frontmatter + body, optionally appends the workflow file that uses it (when `include_used_workflow=true`). The bundle is plain-text-shareable across vaults; the receiving side imports with `op-import-module`. The export records its source path in the bundle so a round-trip is traceable. |
| `op-import-module` | `path` | `scope=global\|project`, `project`, `vars` | imports a bundle written by `op-export-module` into the current vault. Prompts for any module-supplied `name=VALUE` defaults that aren't already set unless `vars=` provides them. **Atomic + recorded:** every imported file is logged in a transaction record so `op-undo-last-import` can reverse exactly the last import. Conflicts (same module id already present) are surfaced as `module-conflict` diagnostics — resolve by editing locally, not by re-importing. |
| `op-undo-last-import` | — | — | reverses the most recent `op-import-module` transaction. Idempotent if no import has happened since the last undo (returns `noop`). Only the **most recent** import is undoable — no multi-step history. Use immediately after a regretted import; don't expect it to bail out yesterday's mistake. |
| `op-set-scope` | `issue`, `scope` | `mode=scope\|body` | default `mode=scope` replaces the issue body's `## Scope` section (appends it if missing); payload is markdown without H2 headings. `mode=body` replaces the entire body content after the optional `# Title` heading; payload may include H2s. Use this when you genuinely want to rewrite Scope or the whole body — not for routine Plan/Notes/Summary edits, where `op-set-section` is safer (it scopes to one section). |
| `op-set-evaluation` | `issue`, `evaluation` | — | replace (or append if missing) the issue body's `## Initial Evaluation` section. Frontmatter, the `# Title`, and every other H2 section are preserved; payload must not contain a bare `## ` H2 (would terminate the section). Use this when an evaluate-mode agent persists its output — it's section-scoped and won't clobber `## Plan`, `## Notes`, or `## Summary`. |
| `op-set-section` | `issue`, `name`, `content` | `append=true` | replace (or, with `append=true`, extend) the issue body's `## <name>` section. `name` must be one of `Plan`, `Notes`, `Summary`. Frontmatter, the `# Title`, and any other H2 sections are preserved; payload must not contain its own `## ` H2 (would terminate the section). Preferred path for the Plan/Notes/Summary writes the workflow does on every issue — including the racy `### <ID>.<N>` block append under `## Notes` as tasks complete. |
| `op-set-link` | `issue`, `relation`, `target` | — | writes both sides of an inter-issue link atomically. Plugin owns the inverse — agents MUST NOT touch link frontmatter directly. Relations: `parent` / `children` (many-to-one), `depends_on` / `depended_on_by` (many-to-many), `related_to` (symmetric). |
| `op-remove-link` | `issue`, `relation`, `target` | — | removes both sides of a link. Idempotent. |
| `op-link-check` | — | `repair=true` | walks every issue, reports any one-sided link drift (`missing-inverse` / `dangling-target`); with `repair=true` reconciles drift by re-applying links. |
| `op-migrate-links` | — | — | one-shot rewrite of legacy `parent_issue` / `subissues` to canonical `parent` / `children`. Idempotent. |
| `op-resolve` (or `op-close-current-issue`) | `issue` (or `path`) | `status=wontfix` | sets `status: resolved`, writes `resolved: <today>`, moves into `RESOLVED ISSUES/`, trashes linked TASKS — atomically. When `closeGithubIssueOnResolve` is on and the issue has a `github_issue:` URL, also runs `gh issue close` on it; the JSON response reports `githubClosed` / `githubCloseError` |

`scope` is a single value containing newline-separated bullets. To pass richer markdown (paragraphs, sub-bullets, code fences) for the issue's `## Scope` section, set `scope_mode=body` and the payload is written verbatim. H2 headings (`## ...`) are rejected in either mode because they would terminate the Scope section.

**URI senders (`obsidian://op-new?…`):** Obsidian's protocol parser is `Record<string, string>` and last-wins, so repeated `scope=a&scope=b` keys collapse to only the last value. Pack multi-value lists into a single `scope=` param using `%0A` (newline) or `,` as the delimiter; the plugin's `collectRepeated` helper splits on either. Spaces and `+`: the parser uses `decodeURIComponent`, which leaves `+` untouched — but the plugin normalizes `+` → space at the dispatch boundary to match `URLSearchParams.toString()` semantics. To preserve a literal `+`, encode it as `%2B`.

Prefix → slug is **not** a plugin command — scan `Projects/*/STATUS.md` directly and read the `prefix:` frontmatter to disambiguate. Do not use `obsidian search` for this (it misreads `prefix:` as a query operator). **Legacy fallback:** if no `STATUS.md` declares that prefix (pre-`prefix:`-field projects, or the file is missing), scan `Projects/*/ISSUES/<PREFIX>-*.md` and `Projects/*/RESOLVED ISSUES/<PREFIX>-*.md` filenames instead and infer the slug from the parent folder. If still no match, stop and ask the user for the slug, then write `prefix:` into that project's `STATUS.md` before continuing so the next lookup is deterministic.

---

## Workflow modules — what gets injected at launch

When an agent is launched against an issue (`op:open-agent` or the protocol URI), the plugin composes the kickoff and per-step prompts from a set of **workflow modules** rather than a monolithic per-project SDLC document. The composer is governed by the `workflowMode` setting:

- **`workflowMode: "modules"`** (default since OP-208) — modules drive injection. The plugin reads the project's workflow file, resolves the module set, and splices the rendered text in at the matching step.
- **`workflowMode: "legacy"`** — the pre-modules behavior. The plugin reads `Projects/<slug>/WORKFLOW.md` as opaque prose and pastes it into the kickoff prompt. Existing installs that explicitly set `legacy` keep that behavior on upgrade; only fresh installs (or installs that never wrote the field) pick up the new default.

### File layout

| Layer | Path | Applies to |
| :--- | :--- | :--- |
| Global module | `Projects/_op-modules/<id>.md` | Every project (unless shadowed). |
| Per-project module | `Projects/<slug>/MODULES/<id>.md` | Only project `<slug>`; shadows a same-id global silently. |
| Per-project workflow file | `Projects/<slug>/WORKFLOW.md` | Selects which modules participate at which step; declares default agent/model and may override per-step. |
| Global workflow default | `Projects/_op-workflow.md` (by convention) | Inherited via `extends:` from a per-project workflow. One level only — no chains. |

Module files are markdown with a small frontmatter block (`id`, `title`, `type: workflow-module`, `scope`, optional `agent` / `project` / `order` / `vars`). Workflow files are markdown with `type: workflow`, `schema: 1`, `default_agent`, `default_model`, and an ordered `steps:` list whose entries name modules by id and may override the default agent/model for that step.

Full file-format references live at `docs/specs/workflow-module-schema.md` and `docs/specs/workflow-file-schema.md`. Conceptual docs are at `docs/workflow-modules/`.

### Two template-var namespaces

Module bodies are templated through two distinct `{{…}}` namespaces — they look similar but resolve differently:

- **Plugin vars** — `{{id}}`, `{{repo_path}}`, `{{today}}`, `{{project}}`, `{{agent}}`, etc. These are the bare-name tokens. They come from a fixed registry (`PLUGIN_VAR_REGISTRY`) baked into the plugin and resolved at render time from the launch's `RenderContext`. **Not subject to precedence layers** — the registry is the only source. `op-list-vars [project=<slug>] [issue=<ID>]` is the registry browser and shows each var's resolved current value against the supplied context.
- **User vars** — `{{vars.<name>}}` (note the `vars.` prefix). Declared by workflow modules in their `vars:` frontmatter and resolved through a four-layer precedence chain — **higher layers override lower**:
  1. **Module default** — entries in a module's `vars:` list, written `name=value` in shorthand or `{ name: x, default: v }` in object form. Inline-list shape is `vars: [name=value]`; block-list shape is `vars:\n  - name=value`.
  2. **Global user** — `workflowVars` in the plugin's settings (`Settings → Workflows → Global variables`).
  3. **Project user** — the `vars:` map in `Projects/<slug>/STATUS.md`.
  4. **Launch override** — values supplied through the launch modal's variable override panel for this single launch.

`op-explain-workflow issue=<ID> mode=<step>` is the diagnostic surface for user vars: its `vars` array reports each referenced user var, the resolved value, and the precedence scope that supplied it (or `null` when unresolved).

### `scope:` is metadata, not step routing

A module's `scope:` field is **not** what routes its body into a workflow step. Routing happens via the workflow file's `steps[].modules` list — the composer walks each step's named module ids and concatenates their bodies. A module's `scope:` is metadata used for two things: surfacing on chunk records / diagnostics, and partitioning the intra-scope-collision check that flags two modules at the same `scope:` declaring the same user-var name. The set of valid scope names is open-ended; conventions emerging in shipped fixtures are `kickoff` / `plan` / `evaluate` / `implement` / `review` / `finalize`, but you can invent your own. **Setting `scope: foo` does not inject the module at step `foo` — listing the module id under `steps[].modules` does.**

### Per-step agent / model selection

Workflow files declare a default agent + model, then optionally override per step. Every shape `default_model` accepts (scalar / list / keyed-map) is also valid in a per-step `model:` slot:

```yaml
---
type: workflow
schema: 1
project: my-project
default_agent: claude
default_model: opus              # scalar — applies to every agent in default_agent
steps:
  - step: kickoff
    modules: [orient, branching]
    # inherits default_agent + default_model
  - step: plan
    modules: [plan-mode-rules]
    agent: claude
    model: sonnet                # per-step override; cheaper model for plan-mode reasoning
  - step: review
    modules: [adversarial-review]
    agent: [claude, gemini]      # list — launch context picks one
    model:                       # keyed-map — different model per agent
      claude: opus
      gemini: pro
  - step: finalize
    modules: [release-notes]
---
```

Both `agent` and `model` may be a scalar, a list, or (for `model`) a per-agent keyed map. List forms let the launch context pick — useful when more than one runtime can do the work. The composer validates every model name against the model registry; unknown names emit a `bad-model` diagnostic with a `BadModelSpec` payload (the recovery dialog renders a "did you mean?" picker straight from this).

### Visibility tenet for headless subtasks

OP-181 §"Visibility tenet": **every step is observable**. The plugin's `launchHeadlessSubtask` (the path used for evaluator subtasks and any other `claude -p` background invocation) takes a required `relaySession: RelaySession` arg — the typechecker rejects callers that omit it. Production paths construct a tmux relay; test paths construct a capture relay. The point is that no step produces output that disappears into a void; the user (or an enclosing orchestrator) always has a surface to watch. When you wire a new headless step, route its output through the relay rather than letting it silently complete.

### Verifying workflow injection

Two non-destructive CLIs let you preview what a launch would do without launching:

```bash
# Render the composed prompt + per-referenced-user-var precedence breakdown.
obsidian vault=<name> op-explain-workflow issue=<PREFIX>-<N> mode=kickoff

# Browse the plugin var registry (the {{id}} / {{repo_path}} / {{today}} namespace).
obsidian vault=<name> op-list-vars project=<slug> issue=<PREFIX>-<N>
```

Both write a JSON payload to `Projects/_scratch/op-last-response.md` and emit a one-line summary. Use `op-explain-workflow` as the smoke probe after editing modules or the workflow file (it reports diagnostics and shows exactly which body chunks would be injected and which user vars resolved at which precedence layer); use `op-list-vars` to confirm a plugin var resolves the way you expect against a given issue/project context.

### Sharing modules across vaults

`op-export-module` bundles a module (optionally with the workflow file that uses it) into a single self-contained markdown file. `op-import-module` ingests one in the receiving vault, prompting for any unbound `name=VALUE` defaults the bundle declares. Every import is recorded as a transaction; `op-undo-last-import` reverses exactly the most recent one (no multi-step history). Conflicts are surfaced as diagnostics rather than silently overwritten — resolve them locally, don't re-import.

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

1. `obsidian op-work issue=<PREFIX>-<N> agent=<your-agent-id> [agent_session=<session-id>]`. The `agent` value is your runtime's identity (`claude`, `codex`, `gemini`, `copilot`, …) — pass the literal id, not the model name. Only `claude` is exercised in this repo's dev workflow and tests; `gemini` and `copilot` are second-class scaffolding (the dispatch code accepts them but no part of the workflow has been validated against a live install — see the README's "Supported AI runtimes" section). The `agent_session` value should be a stable per-session identifier from your runtime; for Claude Code use `$CLAUDE_SESSION_ID` (exported in hook environments and via `--env`), and for other runtimes use whatever equivalent your harness exposes. Omit `agent_session=` if no stable id is available.

   Read the JSON payload at `Projects/_scratch/op-last-response.md` after the call:
   - `registered: true` and no `conflict` → you own the issue, proceed.
   - `alreadyHeld: true` → idempotent re-entry, proceed.
   - `conflict: { agent?, session? }` → another agent (or another session) is already registered. **Stop and ask the user** whether to take over — never pass `force=true` on your own. If they confirm, retry with `force=true`.

   Emit a one-line ack with the issue's `obsidian://` link so the user can open the note while you write `## Plan`.
2. **Check for a project workflow.** When you're launched via `op:open-agent` under `workflowMode: "modules"` (the default), the kickoff prompt has already been composed from the project's workflow modules — the rules you need are already in your context. To **verify** what was injected, dump the composed prompt with `obsidian op-explain-workflow issue=<PREFIX>-<N> mode=kickoff` (read-only, non-destructive). To inspect the raw workflow file, `obsidian op-get-workflow project=<slug>` returns `{exists, path, content}`. If the file is absent, the project has no workflow opinion — ask the user when policy ambiguity comes up; the **`op: edit project workflow (WORKFLOW.md)`** palette command (or `obsidian op-edit-workflow project=<slug>`) launches an agent dedicated to authoring/refining it, and `op: edit workflow module` (`obsidian op-edit-module module=<id> scope=<global|project> [project=<slug>]`) does the same for an individual module. Under `workflowMode: "legacy"`, the kickoff prompt inlines the raw `WORKFLOW.md` text up to a configurable cap — same diagnostic step (`op-explain-workflow`) still applies.
3. If the body is empty or one line, scope is ambiguous — state your interpretation and confirm before implementing, even in auto mode.
4. Reconcile scope vs. current repo/vault state — skip items already done; flag drift between the schema and observed reality.
5. **Write the `## Plan` section now** (approach, key decisions, files to touch, risks) via `obsidian op-set-section issue=<PREFIX>-<N> name=Plan content="…"`. The verb scopes the rewrite to `## Plan` only — frontmatter, `## Scope`, `## Tasks`, `## Notes`, `## Summary`, and any other sections are untouched. Reconcile, don't overwrite: if the section already has user or prior-agent content, read the file first (`obsidian read`) and pass the merged Plan as `content=` rather than blowing existing prose away. Replace the italic placeholder if still present.
6. The plugin creates the first TASKS note for you. For additional logical subtasks, create more TASKS notes (`obsidian create` is fine for these auxiliary notes — they're trashed at resolve).
7. **Mirror every TASK note into a `## Tasks` checklist in the issue body.** After creating the TASK notes (planned upfront, or fix-up tasks discovered mid-session), append a line to the issue body's `## Tasks` section for each one:

   ```markdown
   ## Tasks

   - [ ] <ISSUE-ID>.<N> — <task title>
   ```

   Reconcile rather than overwrite: if the section already exists (prior session, completed task, user-authored entry), preserve existing entries (`- [completed]` / `- [x]`) and append any new tasks not already listed. Mark entries `- [completed]` when the corresponding TASK note flips to `status: completed`. The body checklist is the durable record — TASK notes are trashed at resolve, the issue body isn't.

   When a TASK note flips to `status: completed`, also **append a `### <ISSUE-ID>.<N> — <title>` block under `## Notes`** recording what was done and any deviations from the plan. Use `obsidian op-set-section issue=<ISSUE-ID> name=Notes content="### <ISSUE-ID>.<N> — <title>\n\n…" append=true` — `append=true` extends the section instead of replacing it, which is the racy read-append-rewrite path the verb was built for. Idempotent at the agent level: before appending, check the current Notes section (`obsidian read`); if a block with the same `### <ISSUE-ID>.<N>` heading already exists, call `op-set-section name=Notes content="…"` (no `append=true`) with the merged Notes content to update in place rather than duplicating.
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

For diagnostic detail on what to do when these calls fail (git not a repo, missing id, plugin unreachable mid-session), see the op skill's `reference/cli-gotchas.md`.

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

1. **Write the `## Summary` section** in the issue body (shipped behavior, PR link, `<sha7> <subject>` commits, follow-ups) via `obsidian op-set-section issue=<PREFIX>-<N> name=Summary content="…"` before the confirmation pause. The verb only touches `## Summary`, leaving frontmatter and every other section untouched. Show its diff in the resolution preview. Replace the italic placeholder if still present; reconcile with any existing prose rather than overwriting.
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
