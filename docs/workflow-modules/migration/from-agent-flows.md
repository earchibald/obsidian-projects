# Migrate Agent Flows

If you've been using op long enough to have issues with `flow:` and
`complexity:` in their frontmatter, this guide is for you. The auto-advance
machinery — the bit that picks the next agent stage to launch when an agent's
`SessionEnd` hook fires — was rewritten in OP-188. The user-facing contract
didn't change, but the engine underneath did, and the migration story is
worth knowing if you're authoring custom workflows or wondering why your
pre-existing `flow: planning` issues still walk cleanly.

The short version:

- **What changed**: `flowOrchestrator.ts` no longer carries a hardcoded
  transition matrix. It walks the project's loaded `WorkflowFile.steps`
  list. Step transitions follow the order *you* declare in
  `Projects/<slug>/WORKFLOW.md`.
- **What stayed the same**: per-issue `flow:` / `complexity:` frontmatter,
  the `flow.autoAdvance` setting, level-4 launch override carry-forward,
  and the historical evaluate-fast-path semantics for `simple` complexity.
- **What handles old data**: a permanent legacy → canonical alias map
  (`LEGACY_FLOW_ALIAS`) plus a separate legacy-fallback path that runs
  the original hardcoded matrix verbatim when no schema-1 workflow file
  is present.

You don't need to do anything to your existing issues. The migration is
content-preserving and the alias map is permanent.

## What changed (the engine)

Before OP-188, `flowOrchestrator.ts` carried the SDLC sequence in code:

```ts
// pre-OP-188 (sketch)
function flowAdvanceDecision({ flow, complexity, exitStatus }) {
  if (exitStatus !== "clean") return null;
  switch (flow) {
    case "evaluate":
      if (complexity === "simple")  return { nextFlow: "implementation" };
      if (complexity === "complex") return { nextFlow: "planning" };
      return null;
    case "planning":       return { nextFlow: "implementation" };
    case "implementation": return { nextFlow: "review" };
    case "review":         return { nextFlow: "finalization" };
    case "finalization":
    case "done":
    case null:             return null;
  }
}
```

The matrix was source-of-truth: changing the order required code changes,
and there was no way to insert a custom step between, say, `review` and
`finalization` without forking the plugin.

After OP-188, the function takes a loaded workflow file as input and walks
its `steps:` list:

```ts
// post-OP-188 (sketch — see flowOrchestrator.ts:flowAdvanceDecision)
function flowAdvanceDecision({ workflow, flow, complexity, exitStatus }) {
  if (exitStatus !== "clean") return null;
  if (flow === null) return null;
  if (workflow === null || workflow.source.isLegacy) {
    return legacyFlowAdvanceDecision({ flow, complexity, exitStatus });
  }
  const current = aliasResolve(flow);            // legacy → canonical
  const i = findStepIndex(workflow.steps, current);
  if (i === -1) return null;
  if (current === "evaluate") {
    if (complexity === "simple")  return skipPlanStep(workflow.steps, i);
    if (complexity === "complex") return advanceOne(workflow.steps, i);
    return null;
  }
  return advanceOne(workflow.steps, i);
}
```

Two consequences worth highlighting:

1. **Custom steps work without code changes.** Insert a new step between
   `review` and `finalize` in your workflow file's `steps:` list and
   auto-advance picks it up. The walker is entirely workflow-file driven.
2. **Step-not-in-workflow returns `null` (no advancement)**, not an
   exception. If your issue's current `flow:` value doesn't appear in the
   project's `steps:` list, the orchestrator quietly stops and waits for
   you. Visible as a no-op auto-advance in the response payload; never
   surfaces as a hard error.

The complexity branch at `evaluate` is preserved verbatim: `simple`
fast-paths past the `plan` step (skipping every adjacent step that aliases
to `plan`); `complex` advances by one. Same fast-path the hardcoded matrix
ever shipped.

## What stayed the same (the user-facing surface)

