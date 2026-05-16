# Workflow Modules — Troubleshooting

Every error and warning the workflow-modules engine emits is a
`WorkflowDiagnostic` — one shape, one formatter, every surface. This page
walks each diagnostic code, explains what it means in plain English, and
shows how to fix it.

## Where the same diagnostic shows up

A single diagnostic record (one `WorkflowDiagnostic`) appears in multiple
surfaces — they all read it through the unified formatter
(`workflowDiagnosticFormat.ts`), so the prose is byte-identical no matter
where you encounter it:

- **Settings → Workflows panel.** The module list shows per-module
  diagnostics inline (badge + label + location + message + hint).
- **`op-explain-workflow` / `op-list-vars` CLIs.** The structured payload
  in `Projects/_scratch/op-last-response.md` carries `diagnosticLines`
  (one-line) and `diagnosticBlocks` (multi-line); the stdout summary
  reports per-severity counts.
- **Editor squiggles.** Saving a `WORKFLOW.md` or module file runs the
  loader and renders diagnostics as red/yellow underlines with the same
  message and a status-footer count.
- **Dry-run preview banner** (launch modal). The `▶ Composed prompt
  preview` disclosure header shows the diagnostic count next to the
  module count and char count.

If a fix below says "edit the module" and you're staring at the Settings
panel, you can open the file straight from the diagnostic row's location
breadcrumb — clicking opens the file in the active leaf.

## Severity legend

- **Error** (`E`) — the workflow won't compose, or the module/file is
  dropped from the load. Block-and-fix.
- **Warning** (`W`) — composition continues, but something looks wrong
  enough that the agent might do the wrong thing. Worth investigating.
- **Info** (`I`) — advisory; the surface is showing you a guardrail or a
  size notice. Not a failure.

## The codes

### `bad-model`

**What it means.** A model name in the workflow file isn't on the agent's
allow-list. The model registry (`modelRegistry.ts`) maintains the
canonical aliases (`opus`, `sonnet`, `haiku`) and the versioned ids
(`claude-opus-4-7`, `claude-sonnet-4-6`, …). A typo (`oups`), a model
that's been retired, or a model paired with the wrong agent (e.g.
`gemini` with `opus`) all emit this.

**How to fix.**

1. Open the workflow file (`Projects/<slug>/WORKFLOW.md`).
2. Find the offending field — `default_model:`, or a step-level `model:`
   override. The diagnostic's `stepId` points at it (`<defaults>` for the
   workflow-level field).
3. Replace the bad value with one of the diagnostic's listed allowed
   aliases or versioned ids.

If you'd rather not edit the file by hand, the **bad-model recovery
dialog** (OP-205) opens automatically when an `op-open-agent` launch hits
this diagnostic — it offers a one-click swap, writes a `.bak`, and shows
the diff before applying.

