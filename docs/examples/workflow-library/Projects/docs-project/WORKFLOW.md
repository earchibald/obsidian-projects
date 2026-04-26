---
type: workflow
schema: 1
project: docs-project
default_agent: claude
default_model: opus
steps:
  - step: evaluate
    modules: [orient]
  - step: plan
    modules: []
  - step: implement
    modules: [commit-mapping]
---

# Docs-only project workflow — three steps, no review or finalize

This per-project workflow is **standalone** — it does not declare
`extends:` and so does not inherit anything from the global default at
`Projects/_op-workflow.md`. The intent is to demonstrate a domain-
flavored variant: a docs-only project where the merge gate and version-
bump steps don't apply because there is no code to ship and no version
file to move.

Why standalone instead of `extends:` with a "remove `review` and
`finalize`" override? The workflow file format has no remove semantics —
child step ids replace parent steps at the same slot, and child steps
with new ids append, but there's no syntax for "drop step X from the
parent." When a project genuinely needs a shorter step list, the
cleanest expression is a standalone file that lists exactly the steps it
wants — which is what this file does.

Tradeoffs:

- **Standalone**: full control over the step list at the cost of
  re-declaring `default_agent` / `default_model` and re-listing every
  step, even those that are identical to the global default.
- **`extends:`**: inherit everything for free; override individual
  steps; cannot remove an inherited step without falling back to
  standalone.

If your project starts as docs-only but later grows code, switch it to
`extends:` and add the `review` / `finalize` steps via standard merge
semantics — no migration of the per-project module files required.
