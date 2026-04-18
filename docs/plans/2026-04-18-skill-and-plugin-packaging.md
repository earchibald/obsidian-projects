---
project: obsidian-projects
type: doc
doc_type: plan
issue: "[[OP-9 create-obsidian-projects-git-repo]]"
created: 2026-04-18
status: draft
tags:
  - project/obsidian-projects
  - doc
---

# Plan — package obsidian-projects as a Claude skill + marketplace plugin

## Goal

Move the canonical bits currently held in this repo (Projects schema, issue template, slash commands) into distributable packaging so other people can install the workflow rather than cloning + symlinking by hand.

## Two tracks

### Track A — Claude skill

Wraps the schema + conventions as a single skill that auto-loads when a user asks the agent to do project-management work in an Obsidian vault that follows this layout.

**Skill contents:**
- `SKILL.md` — a condensed version of `schema/projects-schema.md` written for an agent audience (what folders exist, what frontmatter to emit, the lifecycle rules)
- `references/full-schema.md` — the full human-readable schema (current `projects-schema.md`)
- `references/issue-template.md` — the Templater template, for agents to consult when creating issues without the Templater plugin
- `scripts/` (optional) — shell helpers for common operations (new-issue, resolve-issue, move-to-resolved)

**Triggers:** filepath contains `Projects/<slug>/` + frontmatter has `type: issue|task|doc`.

**Open questions:**
- Does the skill own behavior that duplicates the slash commands, or do we keep them separate (skill = knowledge, commands = entry points)?
- How do we version the schema so a skill installed yesterday stays coherent with a vault updated today?

### Track B — Claude Code plugin + marketplace config

Slash commands (`/project`, `/issue`, `/create-issue`) are Claude Code artifacts, not general Claude skills — they belong in a plugin that installs them into `~/.claude/commands/`.

**Plugin layout:**
```
obsidian-projects-plugin/
  plugin.json
  commands/
    project.md
    issue.md
    create-issue.md
  skills/
    obsidian-projects/  (the Track A skill, bundled)
```

**Marketplace config:** Add an entry to the user's marketplace JSON (or publish to an upstream registry if/when one exists).

**Open questions:**
- Is the plugin self-sufficient, or does it assume an already-scaffolded vault? (Probably: provide `/project` as the scaffolding entry point, so install → run `/project new-slug JB` → working vault.)
- How does the plugin handle the Templater template — Templater is an Obsidian plugin, not a Claude plugin. Likely: the plugin drops the template file into `<vault>/Templates/` during `/project` scaffolding and documents the Templater install as a manual step.

## Phasing

1. Ship this repo as canonical source (done — OP-9).
2. Iterate on schema + commands in-tree for a few weeks until churn slows.
3. Build the skill (Track A) — low-risk, purely additive.
4. Build the plugin (Track B) once the skill is stable.
5. Publish.

## Non-goals

- Supporting non-Obsidian notes apps (Logseq, Notion) — out of scope.
- Replacing the existing vault-in-place workflow for current users — migration is additive, symlinks keep working.
