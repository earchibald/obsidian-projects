---
project: obsidian-projects
type: doc
doc_type: adr
issue: "[[OP-19 Research migrate key op functionality to an Obsidian plugin, paired with slimmer skill]]"
created: 2026-04-20
status: draft
tags:
  - project/obsidian-projects
  - doc
---

# OP-19 — Split `op` into an Obsidian plugin + a thin skill

## Context

The `op` skill today is ~316 lines of prose that Claude loads every time it touches a Projects-schema vault. Roughly two-thirds of it is *mechanics* — CLI incantations, sanitization rules, list-property rewrite recipes, prefix→slug scans, gotchas — and one-third is *judgment* — scope reconciliation, confirmation gates, semver classification, what to back-fill from git, when to stop and ask.

Every mechanical rule we encode in prose has three costs: tokens on every load, LLM variance ("guess property:add"-style failures), and drift between doc and reality. A companion Obsidian community plugin could own the deterministic parts as typed TypeScript commands; the skill would shrink to "call command X, then judge Y."

## Hot-path inventory — code vs. prompt

| Current behavior | Belongs in | Why |
|---|---|---|
| Vault discovery (`obsidian vault`, cache path) | **code** | Deterministic; plugin runs *inside* the vault — `app.vault.adapter` is free. |
| Prefix → slug scan (read every `STATUS.md`) | **code** | Pure lookup over frontmatter; no judgment. Currently a CLI workaround for a broken `search` operator. |
| Next-N computation across ISSUES/ + RESOLVED/ | **code** | Max+1. Pure. |
| Filename sanitization (OP-15 ruleset) | **code** | Spec is 5 deterministic rules; LLM sometimes still slips. |
| Issue note creation (path, frontmatter defaults, `# Title` body) | **code** | Schema-conformant writes with one template. |
| `property:set` list-append cycle (read → append → rewrite) | **code** | The CLI has no `property:add`; plugin uses `app.fileManager.processFrontMatter` and appends natively. |
| Issue lifecycle transition (set status, move to RESOLVED/, date-stamp) | **code** | One atomic operation. |
| TASKS trashing on resolve | **code** | Enumerate by frontmatter `issue:` backlink, `app.vault.trash`. |
| DOCS preservation | **code** | Negative rule enforced by not touching them. |
| Commit back-fill from `git log` (regex on issue id) | **code** (with prompt confirm) | Mechanical scan; decision to include is user-gated. |
| Semver bump on skill changes | **code** | `plugin/package.json` + manifest version; plugin can expose `op:bump-version`. |
| STATUS.md embed syntax | **code** | Generated once at scaffold. |
| Base dashboard scaffolding | **code** | Copy-from-reference, substitute slug. |
| — | — | — |
| Scope reconciliation ("is this item already done?") | **prompt** | Requires reading repo state and judging equivalence. |
| Scope parsing from free-text descriptions | **prompt** | Ambiguous input → structured checklist. |
| Confirmation gates before destructive / external actions | **prompt** | Risk judgment lives with the agent. |
| "Is this issue a meta-only project or code repo?" | **prompt** | Depends on context the plugin can't see (linked repo, user intent). |
| Commit message crafting / which commits belong to which issue | **prompt** | Inference from diff + context. |
| "Should we bump major/minor/patch?" | **prompt** | Semver is judgment; plugin only applies the chosen bump. |
| Stale-schema flagging | **prompt** | Compare observed state against doc. |
| User-facing narration and end-of-turn summary | **prompt** | Conversational. |

Rough split: ~70% of current skill prose maps to code; ~30% is irreducibly judgment.

## Plugin hosting survey

An Obsidian community plugin can host every "code" row above. Shape:

