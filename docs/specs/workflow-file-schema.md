# Workflow File Schema

Status: shipped in OP-196 (1c of OP-184). Composition (1d/OP-197) consumes the
loaded workflow; this doc covers the file format, the `extends:` inheritance
rule, the model registry, and the legacy-fallback ladder. Module composition
itself lives in [`workflow-module-schema.md`](./workflow-module-schema.md).

## What a workflow file is

A workflow file is the per-project description of *what gets injected, by
which agent, at which step*. It declares:

- **Defaults**: the agent and model used when a step doesn't override them.
- **Steps**: an ordered list of named stages — `kickoff`, `review`,
  `finalize`, etc. Each step references a list of module ids (defined in
  [workflow modules](./workflow-module-schema.md)) that supply its content
  and variable declarations. A step may override the default agent or model.
- **Inheritance**: an optional `extends:` pointer to a parent workflow file
  (typically a global default at `Projects/_op-workflow.md`). Parent steps
  apply unless the child repeats a `step:` id, in which case the child's
  step replaces the parent's at that slot.

## Where workflow files live

| Location | Path | Applies to |
| :--- | :--- | :--- |
| Per-project | `Projects/<slug>/WORKFLOW.md` | Project `<slug>`. |
| Global default | `Projects/_op-workflow.md` (by convention) | Any project that names it via `extends:`. |

The loader doesn't auto-merge globals — a project must opt in by declaring
`extends:` explicitly. This is intentional: an unnamed global is invisible to
authors editing the per-project file.

## Frontmatter contract

```yaml
---
type: workflow                        # required, exact literal
schema: 1                             # required integer; locks the contract
project: obsidian-projects            # required string (project slug)
default_agent: claude                 # list-or-scalar
default_model: opus                   # list-or-scalar-or-keyed-map
extends: Projects/_op-workflow.md     # optional, vault-relative; one level only
steps:                                # required (in modern shape)
  - step: kickoff                     # required, unique within the workflow
    modules: [orient, identify-issue] # list of module ids; may be empty
    agent: claude                     # optional override (list-or-scalar)
    model: opus                       # optional override (list-or-scalar-or-keyed-map)
  - step: review
    modules: [review-and-merge]
---

# Markdown body is opaque commentary today. The synthetic legacy-kickoff step
# is the only path that attaches body content to a workflow programmatically.
```

### `type` and `schema`

`type` is the literal `workflow`. `schema` is an integer locking the format
version. **This loader supports `schema: 1` only.** Files declaring
`schema: 2` (or any other value) emit `schema-mismatch` and are dropped —
future versions will be added with explicit migration paths.

### `project`

The project slug. Must be a non-empty string. If it disagrees with the
file's enclosing folder name (`Projects/<slug>/`), the loader emits a
warning-severity `malformed-frontmatter` diagnostic and uses the folder
name. The warning is intentional: the folder is canonical, but a
mistyped `project:` field is a useful breadcrumb when copying a workflow
between projects.

### `default_agent` (list-or-scalar)

Accepts:

- A scalar string: `default_agent: claude`. Equivalent to `[claude]`.
- A list of strings: `default_agent: [claude, gemini]`. The launch context
  picks one at runtime.

Empty input, whitespace-only entries, or non-string entries emit
`malformed-frontmatter` and the workflow is dropped.

Lists deduplicate while preserving order. `[claude, claude, gemini]` becomes
`[claude, gemini]`.

### `default_model` (list-or-scalar-or-keyed-map)

Accepts three shapes:

- **Scalar** — `default_model: opus`. Applies to every agent in the
  surrounding agent list. Internally normalised to `{ kind: "all", values: ["opus"] }`.
- **List** — `default_model: [opus, sonnet]`. Same semantics: applies to every
  agent, with multiple alternatives. The launch context picks one.