If you've been using op for a while, none of this changed:

- **`flow:` and `complexity:` frontmatter on issues.** The fields work the
  same way: `flow:` carries the issue's current step id;
  `complexity:` carries `simple` or `complex` for the evaluate-step
  branching. Writing them via `obsidian op-set-flow issue=<id>
  flow=<step>` (or via the URI handler) still works exactly as before.
- **`autoAdvance` setting.** The plugin's per-vault
  `settings.flow.autoAdvance` boolean still gates whether SessionEnd hooks
  trigger an auto-advance launch. Off → SessionEnd is a no-op; on → the
  plugin invokes `flowAdvanceDecision` and launches the next stage's
  agent if the function returns a non-null result.
- **Level-4 launch overrides.** When an agent was launched with
  `var.<name>=<value>` overrides (the "this single run" layer of the
  precedence chain), those overrides carry forward across the auto-advance
  chain via `carriedLaunchVars`. The advance call site in
  `main.ts:advanceFlowAndLaunch` runs `loadWorkflowFile` *before* invoking
  the decision function, but the carry-forward path is downstream of the
  decision and didn't change.
- **The evaluate fast-path.** `complexity: simple` skips `plan` and lands
  the issue at `implement`. `complexity: complex` advances by one to
  `plan`. Missing complexity at `evaluate` returns `null` so the walker
  awaits a user decision. Same semantics — same call sites still rely on
  it.
- **Abnormal exits don't auto-advance.** `exitStatus !== "clean"` → return
  `null`. Crashed agents, user-cancelled launches, hook failures all stop
  the chain. No silent re-launch.

In short: if you write or read `flow:` / `complexity:` from anywhere — a
script, a custom hook, a manual frontmatter edit — your code keeps working.

## How legacy `flow:` enum values keep working

Pre-OP-188 issues had a closed-enum `flow:` value:

| Pre-OP-188 (closed enum) | Post-OP-188 (canonical step id) |
| :--- | :--- |
| `evaluate` | `evaluate` (unchanged) |
| `planning` | `plan` |
| `implementation` | `implement` |
| `review` | `review` (unchanged) |
| `finalization` | `finalize` |
| `done` | `done` (terminal sentinel) |

The mapping lives as `LEGACY_FLOW_ALIAS` in `flowOrchestrator.ts` and is
**permanent** — there's no plan to retire it. Old in-flight issues with
`flow: planning` walk cleanly forever; you don't need to back-fill the
canonical step id into existing frontmatter.

```ts
// flowOrchestrator.ts:LEGACY_FLOW_ALIAS (frozen at module load)
export const LEGACY_FLOW_ALIAS = Object.freeze({
  evaluate: "evaluate",
  planning: "plan",
  plan: "plan",
  implementation: "implement",
  implement: "implement",
  review: "review",
  finalization: "finalize",
  finalize: "finalize",
  done: "done",
});
```

The alias map is applied **symmetrically** in two places:

1. **The issue's `flow:` value.** When the orchestrator reads the issue's
   current step from frontmatter, it alias-resolves the value before
   looking it up in the workflow's `steps:` list. So `flow: planning` in a
   pre-OP-188 issue resolves to canonical `plan` and finds the matching
   slot.
2. **Step ids in the workflow file.** When the orchestrator walks
   `workflow.steps[*].step`, it alias-resolves each id. So a custom
   workflow that still uses `step: planning` in its `steps:` list walks
   the same way as one that uses canonical `step: plan`.

Symmetric application means every combination of "issue uses legacy id +
workflow uses canonical id" / "issue uses canonical id + workflow uses
legacy id" / "both legacy" / "both canonical" lands at the same step. New
writes (auto-advance, scaffolds, the canonical settings) always emit
canonical ids; the legacy ids are accepted on read forever.

### What about custom step ids?