- **Plugin id:** `obsidian-projects-op` (or shorter; `op` is probably taken).
- **Commands exposed in Command Palette + URI scheme:**
  - `op:scaffold` — prompts for slug / PREFIX / optional title; writes base + STATUS + folders.
  - `op:new` — prompts for project + title; writes issue with next-N id.
  - `op:work` — sets status in-progress on the active / chosen issue; optionally creates first TASK.
  - `op:resolve` — transitions status, moves file, trashes TASKS, stamps `resolved:`.
  - `op:append-commit` — takes `{issueId, sha, subject}`, rewrites `commits:` list.
  - `op:set-pr` — sets `pr:` scalar.
  - `op:backfill-commits` — scans git log (via Node child_process) for issue-id references since last resolved date, returns candidate list for confirmation.
  - `op:find-issue` — resolves any of `PREFIX`, `PREFIX-N`, `slug`, `slug N` to a file path.
- **Invocation from Claude:** `obsidian uri` / `obsidian command` — the plugin reads args from a transient JSON file or URI query params. Alternative: expose a local HTTP surface via the existing Local REST API plugin, but that adds a dependency. Simplest v1: commands take args via a modal when run from the palette, and via `obsidian://op-<verb>?...` URIs when run from Claude, with JSON responses written back to a scratch note the skill reads.
- **Writing conventions:** identical frontmatter / folder layout to today — plugin is a re-implementation of the skill's writes, not a new schema. Migration is a no-op.
- **Surface the plugin owns that the skill can't easily:** live Command Palette discoverability for the human user, undo integration (`app.vault.trash` is reversible), proper modal prompts, and frontmatter edits that don't race with Obsidian's own caches (the CLI's `property:set` occasionally fights the editor).

No deal-breakers. Main implementation cost: Obsidian's plugin API surface for frontmatter (`processFrontMatter`) and folder/file ops is well-trodden; the git-log scan is the only piece that needs `child_process` (desktop-only — acceptable; this is a developer tool).

## `op:open-agent` — launching a coding agent for an issue

A core win of hosting `op` in a plugin: the Command Palette becomes the obvious launch point for "start coding on this issue." The flow:

1. User opens an issue note (or runs `op:open-agent` while one is active).
2. Plugin reads the issue frontmatter + body.
3. Plugin resolves the **working directory**: either `project.repo_path` on the project's STATUS.md (new field) or a per-project plugin setting; fallback prompts the user and persists the answer.
4. Plugin resolves the **agent**: default from plugin settings, overridable via modal at runtime. Auto-detects which of Claude Code / Gemini CLI / Copilot CLI are installed (PATH probe + known install locations) and only offers those.
5. Plugin spawns a terminal (macOS: `open -a Terminal` / iTerm URI / VS Code integrated terminal depending on another setting) in that cwd, running the chosen agent with an initial prompt that injects:
   - The issue id, title, and body.
   - A skill-trigger hint so the agent loads the right skill immediately (Claude: the `/op:issue <ID>` slash-command string; Gemini: an `activate_skill` nudge; Copilot: a `skill` tool-call hint).
   - The path to the issue note inside the vault, so the agent can read/write it directly.

### Per-agent profiles

The three agents diverge on configuration and prompt-injection surface area. Each needs its own profile in the plugin:

| | **Claude Code** | **Gemini CLI** | **Copilot CLI** |
|---|---|---|---|
| Launch binary | `claude` | `gemini` | `copilot` (GitHub CLI `gh copilot` variant exists too) |
| Project config file | `CLAUDE.md` (+ `.claude/settings.json`) | `GEMINI.md` | `AGENTS.md` |
| Skill system | `Skill` tool + plugin skills | `activate_skill` tool, session-start metadata | `skill` tool, plugin-sourced |
| Initial-prompt injection | CLI accepts positional prompt arg and/or `-c "<prompt>"`; slash commands usable in-prompt | CLI accepts prompt arg; needs explicit `activate_skill` call early | CLI accepts prompt arg; skill is invoked via `skill` tool |
| Settings surface | `~/.claude/settings.json`, project `.claude/settings.json`, permissions allowlist | `~/.gemini/settings.json` | `~/.github/copilot-cli/config` (exact path varies) |
| Auto-mode equivalent | `--permission-mode auto` | `--yolo` | `--yolo` |

