---
type: workflow
schema: 1
project: demo-project
default_agent: claude
default_model: opus
---

# Project workflow

`type: workflow` is set but there's no `steps:` field. Should fall through to
legacy-3 — the body becomes a synthetic kickoff step.

## Notes

This shape often appears mid-migration: an author has switched the type to
`workflow` but hasn't decomposed the body into modules yet.
