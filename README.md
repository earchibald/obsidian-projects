# obsidian-projects

A Claude Code plugin + marketplace for running a Jira-lite project tracker inside an Obsidian vault.

## What's inside

- **`op` plugin** — `plugins/op/`
  - **Skill** (`skills/op/SKILL.md`) — the authoritative workflow reference. Consolidates schema, frontmatter conventions, CLI gotchas, and verb dispatch into one file that Claude auto-loads when you're working in a vault that follows the schema.
  - **Slash commands** (`commands/`) — thin entry points that delegate to the skill:
    - `/op:scaffold <slug> <PREFIX> [title]` — new project
    - `/op:new <project-or-prefix> [description]` — new issue
    - `/op:issue <project-or-prefix> [N]` — start/resume work
    - `/op:resolve` — close the in-progress issue
  - **Reference files** — full schema (`skills/op/reference/schema.md`) and Templater template (`reference/issue-template.md`).

- **Marketplace** — `.claude-plugin/marketplace.json` at repo root. Add this marketplace and install the plugin from it.

## Install

```
/plugin marketplace add earchibald/obsidian-projects
/plugin install op@obsidian-projects
```

Once installed, `/op:*` commands are available and the `op` skill auto-loads when you reference an Obsidian project by ID prefix (e.g. `JB-3`) or edit files under `Projects/<slug>/`.

### Vault integration (Obsidian side)

The plugin only ships the Claude side. Two files need symlinks into your Obsidian vault so Obsidian itself indexes them:

```bash
# Schema — the file Obsidian surfaces in Projects/
ln -s ~/.claude/plugins/cache/obsidian-projects/op/<version>/plugins/op/skills/op/reference/schema.md \
      <vault>/Projects/"Projects schema.md"

# Templater template — only if you use the Templater Obsidian plugin
ln -s ~/.claude/plugins/cache/obsidian-projects/op/<version>/plugins/op/reference/issue-template.md \
      <vault>/Templates/issue.md
```

The `<version>` segment comes from `plugin.json`. Re-point the symlinks after plugin updates, or point them at a local clone if you want to follow main.

Every project folder also needs a `.base` file and `STATUS.md` — `/op:scaffold` creates both.

## Develop

Clone and test locally against your vault:

```bash
git clone https://github.com/earchibald/obsidian-projects.git
cd obsidian-projects
claude --plugin-dir ./plugins/op
```

Inside the session:

```
/reload-plugins            # after editing SKILL.md or commands
/op:scaffold test-plug TP  # smoke-test scaffold
```

Validate the marketplace + plugin before committing:

```bash
claude plugin validate .
```

## Migration from the loose `.claude/commands/` setup

If you previously used this repo's old layout (`commands/`, `schema/`, `templates/` at root, with `~/.claude/commands/*.md` symlinked to `commands/*.md`):

1. Remove the old command symlinks:
   ```bash
   rm ~/.claude/commands/{project,issue,create-issue}.md
   ```
2. Install via the marketplace (above), or run with `--plugin-dir ./plugins/op` if you want to follow your local clone.
3. Update your vault schema symlink to the new canonical path:
   ```bash
   rm <vault>/Projects/"Projects schema.md"
   ln -s <repo>/plugins/op/skills/op/reference/schema.md \
         <vault>/Projects/"Projects schema.md"
   ```
4. Update your vault template symlink:
   ```bash
   rm <vault>/Templates/issue.md
   ln -s <repo>/plugins/op/reference/issue-template.md \
         <vault>/Templates/issue.md
   ```
5. Command renames: `/project` → `/op:scaffold`, `/create-issue` → `/op:new`, `/issue` → `/op:issue`, plus the new `/op:resolve`.

## Repo layout

```
.claude-plugin/
  marketplace.json        ← marketplace catalog
plugins/op/
  .claude-plugin/
    plugin.json           ← plugin manifest
  skills/op/
    SKILL.md              ← authoritative workflow skill
    reference/
      schema.md           ← full schema (symlink target for vaults)
  reference/
    issue-template.md     ← Templater template (symlink target for vaults)
  commands/
    scaffold.md           ← /op:scaffold
    new.md                ← /op:new
    issue.md              ← /op:issue
    resolve.md            ← /op:resolve
docs/                     ← specs, plans, ADRs for this repo itself
```

## Why a plugin?

The old setup asked every user to clone + symlink three command files into `~/.claude/commands/` by hand. A plugin gives you versioned installs, `/plugin update`, namespace isolation (`/op:*` won't collide), and a single `SKILL.md` authoritative context instead of three separate command files with duplicated preamble. See `docs/plans/2026-04-18-skill-and-plugin-packaging.md` for the migration rationale.

## License

MIT
