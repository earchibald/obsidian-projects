---
type: workflow
schema: 1
project: tutorial-project
default_agent: claude
default_model: opus
steps:
  - step: kickoff
    modules: [version-cadence, repo-paths]
---

Per-project workflow that composes both example modules at kickoff. No
`extends:` — the workflow stands alone for didactic clarity. In a real
vault you'd typically `extends: Projects/_op-workflow.md` instead so the
project picks up vault-wide defaults for free.
