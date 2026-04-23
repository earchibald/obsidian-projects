# obsidian-projects

A Jira-lite project tracker that lives inside your Obsidian vault, driven by Claude.

This repository provides two paired components that work together to maintain a schema-conformant vault:

1.  **`op` skill (Claude side)** — The "workflow brain". It understands the Projects schema, reconciles your repo state with your tasks, and orchestrates the high-level workflow (scaffolding, creating issues, resolving them) with human-in-the-loop judgment.
2.  **`op-obsidian` plugin (Obsidian side)** — The "deterministic backend". It provides the UI (sidebar), enforces schema rules during file operations, handles next-ID computation, and manages atomic transitions (like resolving an issue) that are too risky or slow for a LLM to do with raw CLI calls.

Both components read and write the same schema. You can drive the vault entirely from the Obsidian command palette, entirely from Claude, or switch between them as needed.

## What's inside

- **`op` skill** (`plugins/op/`) — The authoritative workflow reference for Claude.
  - **Skill** (`skills/op/SKILL.md`) — Consolidates schema, frontmatter conventions, and verb dispatch.
  - **Slash commands** (`commands/`) — Entry points for `/op:scaffold`, `/op:new`, `/op:issue`, and `/op:resolve`.
- **`op-obsidian` plugin** (`plugins/op-obsidian/`) — The Obsidian community plugin.
  - **Sidebar view** — Open, in-flight, and resolved issue tabs.
  - **Command palette** — Native Obsidian commands for every workflow step.
  - **Agent orchestration** — Launching Claude/Gemini/etc. in tmux windows directly from an issue note.
- **Marketplace** — `.claude-plugin/marketplace.json` at repo root.

## Getting Started

### For End-Users

Follow these steps to set up the workflow in your vault.

#### 1. Install the Obsidian Plugin (`op-obsidian`)
This plugin provides the vault-side backend and native commands.

1.  Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the Obsidian community store.
2.  Open **Settings → BRAT → Add Beta Plugin with frozen version**.
3.  Enter `https://github.com/earchibald/obsidian-projects` and pick the latest `op-obsidian-v*` tag.
4.  Enable the plugin in **Settings → Community plugins**.

#### 2. Install the Claude Skill (`op`)
This provides the AI-side logic and slash commands.

1.  In your terminal, search for the plugin:
    ```
    /plugin marketplace search obsidian-projects
    ```
2.  Add the marketplace and install:
    ```
    /plugin marketplace add earchibald/obsidian-projects
    /plugin install op@obsidian-projects
    ```

#### 3. Setup Vault Symlinks
Obsidian needs to index the schema and template files. These are installed in the Claude plugin cache.

1.  **Find the installed version path:**
    List the contents of the cache directory to find the latest version number:
    ```bash
    ls ~/.claude/plugins/cache/obsidian-projects/op/
    ```
    Pick the highest version folder (e.g., `0.3.0`).

2.  **Create symlinks:**
    Replace `<version>` with the folder name you found above.
    ```bash
    # Schema — the file Obsidian surfaces in Projects/
    ln -s ~/.claude/plugins/cache/obsidian-projects/op/<version>/plugins/op/skills/op/reference/schema.md \
          <vault>/Projects/"Projects schema.md"

    # Templater template — only if you use the Templater plugin
    ln -s ~/.claude/plugins/cache/obsidian-projects/op/<version>/plugins/op/reference/issue-template.md \
          <vault>/Templates/issue.md
    ```

---

### For Contributors (Development)

Follow these steps if you want to modify the skill or the plugin.

#### 1. Clone and Build the Plugin
1.  Clone the repository:
    ```bash
    git clone https://github.com/earchibald/obsidian-projects.git
    cd obsidian-projects
    ```
2.  Build the Obsidian plugin:
    ```bash
    cd plugins/op-obsidian
    npm install
    npm run build
    ```
3.  Copy `main.js`, `manifest.json`, and `styles.css` into your vault:
    ```bash
    mkdir -p <vault>/.obsidian/plugins/op-obsidian
    cp main.js manifest.json styles.css <vault>/.obsidian/plugins/op-obsidian/
    ```

#### 2. Run the Skill Locally
Launch Claude using the local plugin directory instead of the marketplace install:
```bash
cd obsidian-projects
claude --plugin-dir ./plugins/op
```

#### 3. Symlink Hygiene
When switching from the marketplace version to your local clone, you **must** update your vault symlinks to point to your local files. This ensures your changes to `schema.md` or templates are visible to Obsidian.

```bash
# Point to your local repository clone
ln -sf /path/to/obsidian-projects/plugins/op/skills/op/reference/schema.md \
       <vault>/Projects/"Projects schema.md"
```

Revert these symlinks to the `~/.claude/plugins/cache/` path (see End-User Step 3) if you switch back to the published version.

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
plugins/op/               ← The "op" skill (Claude)
  .claude-plugin/
    plugin.json
  skills/op/
    SKILL.md              ← workflow logic
    reference/
      schema.md           ← vault schema (symlink target)
  reference/
    issue-template.md     ← Templater template (symlink target)
  commands/               ← slash commands
plugins/op-obsidian/      ← The Obsidian plugin
  src/                    ← TypeScript source
  manifest.json           ← Obsidian manifest
docs/                     ← design specs and plans for this repo
```

## Why the split?

Moving from loose command files to a **skill + plugin** architecture provides several wins:

1.  **Versioned Installs:** `/plugin update` manages the skill logic without manual `git pull` or symlink hacking.
2.  **Namespace Isolation:** `/op:*` commands won't collide with other project commands.
3.  **Deterministic Operations:** The `op-obsidian` plugin handles complex file moves, ID numbering, and schema enforcement using typed code, while the `op` skill focuses on high-level reasoning.
4.  **Authoritative Context:** A single `SKILL.md` file serves as the source of truth for Claude, replacing fragmented command preambles.

See `docs/plans/2026-04-18-skill-and-plugin-packaging.md` and `docs/specs/OP-19-plugin-split-recommendation.md` for more rationale.

## License

MIT
