---
project: obsidian-projects
type: doc
doc_type: research
issue: "[[OP-53 perform comprehensive audit for code sanity, user experience, user]]"
created: 2026-04-21
status: draft
tags:
  - project/obsidian-projects
  - doc
---

# OP-53 — Comprehensive audit

Audit of the obsidian-projects repo across **four surfaces** × **five lenses** (code sanity, UX, configuration UX, inline help, documentary help). Findings were gathered by three parallel Explore agents (one per surface group) on 2026-04-21 against branch `op-53-audit` (worktree from `main` @ `053c74b`). This is a research deliverable — no code was changed. Recommendations are grouped at the end into proposed follow-up issues.

Severity legend: **H** = ship-blocker / silent breakage / user-facing confusion. **M** = noticeable papercut, fix soon. **L** = polish / future-proofing.

---

## 1. `plugins/op-obsidian/` (TS Obsidian plugin)

### Code sanity

- **H** `main.ts:57` — `void this.detector.refresh()` swallows promise rejection; only debug-logged. Surface to `Notice` on failure or fail-safe.
- **M** `openAgent.ts:141–145` — `getVaultBasePath` casts `adapter.basePath` / `getBasePath()` without null guards. Add explicit checks; return `undefined` with user-facing message.
- **M** `terminalLaunch.ts` — `LaunchArgs.debug?: boolean` declared twice. Drop the duplicate.
- **M** `eventBus.ts:19–20` — handler exception poisons subsequent handlers. Wrap `h(ev)` in try/catch + console.error.
- **L** `main.ts:84–86` — `onLayoutReady` agent-state reconciliation has no synchronization; concurrent startup deletes can miss stale registrations. Gate on a one-shot flag or queue until store ready.
- **L** `main.ts:377` — `EventBus.clear()` on unload doesn't drain pending async handlers; orphaned promises can touch destroyed APIs. Add a "no new registrations" flag, drain, then clear.
- **L** Test coverage thin (~650 LOC tests vs ~5600 LOC src). No tests for `main.ts`, `settings.ts`, `modals.ts`, agent orchestration paths.

### User experience

- **H** `openAgent.ts:49–52` — when working dir missing, modal cancels with cryptic Notice and no inline remediation. Offer settings link or directory picker.
- **H** `settings.ts:335–347` — tmux binary path not validated until launch fails silently. Add a "Test" button that runs `which <binary>` and reports.
- **M** `modals.ts` — modal verb/button copy inconsistent ("Create"/"Set"/"Scaffold"; "(optional)" floating between field name and description). Standardize.
- **M** `main.ts:463–464, 631–632` — `FindIssueModal` zero-result message shows raw `interpretation` ("prefix=OP, status=open") with no recovery hint. Add "Try ID (e.g. OP-12) or title fragment".
- **M** Error messages leak internal vocabulary ("op-work URI requires id") to user-facing Notices. Split user-message vs. log-message.
- **L** Command palette names mix `op:` and `op-` prefixes; dev/diagnostic commands buried with end-user commands. Namespace dev commands as `op-dev: …`.

### Configuration UX

- **H** `settings.ts:196–209` — agent overlay JSON is parse-checked but not key-validated; typos like `bianry` are silently dropped. Add JSON schema validation; warn on unknown keys.
- **M** `settings.ts:59` — default `tmuxBinary = /opt/homebrew/bin/tmux` assumes Apple Silicon + Homebrew. Auto-detect on `onload`; fall back; warn if not found.
- **M** `settings.ts:273–315` — `workingDirs` editor is a two-field-plus-button UI; no validation, no bulk import, no path picker. Either match the agent-overlays JSON pattern or add a directory picker.
- **L** `settings.ts:260–271` — `injection.extraPreamble` has no length limit; users can bloat agent prompts. Add char counter or maxLength.

### Inline help

- **H** No JSDoc on public surface (`main.ts`, `openAgent.ts`, command callbacks). Add `@param`/`@returns`/`@throws` to all exports.
- **M** `modals.ts` — `setDesc()` lacks examples ("e.g. `abc1234` or 40-char SHA").
- **M** `settings.ts:147–362` — descriptions assume tmux/iTerm/orchestrator domain knowledge. Expand or link a glossary.
- **L** `eventBus.ts` — interface, handler type, and lifecycle undocumented.

### Documentary help

