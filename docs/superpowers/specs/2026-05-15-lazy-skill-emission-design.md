---
doc_type: spec
issue: OP-192
parent: OP-181
date: 2026-05-15
title: "Skill emission for lazy: true workflow modules"
status: approved
---

# Skill emission for `lazy: true` workflow modules (OP-192)

## Problem

Workflow modules (OP-181) are all inlined into the agent's composed prompt at
launch. Rarely-needed reference modules (e.g. a "tmux gotchas catalog") burn
kickoff context every launch even when the agent never consults them.

OP-192 adds an **opt-in** path: a module flagged `lazy: true` is *not* inlined.
Instead it is materialized as a Claude Code skill the agent activates on demand
via the Skill tool. The feature is genuinely optional — the system ships and
works without any module ever setting `lazy: true`.

## Key finding that shaped the design

Claude Code discovers project skills by walking `.claude/skills/` from the cwd
up to the **git repo root** (a linked worktree is its *own* root) plus
`~/.claude/skills/`. op's worktree-per-issue flow means the launched agent
creates its own worktree *after* launch and `cd`s into it. A skill file the
plugin writes to `repoPath/.claude/skills/` at launch time is therefore
**invisible** once the agent enters its worktree: the untracked file is not in
the worktree's working tree, and parent-chain discovery cannot escape upward
past the worktree's own root.

Consequence: the plugin **cannot push** issue-scoped skill files that survive
the worktree flow. The only correct mechanisms are (a) push to the global
`~/.claude/skills/`, or (b) have the agent *pull* them from inside its worktree.
We chose **agent-pull** (decision below) — it keeps skills issue-scoped,
avoids global-namespace pollution and cross-launch races, and matches op's
existing "all mutation through `op-*` dispatch, agent-driven" model.

## Design

### 1. Schema additions (`workflowModulePure.ts`, pure)

Two optional frontmatter fields on a workflow module, parsed in `parseModule`:

| Field | Type | Validation | Default |
|---|---|---|---|
| `lazy` | boolean | non-boolean → `invalidFieldDiag` (`malformed-frontmatter`, error). Not truthy-coerced — `lazy: "true"` is an error. | `false` |
| `description` | string | non-string → `invalidFieldDiag`. | absent |

`WorkflowModule` gains `lazy: boolean` (always present, defaulted `false`) and
`description?: string`. Both follow the existing optional-field pattern
(`project`/`agent`/`order` at `workflowModulePure.ts:351-388`).

Forward/backward compatibility: unknown-key tolerance (`parseModule` already
ignores unknown frontmatter) means a `lazy: true` module loaded by a plugin
build *without* this feature simply inlines as a normal module. That graceful
degradation is why **no global enable setting is needed** — per-module
`lazy: true` is the sole opt-in, and it fails safe by construction. Adding a
global kill-switch would silently nullify author intent and add a settings
surface, migration, docs, and a smoke-matrix entry for a feature that already
ships dormant (rejected as YAGNI).

### 2. Pure-composer partition (`composeWorkflowPure.ts`, pure)

The partition is a *shape decision* and stays in the pure layer (consistent
with the strict pure/IO split documented in `composeWorkflowPure.ts` /
`composeWorkflow.ts`). `composeWorkflow` already walks `stepRecord.modules`,
loads bodies, and renders var substitution. Change:

- A module with `module.lazy === true` is **excluded** from `orderedChunks`
  and the joined `text`.
- Its body is still rendered through the **same** var-precedence chain
  (Module → Global → Project → Launch) and `renderTemplate` plugin-var pass —
  a lazy skill body is not a second-class citizen that skips resolution.
- `ComposedPrompt` gains:

  ```ts
  lazySkills: Array<{
    id: string;          // module id (post-shadowing)
    name: string;        // derived skill name, validated [a-z0-9-], <=64
    description: string;  // module.description, else module.title (fallback)
    body: string;        // fully var-resolved module body
  }>
  ```

- One `info`-severity `WorkflowDiagnostic` per emitted lazy module:
  *"module `<id>` emitted as on-demand skill `op-module-<id>`, not inlined"*.
  This makes the feature visible in `op-explain-workflow` / dry-run — a stated
  decision, not optional polish. Without it, "why didn't the agent see my
  notes?" has no debugging trail.
- A lazy module missing `description` falls back to `title` (a required field,
  always present) and emits a **`warning`** diagnostic: *"module `<id>` is
  lazy but has no `description:`; using title as the skill activation hint —
  activation accuracy may suffer"*. A missing one-line summary must **never**
  hard-fail a launch (consistent with the composer's "diagnose, don't
  detonate" convention — `parseModule` keeps modules loadable despite var
  diagnostics).

### 3. Skill name derivation

- Skill directory: `op-module-<id>`. The `op-module-` prefix namespaces away
  from the canonical first-class `op` skill so the agent's skill list doesn't
  show two ambiguous "op" entries.
- SKILL.md `name:` = `op-module-<id>` slugified to Claude Code's rules
  (lowercase, `[a-z0-9-]`, ≤64 chars; invalid chars → `-`, collapse repeats,
  trim, truncate to 64). Module ids are already filename-basename-constrained
  so this is mostly a guard.