What this means for the plugin:

- **Profile = a small object** per agent type: `{binary, launchFlags, promptPreamble, skillTriggerFormat, workingDirHandling}`. Ship defaults for all three; expose each as editable JSON in plugin settings.
- **Prompt template** is shared across agents at the content level (same issue context, same skill-trigger intent) but wrapped per-profile with the correct syntax. E.g. Claude wraps with `/op:issue OP-19\n\n<context>`; Gemini with an `activate_skill("op")`-styled preamble; Copilot with a `skill: op` hint.
- **Detection probe** runs at plugin startup and on-demand: `which claude`, `which gemini`, `which copilot` / `gh copilot --version`. Cache results; re-probe when the user opens the agent-selection modal.
- **Working directory** is per-project, not per-agent. One setting, three profiles.
- **Terminal strategy** is orthogonal to agent choice but also per-OS; v1 ships macOS support only (the only platform we run on) with a pluggable hook for Linux/Windows later.

### Why the plugin (not the skill)

Spawning a terminal + subprocess with environment inheritance is firmly a code job — Obsidian plugins can do it via Node (`child_process.spawn`, `app.vault.adapter.getBasePath()` for cwd context). The skill version would have to tell the user to copy-paste commands, which defeats the whole point. This is one of the clearest wins for the plugin split and should be a **Phase 1** deliverable, not a later phase.

### Decisions

- **Inverse command.** Ship `op:close-current-issue` alongside `op:open-agent` — callable from inside the agent via the same URI scheme, closes the loop so the agent can finish its own work without the human tabbing back to Obsidian.
- **Injection default.** Full issue body. Sane settings knobs to expose:
  - `injectBody` (bool, default `true`) — if false, inject only id + title + vault path.
  - `maxBodyChars` (int, default e.g. `8000`) — hard cap; over-limit bodies are truncated with a pointer to the note path.
  - `includeTasksList` (bool, default `true`) — inject backlinked TASKS notes by title so the agent sees the plan.
  - `includeRecentCommits` (int, default `5`) — last N `commits:` entries, for resumption context.
  - `extraPreamble` (string, default empty) — user-editable prefix prepended to every launch (e.g. a house-style reminder).
- **Profiles.** Read-only base profiles ship with the plugin; user overlay in settings merges on top by key. Keeps plugin upgrades from clobbering user tweaks and gives us a single place to bug-fix defaults.

## Distribution evaluation

| Channel | Pros | Cons | Verdict |
|---|---|---|---|
| **Community plugin store** | Auto-update, discoverable, one-click install | Review queue (~1–4 weeks), requires public repo, ongoing maintenance visible to strangers | Aim here eventually; not blocking v1. |
| **BRAT** | Install from any GitHub repo, auto-updates on release, no review | Users need BRAT; still a ~two-step install | **Recommended for v1 and v2.** |
| **Sideload** | Zero infra | Manual updates; painful across machines | Only as a fallback for local dev. |

Maintenance cost of a second TypeScript surface (plugin) alongside the existing Claude plugin (`plugins/op/`): modest. They already share a monorepo (`/Users/earchibald/Projects/obsidian-projects`) and a version number could track together. CI needs one additional `esbuild` step for the Obsidian plugin bundle and a release workflow that attaches `main.js` + `manifest.json` to GitHub releases (BRAT-compatible). No new language, no new test runner.

## Slimmer skill — what stays vs. what leaves

