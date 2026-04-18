# obsidian-projects

Canonical source for project-management artifacts used by the Agent-Vault Obsidian workflow.

## Layout

- `schema/projects-schema.md` — the Projects schema (authoritative reference for agent sessions)
- `templates/issue.md` — Templater template for new issues
- `commands/` — Claude Code slash commands (`/project`, `/issue`, `/create-issue`)
- `docs/` — plans, specs, ADRs for this repo itself

## Consumers

Copies live as symlinks at:
- `Agent-Vault/Projects/Projects schema.md`
- `Agent-Vault/Templates/issue.md`
- `~/.claude/commands/{project,issue,create-issue}.md`

Repo is canonical; edit files here and the symlinks reflect changes.

## Roadmap

See `docs/plans/` — long-term goal is to package this as a Claude skill and a Claude marketplace plugin.