- **Keyed map (per-agent)** — `default_model: { claude: opus, gemini: pro }`.
  Each value is itself a list-or-scalar. Internally normalised to
  `{ kind: "perAgent", perAgent: { claude: ["opus"], gemini: ["pro"] } }`.

Empty maps, empty lists, and non-string values emit
`malformed-frontmatter`. A keyed map referencing an agent absent from
`default_agent` emits a warning-severity diagnostic — the agent might still
work at runtime via a step-level override, but more often it's a typo.

### `extends:` (optional, one level only)

Points at another workflow file (vault-relative path). The loader reads the
parent, parses it the same way, and merges:

- **Defaults**: shallow merge. Child wins on per-key collisions. Empty child
  defaults (`default_agent: []`, `default_model: { kind: "all", values: [] }`)
  fall through to the parent.
- **Steps**: child step ids replace parent steps at the parent's slot. Child
  steps with new ids append in their original order. The merged step list
  preserves parent order for inherited slots and child order for new slots.

**One level only.** A parent file declaring its own `extends:` emits a
warning-severity `schema-mismatch` and the grandparent is ignored. Author
intent is rarely "deep chain"; v1 lock is conservative.

### `steps:` (required)

A list of step records. Each record:

- **`step` (required)** — unique step id within the workflow. Non-empty
  string. Duplicate ids: first wins, second emits `malformed-frontmatter`.
- **`modules` (required, may be empty)** — list of module ids the step
  composes from. Module resolution lives in
  [`workflow-module-schema.md`](./workflow-module-schema.md). Module ids are
  trimmed and deduplicated.
- **`agent` (optional)** — list-or-scalar override. Same semantics as
  `default_agent`.
- **`model` (optional)** — list-or-scalar-or-keyed-map override. Same
  semantics as `default_model`.

A step that supplies neither `agent:` nor `model:` inherits both from the
workflow's defaults. The model-validation pass skips inherit-only steps —
the `<defaults>` pass already validated that pair.

## Model registry

Model names are validated against a per-agent registry, keyed by agent id.
Each agent has:

- **`aliases`** — a map from bare alias (e.g. `opus`, `sonnet`, `haiku`) to
  the canonical versioned id (e.g. `claude-opus-4-7`). Aliases are the
  ergonomic shorthand a workflow file author writes.
- **`versioned`** — a set of canonical ids accepted as-is. Versioned ids pin
  to a specific point release; aliases float forward as we update the
  registry.

A model name validates if it appears as an alias key OR as a versioned id
for the relevant agent. Resolution returns the canonical versioned id in
both cases.

| Agent | Aliases | Canonical examples |
| :--- | :--- | :--- |
| `claude` | `opus` → `claude-opus-4-7`<br>`sonnet` → `claude-sonnet-4-6`<br>`haiku` → `claude-haiku-4-5-20251001` | `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-opus-4-6` |
| `gemini` | `pro` → `gemini-2.5-pro`<br>`flash` → `gemini-2.5-flash` | `gemini-2.5-pro`, `gemini-2.5-flash` |
| `copilot` | `default` → `gpt-5` | `gpt-5`, `gpt-4.1` |

Adding a new model:

- **New ergonomic alias**: add `name → canonicalId` to `aliases` *and* add
  `canonicalId` to `versioned` (the alias must resolve to a known versioned
  id — `validateRegistryShape()` enforces this).
- **New pinned version**: add it to `versioned` only.
- **New agent**: add a top-level entry. The pure registry doesn't enforce
  the agent id against `agentProfiles.AgentId`; that's a separate runtime
  concern.

### `BadModelSpec`

When validation fails, the loader emits a `WorkflowDiagnostic` with
`code: "bad-model"`. The `extra` field carries a `BadModelSpec` payload:

```ts
{
  stepId: string;          // step id, or "<defaults>" for top-level default_model
  badName: string;
  agent: string;
  allowedAliases: string[];   // sorted
  allowedVersioned: string[]; // sorted
}
```