**Stays in the skill (judgment, orchestration, narration):**
- Verb dispatch table and when each verb applies.
- Scope-ambiguity detection ("body is empty → stop and confirm").
- Scope reconciliation against repo/vault state.
- Confirmation gates (external actions, resolve transition, git push, version bump).
- Semver classification guidance.
- Commit-crafting and issue-id linkage.
- Staleness flagging when observed state contradicts docs.
- Meta-only-project detection (skip `commits:` / git back-fill).
- Interaction style, end-of-turn summary discipline.

**Leaves (now a one-line plugin call):**
- Vault discovery, prefix scans, next-N, sanitization, folder layout, `property:set` list-rewrite dance, move-to-RESOLVED, TASKS trash, STATUS/base scaffolding, filename construction.
- The entire "CLI gotchas" section (no `property:add`, `search` operator collision, `--help` bug, stale index crash, `move to=` vs `dest=`): gone — the plugin abstracts them.

Estimated post-split size: ~80–120 lines of SKILL.md (vs. 316 today). Most of that is verb descriptions and confirmation-gate prose. The schema reference shrinks too: the plugin *is* the schema, so `reference/schema.md` becomes a short human-readable summary rather than a machine-consumed spec.

## Recommendation

**Proceed with the split, in three phases:**

1. **Phase 1 — plugin MVP (behind a flag, skill unchanged).**
   Ship `op:new`, `op:resolve`, `op:work`, `op:append-commit`, `op:find-issue`, and `op:open-agent` (with Claude / Gemini / Copilot profiles) as Obsidian commands callable via URI. Distribute via BRAT. Skill continues to use CLI paths; plugin commands are opt-in so the skill keeps working on users without the plugin installed.

2. **Phase 2 — skill dual-path.**
   Skill detects plugin presence (`obsidian command list` or equivalent) and prefers plugin calls when available, falling back to CLI. This is the risky transition; dual-path prose temporarily bloats SKILL.md before Phase 3 compresses it.

3. **Phase 3 — skill slim-down.**
   Once plugin adoption is universal (i.e. our own usage), drop the CLI fallbacks, delete the CLI-gotchas section, and ship the ~100-line skill. `reference/schema.md` becomes human documentation, not a machine-consumed spec.

