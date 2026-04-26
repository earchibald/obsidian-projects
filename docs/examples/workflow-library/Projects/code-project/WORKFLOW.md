---
type: workflow
schema: 1
project: code-project
default_agent: claude
default_model: opus
extends: Projects/_op-workflow.md
steps: []
---

# Full code-project workflow — inherits the global default

This per-project workflow `extends:` the global default at
`Projects/_op-workflow.md` and declares an empty `steps: []` — so it
inherits the complete five-step sequence
(`evaluate → plan → implement → review → finalize`) verbatim, including
every module reference. Empty `steps:` is the right shape for "inherit
the parent verbatim with no overrides"; child step ids replace parent
steps at the same slot, and an empty list adds no replacements.

(The `steps:` field is required by the schema even when extending —
the loader treats files without `steps:` as the legacy fallback shape,
not as modern files inheriting unchanged.)

This is the canonical setup for a "real code" project: the per-project
file exists primarily to declare `project: code-project`, which the
loader uses to scope per-project modules under
`Projects/code-project/MODULES/<id>.md`. A project with no per-project
modules and no per-step overrides could in principle skip declaring its
own `WORKFLOW.md` once the loader's project inference is in place — but
authoring an explicit per-project file is the documented happy path
because it makes the project's intent visible alongside the rest of its
files.

To override a single step (e.g. swap the `review` step to run under a
different agent), repeat that step's id in a `steps:` list:

```yaml
steps:
  - step: review
    agent: copilot
    model: gpt-5
    modules: [adversarial-review, pr-required]
```

Child step ids replace parent steps at the same slot; child steps with
new ids append. There is no "remove inherited step" semantics — see the
sibling `docs-project/WORKFLOW.md` for the standalone-without-`extends:`
pattern when you need to omit inherited steps entirely.