The map only covers the historical 6-value enum. Step ids you invent —
`triage`, `qa-handoff`, `release-bake` — pass through `aliasResolve` as
`null` (unrecognized). The walker handles that case: a `null` from
`aliasResolve` on the *current* step returns `null` from the decision
function (no advancement). On a *workflow-file step id*, the walker still
matches the literal id, so workflows using custom step ids still walk —
they just can't claim canonical-mode behavior at the launch surface.

This is why `setFlow` loosened from a closed enum to a free-form non-empty
string at the same time: writing `obsidian op-set-flow issue=OP-42
flow=triage` succeeds, the auto-advance walker finds `triage` in your
custom workflow, and the next step launches normally. The walker enforces
"is this step in the workflow," not the writer.

## How the legacy fallback path keeps pre-modules projects working

If a project hasn't migrated its `WORKFLOW.md` to schema-1, OP-188 ships
that case behind a fallback:

```ts
// flowOrchestrator.ts:flowAdvanceDecision
if (workflow === null || workflow.source.isLegacy) {
  return legacyFlowAdvanceDecision({ flow, complexity, exitStatus });
}
```

`legacyFlowAdvanceDecision` is the byte-for-byte original hardcoded matrix
from before OP-188. It's exported alongside the new walker so the migration
story is "the OLD function still exists, called only when needed." Two
trigger conditions:

- **`workflow === null`**: the project has no `WORKFLOW.md` at all, or its
  `WORKFLOW.md` failed to parse (an unrecoverable `error`-severity
  diagnostic). Auto-advance falls back to the historical sequence.
- **`workflow.source.isLegacy === true`**: the loader synthesized a
  legacy workflow via the six-shape fallback ladder (see
  [`from-workflow-md.md`](./from-workflow-md.md) for the full ladder).
  These files have one synthesized `kickoff` step that carries the entire
  legacy body verbatim; the synthesized `steps:` list isn't navigable, so
  the orchestrator routes through the old matrix instead.

Either way, pre-modules projects keep auto-advancing through the
historical `evaluate → plan → implement → review → finalize` sequence
even after upgrading to a post-OP-188 op-obsidian. **You don't lose
auto-advance by keeping a legacy WORKFLOW.md** — the modules schema is
fully opt-in.

The fallback path uses canonical ids in its output regardless of input
shape — `flow: planning` (legacy enum) advances to `flow: implement`
(canonical), not `flow: implementation`. New writes always emit the
canonical id; the alias map exists to accept old values on read.

## What the new default workflow ships

Projects scaffolded post-OP-188 get a self-contained schema-1 `WORKFLOW.md`
seeded by `scaffoldProject`:

```yaml
---
project: <your-slug>
type: workflow
schema: 1
default_agent: claude
default_model: opus
steps:
  - step: evaluate
    modules: []
  - step: plan
    modules: []
  - step: implement
    modules: []
  - step: review
    modules: []
  - step: finalize
    modules: []
---
```

Empty `modules:` lists for now — the scaffold doesn't presume which
modules you want to compose. The five-step sequence matches the historical
matrix exactly, so a fresh-scaffolded project's auto-advance behavior is
identical to a pre-OP-188 project's. Add modules to each step's list as
your project's rules emerge; share them across projects via
[`share-modules.md`](../sharing/share-modules.md) once you have a few you
like.

The seed is *self-contained*, not `extends:`-based, on purpose: there's no
auto-installed global default to depend on. If you want a global, author
`Projects/_op-workflow.md` yourself and switch the per-project file to
`extends: Projects/_op-workflow.md` afterwards. Both shapes work; the
self-contained shape is just the simplest starting point.

## Migration recipe

For most users this is a no-op — you don't need to touch existing data.
But if you want to clean up:

### Issues with legacy `flow:` enum values

Don't bother. The alias map is permanent and the read-side resolution is
zero-cost. Touching frontmatter on dozens of in-flight issues is more risk
than it's worth.