**Cross-reference.** Allowed model lists per agent live in
[`workflow-file-schema.md` § Models](../specs/workflow-file-schema.md#default_model-list-or-scalar-or-keyed-map).

### `missing-var`

**What it means.** A module body references a `{{var_name}}` whose value
the composer couldn't resolve at any precedence layer. The four layers
(Module default → Global default → Project default → Launch override)
are walked top-to-bottom; if every layer comes up empty, the var is
unresolved and the prose injected reads literally (`{{var_name}}` —
which is almost always the wrong thing for an agent to see).

**How to fix.**

Pick the layer that should own the value:

- **Module default.** Add a default to the module's `vars:` block:
  `- name=value` (shorthand) or `- { name: name, default: value }`.
  Right when the value is intrinsic to the module's behavior.
- **Global default.** Edit
  `Projects/_op-modules/_overrides.md`'s `vars:` block. Right when the
  value is vault-wide policy.
- **Project default.** Edit `Projects/<slug>/MODULES/_overrides.md`.
  Right when the value differs per project.
- **Launch override.** Fill it in the launch modal's variables panel
  (OP-204). Right for one-off launches.

The diagnostic's `varName` field tells you which name is unresolved; the
`scopeLabel` (when present) tells you the lowest layer the composer
actually checked, so you know how high you need to push the value.

**Cross-reference.** [`workflow-module-schema.md` § Vars
declarations](../specs/workflow-module-schema.md#vars-declarations) covers
the three `VarDecl` shapes.

### `unknown-module`

**What it means.** A workflow file's `steps:` list names a module id that
didn't load. Either the file doesn't exist, the filename basename
doesn't match its `id:` field, or the module's `type:` isn't the literal
`workflow-module`.

**How to fix.**

1. **Check the spelling.** `steps: [{ step: kickoff, modules: [branchin] }]`
   silently fails when the file is named `branching.md`.
2. **Confirm the file exists.** Modules live one level deep:
   `Projects/_op-modules/<id>.md` (global) or
   `Projects/<slug>/MODULES/<id>.md` (per-project). Files in
   subdirectories (`Projects/_op-modules/sub/foo.md`) are ignored.
3. **Confirm filename matches `id:`.** A module file at `branching.md`
   must declare `id: branching`. Mismatches emit
   `malformed-frontmatter` and the module is dropped — which then
   surfaces as `unknown-module` from the workflow file that names it.
4. **Confirm `type: workflow-module`** is set in frontmatter (exact
   literal). Anything else and the loader silently skips the file.

**Cross-reference.**
[`workflow-module-schema.md` § Where modules live](../specs/workflow-module-schema.md#where-modules-live).

### `schema-mismatch`

**What it means.** A workflow or module file declares a `schema:`
version this loader doesn't support. Today the loader supports
`schema: 1` only; declaring `schema: 2` (or anything other than `1`)
emits this and the file is dropped.

The same code is also emitted (warning severity) when an `extends:` chain
goes more than one level deep — `extends:` is "one level only" by design.

**How to fix.**

- For a `schema:` mismatch: bump the file back to `schema: 1`. Future
  schema versions will ship with explicit migration paths and a `schema:
  2` upgrade.
- For an `extends:` chain too deep: flatten the chain. The grandparent's
  fields can move into the parent (or directly into the project's
  workflow file).

**Cross-reference.**
[`workflow-file-schema.md` § `type` and `schema`](../specs/workflow-file-schema.md#type-and-schema)
and [§ `extends:` (one level only)](../specs/workflow-file-schema.md#extends-optional-one-level-only).

### `import-collision`

**What it means.** Two modules contribute the same variable name at the
same scope after the composer merges them. Modules at the same scope
share a variable namespace; declaring `vars: [- pkg]` in two
`scope: kickoff` modules collides because nothing in the layered model
tells the composer which one wins.

**How to fix.**

- **Rename one.** If the two modules really are talking about different
  things, give the variables distinct names (`module_a_pkg`,
  `module_b_pkg`).
- **Merge the modules.** If the duplication means "these two modules
  belong together", consolidate them — one module per concept is the
  authoring guideline.
- **Move it up a layer.** If the variable is genuinely shared (same
  meaning, same value), declare it once in the project or global
  override file and drop the per-module declarations. The composer
  shadows lower scopes silently.

### `intra-scope-collision`

**What it means.** Two modules at the same `scope:` declare the same
variable name *within their own bodies* — not after composition, but at
load time. The diagnostic is emitted by the loader before composition
runs, so it always fires regardless of which workflow names them.

**How to fix.**

- **Make scope strings distinct.** If the two modules really represent
  different stages, set `scope: kickoff-orient` and `scope: kickoff-rules`
  (workflow files reference them by name in `steps:`, so the rename
  cascades through the workflow file too).
- **Merge the modules.** Same authoring guideline as `import-collision`
  — one concept per file makes the override surface predictable.

The diagnostic's `extra.scope` and `extra.moduleIds` fields tell you the
scope key and the colliding module ids (sorted, for stable output).

### `malformed-frontmatter`

**What it means.** The catch-all for "this file's frontmatter doesn't
match the schema". Examples:

- Missing or wrong-type required field (e.g. `id:` is absent, or `vars:`
  is a string instead of a list).
- Filename basename doesn't match `id:` field.
- A `VarDecl` is malformed (object form missing `name:`, both shorthand
  and object form mixed within one entry, …).
- A `default:` is a non-string type (commonly: YAML coerced an ISO date
  to a `Date`).
- Duplicate `name:` entries within one module's `vars:`.

**How to fix.**

The diagnostic carries `extra.path`, `extra.field`, `extra.expected`,
and `extra.actual` so the surface can show you exactly which field is
wrong and what the loader expected.

**Common gotcha — YAML date coercion.** A bare `- 2026-04-25` in a
`vars:` list parses as a `Date`, not a string, and is rejected. Fix:
quote the value (`'2026-04-25'`) or use the shorthand
(`name=2026-04-25`).

**Common gotcha — typo in a `default:` key.** Object-form unknown keys
are silently tolerated for forward-compat. So `defualt:` (typo) doesn't
emit a diagnostic — but the default also doesn't apply. If a default is
"missing" in practice, double-check the key spelling.

**Cross-reference.**
[`workflow-module-schema.md` § `vars:` declarations](../specs/workflow-module-schema.md#vars-declarations).

### `size-budget`

**What it means.** The composed prompt — the prose the agent will
actually receive — exceeds the recommended character budget
(`maxWorkflowChars`, default 32 768). This is **info-only**; the launch
proceeds. Modern models tolerate the size comfortably; the cap is a
guardrail that surfaces "this got bigger than you might have expected"
rather than a constraint that blocks the launch.

**When to act.**

If you're seeing this routinely, the workflow has likely grown beyond
its useful scope:

- **Split the workflow.** A monolithic kickoff prompt with rules for
  every situation is harder for an agent to follow than three smaller
  scopes (`kickoff`, `plan`, `review`) injected at the matching step.
- **Trim verbose modules.** The composer shows per-chunk size in the
  `op-explain-workflow` payload — use it to find the heaviest
  contributors.
- **Move detail into reference docs.** "Read `docs/foo.md`" + a vault
  link is often as effective as inlining the full text.

If latency hasn't visibly increased, you can also raise
`maxWorkflowChars` in Settings → Advanced → Injection. The cap is
informational, not enforced.

### `lazy-skill`

**What it means.** A module with `lazy: true` was partitioned out of the
inlined prompt and will be emitted as an on-demand Claude Code skill
instead. This is **info-only** when the module has a `description:`
field; it is **warning** when the description is absent and the skill
falls back to the module's title.

**When to act.**

- **Run `op-emit-lazy-skills`** to materialize the skill files for every
  `lazy: true` module in the workflow. Without this step the skill files
  on disk are stale (or absent) and the agent cannot invoke them.
- **Add a `description:` field** to the module frontmatter to suppress
  the warning variant. A one-sentence description of what the skill does
  is enough.

## Diagnostic surfaces vs. the recovery dialog

A few diagnostics open dedicated recovery UI rather than just rendering
through the formatter:

- **`bad-model`** — at launch time, the recovery dialog (OP-205) offers
  a one-click swap with a `.bak` and a diff before writing.
- **(All codes) editor save** — the editor validator (OP-207) renders
  diagnostics as squiggles in the open file plus a status-bar footer.

The recovery dialog and the editor squiggles read the same
`WorkflowDiagnostic` records the Settings panel and CLIs do — so a fix
applied via any surface clears the diagnostic everywhere on next reload.

## Where to next

- [01-overview.md](./01-overview.md) — concept doc: precedence chain,
  kickoff vs per-step injection.
- [02-quickstart.md](./02-quickstart.md) — five-minute walkthrough.
- [04-faq.md](./04-faq.md) — common questions about authoring,
  variables, and module sharing.
- [05-settings-reference.md](./05-settings-reference.md) — Workflows
  group + Available variables panel + retired Injection inline-cap row.
- [`workflow-module-schema.md`](../specs/workflow-module-schema.md) —
  module file format reference.
- [`workflow-file-schema.md`](../specs/workflow-file-schema.md) —
  workflow file format reference.
