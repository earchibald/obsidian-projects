---
type: workflow
schema: 1
project: fixture-project
default_agent: claude
default_model: opus
extends: Projects/_op-workflow.md
steps:
  - step: plan
    modules: [plan-rules]
  - step: review
    modules: [review-and-merge]
---

Per-project workflow extending the global default. Inherits the `kickoff` step from the parent and adds `plan` + `review` here.