If you do want to back-fill the canonical id on a single issue
(say, because the workflow editor UI shows you the literal value and
you'd rather see `plan` than `planning`), edit the issue note's
frontmatter directly:

```diff
- flow: planning
+ flow: plan
```

…or run the CLI:

```bash
obsidian op-set-flow issue=OP-42 flow=plan
```

The auto-advance walker doesn't care which form is on disk.

### Projects still on a legacy WORKFLOW.md

The fallback keeps you working. When you're ready to migrate the workflow
file itself, follow [`from-workflow-md.md`](./from-workflow-md.md) — that
covers the schema-1 frontmatter contract, the module decomposition pattern,
and the legacy fallback ladder.

The migration is independent of what your existing in-flight issues have
in their `flow:` field. Once the workflow file is schema-1, the engine
walks it via the new path; pre-existing issues with `flow: planning`
still resolve cleanly through the alias map.

### Custom step ids you've added

If you've been writing custom step ids via `op-set-flow flow=<custom>`
since OP-188, your workflow file's `steps:` list needs to carry that id
literally — there's no alias for it, since the alias map is closed to the
historical enum. Add a step record:

```yaml
steps:
  - step: triage
    modules: [<modules for the triage step>]
  - step: kickoff
    modules: [...]
  ...
```

Step ids are free-form strings — same trim/non-empty rule as the issue's
`flow:` field. Pick names that read well in launch logs.

## Behavioral differences worth knowing

A few edge cases changed shape between the hardcoded matrix and the new
walker. None should affect normal use, but worth flagging:

- **Step missing from the workflow.** Pre-OP-188 the matrix only knew the
  closed enum, so this case was impossible. Post-OP-188 the walker reports
  no-advancement (`null`) when an issue's current step isn't found in the
  workflow's `steps:` list. Visible as a quiet "auto-advance stalled" in
  the response payload.
- **Workflow with extra steps between `evaluate` and `plan`.** The
  evaluate-step `simple` fast-path scans forward from
  `evaluateIndex + 1` and returns the first step whose canonical id is
  not `plan`. Critically: if the first non-`plan` step is a *custom*
  step id (one not in `LEGACY_FLOW_ALIAS`), `aliasResolve` returns
  `null` and `outputFor(null)` returns `null` — so the fast-path
  **stalls** (returns `null`, no auto-advance). The loop only skips
  steps that alias to canonical `plan`; custom step ids stop the scan
  immediately. Concretely: if you've inserted `triage` between
  `evaluate` and `plan`, `simple` complexity stalls rather than
  skipping past `triage`. Put custom steps *after* `implement` (not
  between `evaluate` and `plan`) if you want them to be reachable
  through the simple-complexity fast-path.
- **Embedded newlines in `flow:`.** `validateFlow` rejects step ids with
  embedded `\r\n` characters across all three entry points (`setFlow`,
  the URI handler, the CLI parser). This was an OP-188 adversarial-review
  catch and lands in the same release.
- **`done` is terminal.** Issues with `flow: done` never advance — same
  as before. The alias map carries `done: "done"` for completeness.

## Where to next

- [`from-workflow-md.md`](./from-workflow-md.md) — the migration story for
  the workflow file itself: legacy `WORKFLOW.md` blob → schema-1 +
  modules. Required reading if you want to take advantage of per-step
  injection.
- [`share-modules.md`](../sharing/share-modules.md) — once your modules
  exist as files, the `op-export-module` / `op-import-module` flow makes
  them shareable across vaults.
- [`workflow-file-schema.md`](../../specs/workflow-file-schema.md) — the
  full workflow-file contract, including the legacy fallback ladder
  reference and the model registry.
- [`flowOrchestrator.ts`](https://github.com/earchibald/obsidian-projects/blob/main/plugins/op-obsidian/src/flowOrchestrator.ts)
  — the engine source, including the canonical `LEGACY_FLOW_ALIAS` map
  and the `legacyFlowAdvanceDecision` fallback. The frozen alias map is
  the source of truth for what legacy values resolve to what canonical
  ids.
