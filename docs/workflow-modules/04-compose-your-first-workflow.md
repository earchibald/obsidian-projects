# Compose Your First Workflow

A module is just prose with frontmatter. A **workflow file** decides
which modules a project's agent actually sees, in what order, at which
step, and under which agent and model. This walkthrough builds a
realistic two-step workflow on top of the modules you saw in
[03 — Author your first module](./03-author-your-first-module.md), with
a global default that every project inherits and a per-project override
that adds an adversarial review step.

The working files for this tutorial live under
[`docs/examples/compose-first-workflow/`](../examples/compose-first-workflow/).

## What a workflow file does

A workflow file lives at `Projects/<slug>/WORKFLOW.md` (per-project) or
`Projects/_op-workflow.md` (global default — referenced via `extends:`).
It declares:

- **Which steps exist** for this project (named with arbitrary string
  ids like `kickoff`, `plan`, `review`).
- **Which modules each step composes from**, by id.
- **Which agent runs each step** (and which model that agent uses) —
  step-level overrides on top of workflow defaults.
- **Optionally, a parent workflow file to inherit from** via `extends:`.

The composer, given an issue and a step name, reads the matching step
record, pulls the named modules from the loaded module set, sorts them
by `order`, renders templates, and concatenates the bodies into one
prompt. That's the whole job; the workflow file is the routing table
that decides what gets composed.

## A two-file setup

For most vaults, the lowest-effort way to give every project a coherent
default workflow — without copy-pasting per-project files — is **one
global `Projects/_op-workflow.md` plus per-project `WORKFLOW.md` files
that `extends:` it**.

Here's the global default from
[`docs/examples/compose-first-workflow/Projects/_op-workflow.md`](../examples/compose-first-workflow/Projects/_op-workflow.md):

```yaml
---
type: workflow
schema: 1
project: _global
default_agent: claude
default_model: opus
steps:
  - step: kickoff
    modules: [orient]
---
```

And here's the per-project file from
[`docs/examples/compose-first-workflow/Projects/tutorial-project/WORKFLOW.md`](../examples/compose-first-workflow/Projects/tutorial-project/WORKFLOW.md):

```yaml
---
type: workflow
schema: 1
project: tutorial-project
default_agent: claude
default_model: opus
extends: Projects/_op-workflow.md
steps:
  - step: review
    agent: copilot
    model: gpt-5
    modules: [review-and-merge]
---
```

The merged effect: `tutorial-project` runs the `kickoff` step (inherited
from the global) under claude/opus, then a `review` step under
copilot/gpt-5. The merge happens at load time; the composer sees a
single resolved workflow.

## Anatomy of the frontmatter

### Required fields

#### `type: workflow` — exact literal

Same role as `type: workflow-module` on a module file: discriminator.
Anything else and the loader either drops the file (`schema-mismatch`)
or treats it as a legacy `WORKFLOW.md` and synthesizes a single-step
fallback.

#### `schema: 1` — version lock

The integer `1` is the only value the loader currently accepts. Future
schema versions will add explicit migration paths; until then,
`schema: 2` (or any non-1) emits `schema-mismatch` and the file is
dropped. **This is on purpose** — locking the format version means a
future engine can detect "this file is from the old shape" and run a
migration instead of silently ingesting it wrong.

#### `project: <slug>` — non-empty string

Must equal the enclosing folder slug. If you write
`project: foo` in `Projects/bar/WORKFLOW.md`, the loader emits a
warning and uses the folder name (`bar`); the warning is intentional, so
you spot the mismatch when copy-pasting between projects. The global
default uses `project: _global` by convention — there's no folder
constraint on `Projects/_op-workflow.md`.

#### `default_agent` — list-or-scalar

The agent that runs steps that don't override. Two shapes accepted:

- **Scalar** — `default_agent: claude`. Sugar for a one-element list.
- **List** — `default_agent: [claude, gemini]`. The launcher walks the
  list and picks the first agent whose binary is installed, falling
  back to subsequent entries.

Single-agent setups are the common case; the list form is for vaults
with multiple agents and a preference order.

#### `default_model` — list-or-scalar-or-keyed-map

Three shapes accepted:

- **Scalar** — `default_model: opus`. Applies to every agent in
  `default_agent`. Internally normalized to "all" + `[opus]`.
- **List** — `default_model: [opus, sonnet]`. Walks with safe failure:
  for the chosen agent, picks the first model that validates against
  that agent's registry, **silently skipping cross-agent mismatches**
  (so `opus` in a list resolved to `gemini` is skipped, not an error).
- **Keyed map** — `default_model: { claude: opus, gemini: pro }`.
  Each value can be a scalar or list. Used when you genuinely run
  multiple agents with disjoint model namespaces and want to declare
  each agent's preference explicitly.

When in doubt, start with a scalar and only reach for the keyed map
when a single-agent default doesn't fit.

#### `steps` — required (in modern shape)

A list of step records. Each record:

- **`step:`** — required, unique step id within the workflow. The
  partition key matched against module `scope:` fields. Repeating an id
  emits `malformed-frontmatter` and the second entry is dropped.
- **`modules:`** — required, list of module ids. May be empty. Module
  ids the loader doesn't recognize emit `unknown-module` warnings (the
  step still composes from whatever ids do load).
- **`agent:`** (optional) — list-or-scalar override of `default_agent`.
- **`model:`** (optional) — list-or-scalar-or-keyed-map override of
  `default_model`. Step-level model overrides skip validation when the
  step doesn't declare an `agent:` (it'd be redundant — the defaults
  pass already validated that pair).

A step record that supplies neither `agent:` nor `model:` inherits
both from the workflow's defaults.

### Optional fields

#### `extends: <vault-relative-path>` — one level only

