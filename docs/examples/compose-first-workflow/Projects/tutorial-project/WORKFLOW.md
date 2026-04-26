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

Per-project workflow. Inherits `kickoff` from the global default at
`Projects/_op-workflow.md` and adds a `review` step that runs under
copilot/gpt-5 instead of the workflow defaults. The merged step list the
loader hands the composer is `[kickoff, review]` — parent first, then
child.
