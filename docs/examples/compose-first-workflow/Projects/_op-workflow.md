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

Global default workflow. Every per-project workflow that declares
`extends: Projects/_op-workflow.md` inherits this kickoff step. Per-project
files can replace the inherited step (by repeating the same `step: kickoff`
id) or append new steps with new ids.