Points at a parent workflow file, vault-relative. The loader reads the
parent, parses it the same way, and merges:

- **Defaults** are shallow-merged. Child wins on per-key collisions.
  Empty child defaults (`default_agent: []`) fall through to the parent.
- **Step lists** are merged by step id: child step records with the
  same `step:` as a parent step *replace* the parent's record at the
  parent's slot; child step records with new ids append in their
  original order.

In the example: the parent declares a `kickoff` step; the child declares
a `review` step. After merge, the workflow has both, in that order.
Had the child declared its own `kickoff` (with the same id), the
child's `kickoff` would have replaced the parent's at the same slot —
no doubling, no ambiguity.

**The chain is one level only.** A parent file declaring its *own*
`extends:` emits a warning-severity `schema-mismatch` and the
grandparent is ignored. Author intent is rarely "deep chain"; the v1
lock is conservative on purpose.

## Per-step agent and model overrides

The `review` step in the example uses the verbose form:

```yaml
- step: review
  agent: copilot
  model: gpt-5
  modules: [review-and-merge]
```

The intent: *implementation* runs under the workflow default
(claude/opus), but *review* runs under a different agent — copilot at
gpt-5 — for an adversarial second opinion. This is the shipped pattern
for adversarial Copilot review: same workflow file, different agent and
model at the review step.

Other useful per-step combinations:

```yaml
# Plan mode under a stronger reasoning model:
- step: plan
  model: claude-opus-4-7   # versioned id; pinned, never auto-upgraded
  modules: [plan-rules]

# Cross-agent fallback list:
- step: implement
  agent: [claude, gemini]
  model: [opus, pro]       # walked with safe failure per chosen agent
  modules: [implement-rules]

# Keyed map for genuinely multi-agent workflows:
- step: review
  agent: [copilot, claude]
  model:
    copilot: gpt-5
    claude: [opus, sonnet]
  modules: [review-and-merge]
```

The "list vs scalar vs keyed map" choice is ergonomics:

- **Scalar** is shortest when you have one agent and one model.
- **List** is shortest when models share names across agents *and*
  you're happy with safe-failure walking.
- **Keyed map** is clearest when agents have disjoint model namespaces
  (Claude's `opus` is meaningless to Gemini); each agent gets its own
  preference list under its own key.

The validator catches typos: a model name not in the chosen agent's
registry surfaces a `bad-model` diagnostic with `BadModelSpec` payload
(allowed aliases + allowed versioned ids). The recovery dialog renders
that payload as a "did you mean?" picker so users don't have to spelunk
the registry.

## Try it

The example tree is loadable as-is. From this repo's root:

```bash
cp -R docs/examples/compose-first-workflow/Projects/* \
      <your-vault>/Projects/
```

(`-R` because the tree includes both files and folders.) Then open any
issue under `<your-vault>/Projects/tutorial-project/` and run
**op: open agent**:

- The kickoff step (inherited from `Projects/_op-workflow.md`) injects
  the `orient` module body under `claude / opus`.
- Click **▶ Composed prompt preview** to verify the body of
  `orient.md` shows up. The header line should read
  `1 module · 0 diagnostics`.
- To see the review step, you'd launch the agent at `mode=review` (via
  CLI: `obsidian op-open-agent id=<issue-id> mode=review`). The
  composer then composes `review-and-merge.md` instead, and the launch
  modal switches the resolved agent/model to `copilot / gpt-5`.

You don't actually have to launch the agent — the preview disclosure
shows you the composed string before it's sent. The whole tutorial
verifies via preview, not via an actual agent run.

## When to add `extends:` vs duplicate

The two-file setup pays off as soon as you have **two or more
projects** sharing the same baseline workflow. Adding a third project
is then a one-line file (`extends:` + an empty `steps: []`).

For a single-project vault, skip `extends:` and put everything in the
project's `WORKFLOW.md`. The redundancy of an `_op-workflow.md` you
extend exactly once isn't worth the file. You can add it later when a
second project shows up — the migration is additive.

## Common mistakes the loader catches

| Symptom | Likely cause | Diagnostic code |
| :--- | :--- | :--- |
| Workflow file silently dropped | `type:` not `workflow`, or `schema:` not `1` | `schema-mismatch` |
| Workflow file silently dropped | `extends:` points at a file the loader can't find | `schema-mismatch` |
| `extends:` warning-only — grandparent ignored | The parent file itself declares `extends:` | `schema-mismatch` (warning) |
| Workflow file warning — parsing falls back to "kickoff body" mode | Frontmatter present but `steps:` missing (legacy shape 3) | `schema-mismatch` (warning) |
| Step record dropped from the merged step list | Two step records share the same `step:` id | `malformed-frontmatter` |
| Step references a module id that doesn't exist | The named module isn't loaded for this project | `unknown-module` |
| Model name highlighted with "did you mean…" picker | Model name doesn't validate against the agent's registry | `bad-model` |

Run `obsidian op-explain-workflow id=<issue-id> mode=<step>` to surface
all of these in one place — the diagnostics block is rendered through
the same unified formatter the editor squiggles use.

## Where to next

- [05 — Use variables and templating](./05-variables-and-templating.md)
  goes one layer deeper: how `{{vars.foo}}` references resolve when
  the same name is set in a module default, in global settings, in
  the project's `STATUS.md`, and at launch time — i.e., the precedence
  chain in action.
- [`docs/specs/workflow-file-schema.md`](../specs/workflow-file-schema.md)
  is the workflow-file contract: every field, every diagnostic, the
  full legacy fallback ladder, and the model registry per agent.
- [`docs/specs/workflow-module-schema.md`](../specs/workflow-module-schema.md)
  is the matching module-file contract — keep it open when authoring
  the modules a workflow file composes from.
