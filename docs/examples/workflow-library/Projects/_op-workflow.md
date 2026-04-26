---
type: workflow
schema: 1
project: _global
default_agent: claude
default_model: opus
steps:
  - step: evaluate
    modules: [orient]
  - step: plan
    modules: []
  - step: implement
    modules: [commit-mapping]
  - step: review
    modules: [adversarial-review, pr-required]
  - step: finalize
    modules: [version-cadence, gh-issue-close]
---

# Global default workflow — `evaluate → plan → implement → review → finalize`

This is the historical five-step sequence that every project's
per-project `WORKFLOW.md` can inherit by declaring
`extends: Projects/_op-workflow.md`.

The five steps:

- **evaluate** — orient, read the issue note, surface ambiguity. Wired
  through the `orient` module.
- **plan** — write the `## Plan` section before touching code. Empty
  module list by default; projects with a planning checklist or
  pre-flight runbook can drop their own `plan`-scoped modules in
  `Projects/<slug>/MODULES/` and reference them here.
- **implement** — actually write the code, with per-commit mapping back
  to the issue note.
- **review** — open a PR, request adversarial review, gate merge on
  green CI and a clean review.
- **finalize** — bump the version file at resolve time, let the plugin
  close the linked GitHub issue atomically.

The kickoff-scoped library modules (`branching`, `tmux-safety`) are
**not** wired into a step here on purpose — those are vault-wide rules
that fire at agent launch via the kickoff injection path, not as part
of any one step. Per-project workflows that want them in `evaluate`
instead can list them by id in their own `evaluate` step's `modules:`
list (which replaces this file's `evaluate` step at the same slot
under `extends:` semantics).