- `description:` is YAML-safe-encoded when written (quoted/escaped block
  scalar), **never** interpolated verbatim — a description containing `:`,
  `#`, a newline, or a leading `>`/`|` must not corrupt the SKILL.md
  frontmatter.

### 4. Delivery: agent-pull via `op-emit-lazy-skills` CLI

The pure composer produces `lazySkills` data. Delivery is **agent-driven**:

- When `composeWorkflowSection` (kickoff step only — see §5) has a non-empty
  `lazySkills` set, it appends a short, fixed pointer block to the composed
  prompt (≈3 lines, not the module bodies):

  > *Optional reference skills are available for this issue. Run
  > `obsidian op-emit-lazy-skills issue=<ID>` from inside your working
  > directory after creating your worktree to materialize them into
  > `.claude/skills/`, then activate the relevant one via the Skill tool when
  > needed. Skipping this is safe — they are reference-only.*

- New CLI command **`op-emit-lazy-skills`** (`key=value` args, JSON payload to
  `Projects/_scratch/op-last-response.md` like every `op-*`):
  - Required: `issue=<PREFIX-N>` (resolves project + kickoff step).
  - Recomposes the kickoff step, takes `composed.lazySkills`.
  - Writes each to `<cwd>/.claude/skills/op-module-<id>/SKILL.md` where `cwd`
    is the **process working directory of the CLI invocation** (the agent's
    worktree — worktree-correct because the agent runs it from inside).
  - Writes a self-ignoring `<dir>/.gitignore` containing `*` so the emitted
    skills never appear in the agent's `git status` and we never mutate the
    consumer repo's root `.gitignore`.
  - **Prune**: before writing, remove any existing `.claude/skills/op-module-*`
    directory whose id is not in the current lazy set (handles a module that
    flipped `lazy:true`→`false`, was renamed, or deleted — otherwise the agent
    could activate stale guidance).
  - Idempotent: re-running overwrites + re-prunes; safe to run every step.
  - Emits the JSON payload listing written/pruned paths + any warnings.

This is the one place that does filesystem I/O for this feature; it is a thin
consumer of the pure `lazySkills` data.

### 5. Emission trigger

`lazySkills` is computed for the **kickoff step only** and the pointer block is
injected at kickoff. Reference material ("tmux gotchas") is session-ambient,
not step-specific. Per-step re-emission was rejected: it rewrites skill files
6×/issue (churn the agent sees in `git status`), and introduces a "lazy in
step A, inline in step B" combinatorial question the issue never asked.
`op-emit-lazy-skills` itself is idempotent so an agent re-running it across
steps is harmless, but the prompt only nudges once.

### 6. Failure modes & edge cases

- **Meta-only / no working dir**: `op-emit-lazy-skills` writes relative to the
  CLI cwd; if the agent never created a worktree it writes into the main
  checkout's `.claude/skills/` (still discoverable there pre-worktree). If a
  lazy module exists but the project is meta-only with no repo, the composer
  falls back to **inlining** the module + a `warning` diagnostic — content is
  never silently lost.
- **id collision across global/project shadowing**: shadowing resolves to a
  single surviving module before partition, so `op-module-<id>` is stable.
- **Stale skill files**: handled by the prune step in §4.
- **Concurrency**: agent-pull writes into the agent's *own* worktree cwd, so
  parallel launches for different issues do not race (each agent's worktree is
  distinct). Documented, no extra code.
- **Agent ignores the pointer**: safe by design — the modules are reference-
  only; skipping emission loses nothing kickoff-critical.

## Components & boundaries

| Unit | Responsibility | Depends on | Pure? |
|---|---|---|---|
| `parseModule` (extended) | parse/validate `lazy`, `description` | — | yes |
| `composeWorkflow` (extended) | partition lazy out, build `lazySkills`, diagnostics | schema | yes |
| skill-name slug helper | id → valid Claude Code skill name | — | yes |
| SKILL.md renderer | `lazySkills[i]` → YAML-safe SKILL.md text | — | yes |
| `op-emit-lazy-skills` handler | recompose, write/prune files, JSON payload | composer, FS | no (IO seam) |
| `composeWorkflowSection` (extended) | append pointer block when lazySkills non-empty (kickoff) | composer | no (IO seam) |

## Testing

- **Pure unit**: `parseModule` lazy/description type-checks & defaults;
  composer partition (lazy excluded from text, present in `lazySkills`, vars
  resolved); description fallback + warning diagnostic; info diagnostic per
  emitted; name slugification edge cases; YAML-escaping of nasty descriptions.
- **IO**: `op-emit-lazy-skills` writes expected tree, self-ignoring `.gitignore`,
  prunes orphans, idempotent re-run; meta-only inline fallback.
- **Smoke** (per project CLAUDE.md, against an OP-Test seed): seed a lazy
  module, `op-explain-workflow` shows the info diagnostic and excludes it from
  inline chunks; run `op-emit-lazy-skills` and assert the SKILL.md tree +
  prune behavior. Extend `scripts/smoke-workflow-modules.mjs`.

## Out of scope

- Global enable/disable setting (rejected — YAGNI).
- Per-step lazy emission (rejected — churn/combinatorics).
- Pushing skills from the plugin at launch (rejected — broken by worktree
  discovery).
- Auto-running `op-emit-lazy-skills` on the agent's behalf (the agent decides;
  the pointer nudges).
