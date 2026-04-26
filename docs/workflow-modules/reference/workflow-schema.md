# Workflow schema — quick reference

This page is the day-to-day cheat-sheet for authoring a workflow
file. It does **not** repeat every contract detail — for the full
field-by-field rules, the `extends:` merge semantics, and the legacy
`WORKFLOW.md` fallback ladder, see
[`workflow-file-schema.md`](../../specs/workflow-file-schema.md).

## Where workflow files live

| Location | Path |
| :--- | :--- |
| Per-project | `Projects/<slug>/WORKFLOW.md` |
| Global default (opt-in via `extends:`) | `Projects/_op-workflow.md` |

The loader does not auto-merge the global — a project must opt in
explicitly with `extends: Projects/_op-workflow.md`.

## Minimal frontmatter

```yaml
---
type: workflow                       # required, exact literal
schema: 1                            # required integer; locks the contract
project: obsidian-projects           # required string (project slug)
default_agent: claude                # list-or-scalar
default_model: opus                  # list-or-scalar-or-keyed-map
extends: Projects/_op-workflow.md    # optional, vault-relative; one level only
steps:                               # required (in modern shape)
  - step: kickoff                    # required, unique within the workflow
    modules: [orient, branching]     # list of module ids; may be empty
    agent: claude                    # optional override (list-or-scalar)
    model: opus                      # optional override (list-or-scalar-or-keyed-map)
  - step: review
    modules: [review-and-merge]
---
```

## `default_agent` and step `agent:`

List-or-scalar:

- Scalar: `default_agent: claude` ≡ `[claude]`.
- List: `default_agent: [claude, gemini]`. The launch context picks one
  at runtime.

Lists deduplicate (preserving order). Empty / whitespace-only / non-
string entries emit `malformed-frontmatter` and the workflow is
dropped.

## `default_model` and step `model:`

Three accepted shapes:

- **Scalar** — `default_model: opus`. Applies to every agent in the
  surrounding agent list.
- **List** — `default_model: [opus, sonnet]`. Same: applies to every
  agent, with multiple alternatives.
- **Keyed map (per-agent)** — `default_model: { claude: opus, gemini: pro }`.
  Each value is itself list-or-scalar.

A keyed map referencing an agent absent from `default_agent` emits a
warning-severity diagnostic — usually a typo.

## Model registry

A model name validates if it is either an **alias** (the ergonomic
shorthand) or a **canonical versioned id** for the relevant agent.
Aliases resolve to a single canonical id; versioned ids pass through
unchanged.

The single source of truth is
`plugins/op-obsidian/src/modelRegistry.ts`. The table below is
**generated** from that file — to add or remove a model, edit the
registry and run:

```
node scripts/check-workflow-docs.mjs
```

<!-- AUTO-GENERATED:model-registry-table -->
| Agent | Aliases (alias → canonical) | Versioned ids |
| :--- | :--- | :--- |
| `claude` | `opus` → `claude-opus-4-7`<br>`sonnet` → `claude-sonnet-4-6`<br>`haiku` → `claude-haiku-4-5-20251001` | `claude-opus-4-7`<br>`claude-opus-4-6`<br>`claude-opus-4-5`<br>`claude-sonnet-4-6`<br>`claude-sonnet-4-5`<br>`claude-haiku-4-5`<br>`claude-haiku-4-5-20251001` |
| `gemini` | `pro` → `gemini-2.5-pro`<br>`flash` → `gemini-2.5-flash` | `gemini-2.5-pro`<br>`gemini-2.5-flash`<br>`gemini-2.0-pro`<br>`gemini-2.0-flash` |
| `copilot` | `default` → `gpt-5` | `gpt-5`<br>`gpt-4.1` |
<!-- /AUTO-GENERATED:model-registry-table -->

### Adding a new model

- **New ergonomic alias**: add the `alias → canonical` mapping to that
  agent's `aliases` AND add the canonical id to `versioned`. Aliases
  must resolve to a known versioned id; the test suite enforces this
  invariant via `validateRegistryShape`.
- **New pinned version**: add the canonical id to `versioned` only.
- **New agent**: add a top-level entry. The pure registry doesn't
  enforce the agent id against the runtime `AgentId` enum — that's a
  separate concern.

After editing, run `node scripts/check-workflow-docs.mjs` to
regenerate the table; the CI guard rejects partial updates.

## `steps:` and `extends:`

- Each step has a unique `step:` id within a workflow.
  `modules:` is required (may be empty).
- `agent:` and `model:` are optional per-step overrides.
- `extends:` points at one parent workflow file. **One level only** — a
  parent declaring its own `extends:` emits a warning and the
  grandparent is ignored. Child step ids replace the parent's at the
  same slot; child steps with new ids append.

Detailed merge semantics, model validation diagnostics, and the
six-shape legacy fallback ladder live in the spec:
[`workflow-file-schema.md`](../../specs/workflow-file-schema.md).

## See also

- [`workflow-file-schema.md`](../../specs/workflow-file-schema.md) —
  full contract: `extends:` merge, legacy ladder, every diagnostic.
- [`module-schema.md`](./module-schema.md) — module file contract this
  workflow file's `steps:` references by id.
- [`precedence.md`](./precedence.md) — how step-level overrides
  interact with global / project / launch user vars.