Surfaces consuming the diagnostic stream (e.g. the recovery dialog at OP-184
§3e) can render a "did you mean?" picker straight from these arrays.

Unknown agent ids short-circuit to `bad-model` with **empty** `allowedAliases`
and `allowedVersioned` — the empty arrays are the signal that the agent id
itself is the typo.

## Legacy WORKFLOW.md fallback ladder

Many existing projects' `WORKFLOW.md` files predate the modern schema. To
keep them working without forcing a flag-day migration, the loader applies a
six-shape fallback ladder before declaring a file unparseable:

| # | Trigger | Result |
| :-- | :-- | :-- |
| 1 | No frontmatter fence at all. | Synthetic workflow with one step `{ step: "kickoff", modules: [], legacyKickoffBody: <entire body> }`. `isLegacy: true`. |
| 2 | Frontmatter fence present, no `type:` field. | Same as (1), with the body extracted post-fence. |
| 3 | `type: workflow` but no `steps:` field. | Same as (1). Often appears mid-migration. |
| 4 | `type: <not workflow>`. | Drop the file with `schema-mismatch` diagnostic. |
| 5 | Frontmatter parses to `null` (e.g., empty fence `---\n---`). | Same as (1). |
| 6 | Body contains inline `---` HRs after the frontmatter fence. | Modern parsing — fence-detection runs against the **first** `\n---` only. The HRs in the body are not mistaken for a frontmatter close. Logic matches `promptBuild.ts:stripFrontmatter` exactly. |

Shape 6 is the only one that doesn't enter the legacy synthesizer — it's a
modern workflow with HRs in its body. The fixture exists to lock the
regression: a future refactor that swaps `indexOf("\n---", 3)` for greedy
match would silently break shape-6 files.

The loader emits a warning-severity `schema-mismatch` diagnostic for shapes
1, 2, 3, 5 so users see "running in legacy compatibility mode" alongside the
synth result. A separate diagnostic with severity `error` fires for shape 4.

Migration: replace the legacy body with the modern frontmatter contract:

```yaml
---
type: workflow
schema: 1
project: <your-slug>
default_agent: claude
default_model: opus
steps:
  - step: kickoff
    modules: [<module-ids>]
---
```

Then split the body into module files under `Projects/<slug>/MODULES/` (see
[`workflow-module-schema.md`](./workflow-module-schema.md)). Run the loader
once and inspect diagnostics — `bad-model` and `malformed-frontmatter` will
flag any remaining gaps.

## Diagnostics

Every error and warning the loader emits is a `WorkflowDiagnostic`. Codes:

| Code | Severity | When it fires |
| :--- | :--- | :--- |
| `schema-mismatch` | `error` | `type` field is missing or not `workflow`; `schema` is missing or not `1`; `extends:` resolves to a missing file. |
| `schema-mismatch` | `warning` | Parsed via legacy fallback ladder (shapes 1, 2, 3, 5); parent file declares its own `extends:` (one-level rule). |
| `malformed-frontmatter` | `error` | Required field missing or wrong shape; non-string entries in agent/model lists; non-object step record; duplicate step id. |
| `malformed-frontmatter` | `warning` | `project` field disagrees with the file's enclosing folder slug; `default_model` keyed-map references an agent absent from `default_agent`. |
| `bad-model` | `error` | A model name doesn't resolve to a known alias or versioned id for its agent. Carries `BadModelSpec` payload in `extra`. |

The diagnostic stream is the primary surface for downstream recovery
dialogs and CLI tools — consumers should pattern-match on `code` and
`severity`, not on `message` (which may be reformatted).

## What's not in this layer

- **Composition** (resolving modules into step bodies, applying user-supplied
  variables, ordering modules within a scope) — OP-197 (1d).
- **Runtime injection** at agent launch — OP-198 (2a) and OP-199 (2b).
- **Settings UI** for editing workflow files — OP-186 (3).
- **Migration** of this project's own `WORKFLOW.md` into the modern shape —
  OP-189.
