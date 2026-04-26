---
type: workflow
schema: 1
project: demo-project
default_agent: claude
default_model: opus
steps:
  - step: kickoff
    modules: [orient]
---

# Project workflow

A modern workflow whose body contains an inline `---` HR (and a second one).
The fence-detection logic must run against the FIRST `\n---` only — these
inline horizontal rules must NOT be mistaken for a frontmatter close.

---

## Section heading after HR

Body content continues here. The classifier should still report `modern` and
the parser should still find the `steps:` field.

---

## Another section after another HR

More body content.
