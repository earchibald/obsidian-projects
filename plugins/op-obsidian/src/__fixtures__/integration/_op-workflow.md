---
type: workflow
schema: 1
project: fixture-project
default_agent: claude
default_model: opus
steps:
  - step: kickoff
    modules: [branching, version-cadence]
---

Global default workflow inherited by per-project files via `extends:`.
