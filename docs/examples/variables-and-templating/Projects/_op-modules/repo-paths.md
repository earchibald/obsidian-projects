---
id: repo-paths
title: Where to find code in this repo
type: workflow-module
scope: kickoff
order: 30
vars:
  - { name: docs_dir, default: "docs", description: "Top-level documentation directory" }
  - reviewer_handle
---

You're working on **{{id}}** ({{title}}) on branch `{{branch}}`. Code
lives under `{{repo_path}}`. Documentation lives under
`{{repo_path}}/{{vars.docs_dir}}` — long-form prose goes there, not in
README.

When the PR is ready for adversarial review, tag
`{{vars.reviewer_handle}}` and ask for concrete pressure-test prompts.
The handle isn't supplied with a default in this module — every project
sets its own (typically via `STATUS.md` `vars:` so the value lives next
to the project's other config).