- **H** `plugins/op-obsidian/README.md` — header still says "Status: scaffold only. Commands land in OP-21 onwards" while the plugin clearly ships working commands. Misleading. Replace with usage guide, command reference, troubleshooting.
- **M** README has no architecture overview (sidebar / store / event bus / agent orchestration). Add a Mermaid or ASCII diagram.
- **M** README BRAT install URL is bare slug `earchibald/obsidian-projects`; verify the BRAT command is current.
- **L** No troubleshooting/FAQ section (agent not found, tmux fails, agent window doesn't open).

---

## 2. `plugins/op/` (Claude Code skill + slash commands)

### Skill clarity (`skills/op/SKILL.md`)

- **H** `commands/new.md:7` references "the skill's Filename sanitization rules", but [SKILL.md](skills/op/SKILL.md) **does** define a `## Filename sanitization` section — verify the cross-reference still matches the section anchor, and consider deduplicating sanitization guidance now that the plugin also sanitizes (`sanitize.ts`).
- **M** SKILL.md "DOCS folder: superpowers symlink" section is undocumented as a one-time, out-of-band setup. Mark explicitly: "run manually in a shell once per project; not part of any verb."
- **M** Prefix → slug fallback path doesn't say what to do when `STATUS.md` exists but lacks `prefix:` (legacy pre-OP-12 projects). Add a one-liner pointing at the legacy filename-scan fallback.

### Command UX (`commands/*.md`)

- **H** `commands/resolve.md` — "defaults to the in-progress issue" doesn't define behavior when zero or >1 issues are `in-progress`. SKILL.md handles it; mirror the rule in the command frontmatter.
- **M** `commands/scaffold.md` — args line shows `<slug> <PREFIX> [title]` but SKILL.md describes optional `priority` / scope inputs. Reconcile.
- **M** `commands/issue.md` — uses "auto-pick" without defining the rule. Inline the SKILL.md rule (lowest-numbered in-progress, else lowest-numbered open).

### Configuration UX

- **M** `.claude-plugin/plugin.json` description ("schema, slash commands, and agent skill") implies a schema artifact ships with the plugin; it doesn't (schema lives in `skills/op/reference/schema.md`). Reword.
- **L** `plugin.json` lacks `repository` / `license` / docs URL — no in-CC affordance to "view docs" or "report issue".

### Inline help (skill `description:` triggers)

- **H** Top-level SKILL.md frontmatter `description:` includes "or edits files under `Projects/<slug>/ISSUES|TASKS|DOCS|RESOLVED ISSUES/`". This is a passive trigger — it fires the skill on every edit in those folders, conflating *editing* with *workflow operations*. Narrow to explicit verb invocations and ID references.
- **M** `/op:new` says "Always confirm" while `/op:resolve` says "Stop and get explicit user approval" — same intent, different urgency framing trains users to ignore nuance. Standardize.

### Documentary help / error recovery

- **H** SKILL.md "Track git refs" snippet shows the read → in-memory append → `property:set` cycle but has no recovery for: `git log` failing, issue id not found, vault unreachable. Add a short "if X fails, do Y" subsection.
- **H** "Brief vs detailed" description routing (used by `/op:new`) doesn't define the threshold. Pin a number ("Brief ≤ 140 chars, Detailed > 140; ask if unsure").
- **M** `reference/cli-gotchas.md` mentions `obsidian search` ENOENT but doesn't say how to recognize stale-index state or the recovery sequence (wait → restart → fall back to `find`).

### Lifecycle / verb consistency

- **M** Commits-list semantics: SKILL.md doesn't define idempotency for appending the same `<sha7>` twice. Either guarantee dedup at write time or document "callers must check".
- **M** TASKS notes "trashed at resolve" — clarify Obsidian-trash vs. permanent delete and whether they're recoverable.
- **M** Semver bump section ordering ambiguous — bump → commit → append → resolve. Number the steps.
- **L** `reference/issue-template.md` ships unmentioned in SKILL.md. Either reference it from `/op:new` or remove.
- **L** `reference/schema.md` duplicates the symlink-setup section from SKILL.md. Replace one with a pointer.

---

## 3. `scripts/` and repo-level docs

### `scripts/bump-version.mjs`

- **H** No graceful handling when a target file is missing; raw `ENOENT` trace instead of "file X not found". Wrap reads, report which file + expected path.
- **M** Semver regex `/^\d+\.\d+\.\d+/` accepts `1.2.3.xyz` and leading zeros. Tighten to strict semver.
- **L** No actual hashbang; file isn't `+x`. Either commit to `node scripts/bump-version.mjs` everywhere or make it executable.

### `README.md`

- **M** The two plugins (`op` skill vs `op-obsidian` plugin) are referenced without an upfront "what each owns and why both exist" paragraph. Add it before the install steps.
- **M** Symlink instructions reference a `<version>` path with no guidance on how to discover it or how to keep it pinned across upgrades.
- **M** "Develop" section doesn't cover symlink hygiene when switching between the marketplace install and a local `--plugin-dir` checkout.
- **L** Install section doesn't show how to discover the marketplace via search; new users can paste an empty `add` command.
- **L** No top-level "Getting Started" with end-user vs. contributor branches.

### `CLAUDE.md`

- **M** Post-edit steps assume the obsidian CLI is already installed/configured; no preamble. Add prerequisites or link to setup.
- **M** `bump-version.mjs` is a contributor-only obligation that's documented here but not in the user README's versioning section. Cross-link.

### `docs/`

- **M** `docs/specs/`, `docs/plans/` are linked only from a "Why a plugin?" rationale paragraph. Add a `docs/README.md` index, link from main README "Repo layout".

---

## 4. Cross-cutting themes

1. **Silent failures dominate the "high" findings.** Tmux path, agent overlay typos, working dir missing, version-file ENOENT, prefix lookup misses — all crash or no-op without surfacing actionable text. Pattern fix: a small "user error" helper that always pairs an Obsidian `Notice` with a one-line "what to do next".
2. **The split between the `op` skill and the `op-obsidian` plugin is invisible to users.** Two README rewrites + one paragraph in SKILL.md would close the loop.
3. **Inline help (JSDoc, settings tooltips, command-palette descriptions) is largely missing.** Treat as a single sweep, not per-feature work.
4. **The skill, the schema reference, and the plugin's `sanitize.ts` all encode rules about filenames / lifecycle / prefixes independently.** Drift will happen. One canonical source (skill or schema) + the others should reference it.
5. **Test coverage is concentrated on pure helpers** (`sanitize`, `findIssue`, `uriParams`, `terminalLaunch`, `orchestrator`, `agentSessionCleanup`, `github`) and absent from the integration surface (`main.ts`, `settings.ts`, `modals.ts`). The high-risk paths are the untested ones.

---

## 5. Proposed follow-up issues

Suggested triage breakdown — each is sized as a single issue (one PR, one focused scope). Severity column is the highest finding rolled up into the issue.

| #  | Sev | Title | Source findings |
|----|-----|-------|------------------|
| F1 | H | op-obsidian: surface silent failures (tmux path, working dir, agent detect, overlay typos) via consistent user-error helper | §1 code/UX/config H&times;4 |
| F2 | H | op-obsidian: rewrite plugin README — drop "scaffold only", add usage guide + command reference + troubleshooting | §1 doc H + M |
| F3 | H | op skill: tighten frontmatter `description:` trigger and standardize confirmation copy across verbs | §2 inline H + M |
| F4 | H | op skill: add error-recovery subsections (git ref tracking, prefix lookup, brief/detailed routing threshold) | §2 doc H&times;2 |
| F5 | H | bump-version: graceful errors + strict semver validation + executable bit | §3 scripts H + M + L |
| F6 | M | Top-level README rewrite: explain the two-plugin split, add Getting Started (user vs contributor), fix symlink/dev guidance | §3 README + cross-cutting #2 |
| F7 | M | Commands UX pass: standardize modal copy, FindIssueModal hint, command-palette namespace, command frontmatter args/edge cases | §1 UX M + §2 command UX M&times;3 |
| F8 | M | Configuration UX pass: settings auto-detect (tmux), validation (overlays), workingDirs editor rework | §1 config H + M&times;2 |
| F9 | M | Inline-help sweep: JSDoc public exports, settings descriptions with examples, glossary for tmux/iTerm jargon | §1 inline H + M&times;3 |
| F10 | M | Schema/skill consistency: dedupe filename rules + symlink setup + commit-list semantics + TASKS trash semantics | §2 lifecycle M&times;4 + cross-cutting #4 |
| F11 | L | op-obsidian: integration tests for `main.ts` / `settings.ts` / `modals.ts` flows | §1 code L + cross-cutting #5 |
| F12 | L | op-obsidian: event-bus hardening (handler try/catch, drain on unload) | §1 code M + L |

Order suggestion: ship F1 → F2 → F3 → F4 → F5 first (all H, all small-to-medium scope), then batch the M-level rewrites (F6–F10) before opening F11/F12.