4. **Phase 4 — sidebar view.**
   Ship the sidebar leaf described under [Sidebar view](#sidebar-view--deferred-but-pre-planned): three tabs (Issues / In flight / Recently resolved), reading from the `IssueStore` and event bus that Phase 1 will have already built. This is the pull that justifies community-plugin-store submission — a human-facing surface, not just an agent-facing command set.

**Defer:** community-plugin-store submission until Phase 4 lands. BRAT is sufficient through Phases 1–3.

**Do not defer:** filename sanitization, list-append, and prefix scan into the plugin. These are the three places where the LLM has actually produced wrong output historically (OP-15, CLI-gotcha note about `property:add`, `search` operator collision). Code wins where the mistakes are.

## Sidebar view — Phase 4, pre-planned in Phase 1

The sidebar is its own phase (Phase 4 in the Recommendation above) — shipped after the skill slim-down, and the deliverable that justifies community-plugin-store submission. Phase 1 architecture must not paint us into a corner. Design constraints to honor now:

- **State layer.** All issue/task queries the plugin makes should go through a single internal `IssueStore` (reads frontmatter via `app.metadataCache`, caches by file path, invalidates on vault change events). Commands call the store; the future sidebar subscribes to it. Do not let individual commands read the filesystem directly — that's the mistake that makes a view expensive to add later.
- **Event bus.** Emit events on lifecycle transitions (`issue:created`, `issue:status-changed`, `issue:resolved`, `task:created`, `commit:appended`). Phase 1 has no subscribers; Phase 2+ the sidebar re-renders off them. Cheap to add now, impossible to retrofit cleanly if commands mutate files directly.
- **Settings-panel separation.** Settings should be keyed by concern (`agents`, `workingDirs`, `injection`, `view`) so the eventual sidebar can add a `view` section without restructuring.
- **No sidebar-specific dependencies** (Svelte, React, Preact) pulled in yet — but leave the esbuild config able to add one cleanly. Commands alone need no framework.

Sidebar v-later will be a leaf with three tabs: (a) **Issues** — cross-project open-issues list filterable by project/assignee/status; (b) **In flight** — what's `in-progress` and which agent (if any) is attached; (c) **Recently resolved** — last 30 days with commit trail. All read from `IssueStore`; none of it requires changes to the Phase 1 command surface.

## Git-log scanning — keep it in the LLM

**Agreed — leave this with the reasoning model.** The plugin exposing a raw "give me commits since date X matching regex Y" is cheap, but you're right that the *interesting* judgment — which commits belong to which issue when multiple agents are touching the same repo in parallel — is exactly the kind of soft disambiguation a reasoning model handles gracefully and a regex does not. A hard-coded scanner would either over-claim (commit touched several issue files → assigned to one arbitrarily) or under-claim (commit message forgot the `(OP-N)` tag → missed).

Concrete split:
- **Plugin exposes:** `op:append-commit {issueId, sha, subject}` — dumb write-through.
- **Plugin does not expose:** a backfill scanner. The skill/agent runs `git log` itself, reasons about attribution, confirms with the user, and calls `op:append-commit` per accepted commit.

No disagreement from me. This is one of the clearer "LLM > code" boundaries in the whole split.

## Versioning — single version across surfaces

Single version number across the Claude plugin, the Obsidian plugin, the skill, and the marketplace entry. One `package.json`-style version field, bumped in lockstep via the existing semver-on-skill-changes workflow. Divergence is a problem we'll solve if it ever arrives; until then, one version keeps release notes and BRAT update cadence comprehensible.

## Recommended initial issues

Concrete issue backlog for Phase 1, ordered so each can ship and be validated before the next. Every issue gets one TASK note per bullet below (skill rule: always create TASKS, even for a single-step issue). Priorities assume we want a working end-to-end plugin before polishing any one surface.

> **The task skeletons below are starting-point hints, not contracts.** Whichever coding agent picks up an issue is responsible for **validating the skeleton against the current repo + vault state before implementing**: reconciling each bullet with what already exists, adding tasks the hint missed, striking tasks already satisfied, and flagging skeleton/reality drift to the user. Do not treat the skeleton as complete. The skill's existing "reconcile scope vs. reality" rule (from the `work` verb) applies in full.

### OP-20 — Scaffold the Obsidian plugin repo layout (**high**)
- [ ] Create `plugins/op-obsidian/` in the monorepo with `manifest.json`, `package.json`, `esbuild.config.mjs`, `main.ts` stub
- [ ] Wire `npm run dev` / `npm run build` producing `main.js`; add a release workflow that attaches `main.js` + `manifest.json` to GitHub releases (BRAT-compatible)
- [ ] Single-version script: bump `manifest.json`, `package.json`, Claude-plugin version in lockstep
- [ ] README pointing at BRAT install instructions

### OP-21 — `IssueStore` + event bus foundation (**high**)
- [ ] Define `IssueStore` reading frontmatter via `app.metadataCache`, keyed by file path
- [ ] Subscribe to vault change events; invalidate cache entries on edit/rename/delete
- [ ] Emit `issue:*` / `task:*` events on lifecycle-relevant mutations
- [ ] Smoke test: a dev-only command that dumps the store contents to console

### OP-22 — Plugin commands: `op:new`, `op:find-issue` (**high**)
- [ ] `op:find-issue` — accept `PREFIX`, `PREFIX-N`, `slug`, `slug N`; return file path; used by every other command
- [ ] `op:new` — modal for project + title + optional scope; computes next-N; writes issue note with schema-conformant frontmatter
- [ ] Filename sanitization implemented in TypeScript with unit tests for the OP-15 ruleset
- [ ] URI scheme: `obsidian://op-new?project=<slug>&title=<...>` for Claude to call

### OP-23 — Plugin commands: `op:work`, `op:append-commit`, `op:set-pr` (**high**)
- [ ] `op:work` — transition `status` → `in-progress`; create a default TASK note if none exist
- [ ] `op:append-commit` — read/append/rewrite `commits:` list atomically via `processFrontMatter`
- [ ] `op:set-pr` — scalar set of `pr:`
- [ ] URI schemes for each; JSON response written to a scratch note the skill reads

### OP-24 — Plugin command: `op:resolve` + `op:close-current-issue` (**high**)
- [ ] `op:resolve` — set `status: resolved`, stamp `resolved:`, move file to `RESOLVED ISSUES/`, trash TASKS notes via `app.vault.trash`
- [ ] Confirmation modal showing the planned transition (source → target, TASKS to trash, commits status) — mirrors the skill's resolve gate
- [ ] `op:close-current-issue` — thin wrapper callable via URI from inside an agent; uses the active file or a passed id
- [ ] Explicitly do-not-touch logic for DOCS/

### OP-25 — `op:open-agent` with per-agent profiles (**high**)
- [ ] Detection probe: `which claude` / `which gemini` / `which copilot`; cache; expose refresh action
- [ ] Read-only base profiles for Claude / Gemini / Copilot (binary, launch flags, prompt preamble, skill-trigger format, working-dir handling)
- [ ] User overlay merge in plugin settings
- [ ] Injection settings: `injectBody`, `maxBodyChars`, `includeTasksList`, `includeRecentCommits`, `extraPreamble`
- [ ] Working-dir resolution: project frontmatter → plugin setting → prompt + persist
- [ ] macOS terminal launch (start narrow; Linux/Windows hooks deferred)
- [ ] Modal at runtime for picking agent when default is unwanted

### OP-26 — Scaffold command: `op:scaffold` (**medium**)
- [ ] Modal for slug + PREFIX + optional seed title
- [ ] Copy reference `.base` file, substitute slug
- [ ] Write `STATUS.md` with `prefix:` frontmatter and `![[<slug>.base#Open Issues]]` body
- [ ] Optional seed issue if title supplied (reuses OP-22 path)

### OP-27 — Skill dual-path transition (**medium**, depends on OP-22 through OP-26)
- [ ] Skill detects plugin presence (URI ping or command list) on entry
- [ ] Each verb branches: plugin-path when present, CLI-path otherwise
- [ ] Keep CLI-gotchas section intact during this phase — it's still the fallback truth
- [ ] Regression-test both paths on a scratch vault

### OP-28 — Skill slim-down (**medium**, depends on OP-27 + plugin adoption)
- [ ] Delete CLI-path branches once we're exclusively on the plugin
- [ ] Delete CLI-gotchas section
- [ ] Rewrite verbs as "invoke command X, confirm Y, narrate Z"
- [ ] Target SKILL.md ≤ ~120 lines; `reference/schema.md` becomes human doc

### OP-29 — Sidebar view (**low**, Phase 4)
- [ ] Scaffold Svelte (or Preact) inside the plugin; confirm bundle-size budget
- [ ] Leaf with three tabs: Issues / In flight / Recently resolved
- [ ] All reads via `IssueStore`; re-render off event bus
- [ ] Settings section keyed under `view`
- [ ] Community-plugin-store submission prep: screenshots, description, review checklist

### Sequencing notes

- OP-20 and OP-21 are the only hard blockers; everything else depends on them.
- OP-22/23/24/25/26 can be parallelized across agents once the foundation lands — they share the store but not the files they mutate.
- OP-27/28 land once the plugin surface above is stable in our own daily use.
- OP-29 is explicitly not part of the critical path; pick it up once the skill has been slim for a while and the store/event-bus API has settled.

## Decision

Draft resolved on the three open points above. Awaiting final review on overall Phase 1 scope before moving from research → implementation planning.
