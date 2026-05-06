---
name: op
description: Run the Obsidian Projects workflow — scaffold new projects, create/work/resolve issues, and maintain schema-conformant notes in an Obsidian vault that follows the Projects schema. Use whenever the user invokes /op:* commands or references an Obsidian project by ID prefix (e.g. JB-3, TMB-9, OP-11).
---

# Obsidian Projects (op) — zero-order guidance

This is a **stub**. The canonical operating manual lives **inside** the `op-obsidian` plugin and ships with every plugin release; pull it with `obsidian op-get-skill` once per session and follow the body it returns. That keeps the skill stable while the workflow logic evolves with the plugin.

## Zero-order rules — apply before fetching anything

1. **Probe the plugin once per session and cache the result.** Every `op-*` action goes through it; without the plugin you cannot operate. Run `obsidian vault` first to learn the registered vault name, then probe through that vault explicitly:

   ```bash
   obsidian vault                                                  # list registered vaults; cache the one you'll target
   obsidian vault=<name> eval code='({enabled: app.plugins.enabledPlugins.has("op-obsidian"), version: app.plugins.plugins["op-obsidian"]?.manifest?.version, vault: app.vault.getName()})'
   ```

   If `enabled` is `false` or the eval throws, **stop and ask the user to install/enable `op-obsidian`** before going further. Do not improvise with raw `obsidian` CLI primitives — the plugin owns filename sanitization, ID numbering, frontmatter shape, atomic move-and-trash on resolve, and the JSON response payload at `Projects/_scratch/op-last-response.md`.

2. **Always work in a git worktree** when an issue spans more than a one-line edit, especially when the issue was *delegated* to you by another agent. The delegating agent may still hold the main checkout open; editing it directly risks branch, build, and vault-sync conflicts. The project's own `CLAUDE.md` may make this rule absolute — read it.

3. **Cache the active vault name and target it explicitly on every CLI call.** `obsidian vault` returns the active vault's name and path — cache both. Then prepend `vault=<name>` to every `obsidian` invocation (e.g. `obsidian vault=Agent-Vault op-work issue=…`) so the call routes deterministically regardless of which Obsidian window is focused. Without it, the CLI binds to whichever vault happens to be active at the moment of the call, which races against window switches by other agents or the user. The form is `vault=<name>` (key=value), **not** `--vault <name>`.

## Fetching the full manual

Once the plugin is confirmed enabled, fetch the operating manual:

```bash
obsidian vault=<name> op-get-skill   # writes the body to Projects/_scratch/op-last-response.md
```

Read the `content` field from that JSON payload (or pass `name=skill` explicitly — currently the only recognized name; case-insensitive). The body covers: the full `op-*` command surface (`scaffold`, `new`, `work`, `append-commit`, `set-pr`, `set-scope`, `resolve`, plus the workflow-modules verbs: `edit-workflow`, `edit-module`, `explain-workflow`, `list-vars`, `export-module`, `import-module`, `undo-last-import`), each verb's lifecycle rules (Plan/Notes/Summary/Tasks reconciliation, GitHub issue mirroring, `commits:` back-fill, semver bumping, `obsidian://` link rendering), the workflow-modules system that composes per-step injection at agent launch (governed by the `workflowMode` setting), and the cross-project surfaces (`all-projects.base`, DOCS folder layout).

If `op-get-skill` is unrecognized, the installed plugin predates this command. Tell the user to update `op-obsidian` (`>= 0.61.0`) — do **not** fall back to running raw CLI mutations from memory.

## References (kept in this skill folder)

- [`reference/schema.md`](reference/schema.md) — frontmatter shape, status enum, relation names. Read on first use or when frontmatter shape comes up.
- [`reference/cli-gotchas.md`](reference/cli-gotchas.md) — raw-CLI fallbacks for emergencies when the plugin is unavailable (e.g. read-append-rewrite for `commits:`).

## Why this is a stub

Historically the operating manual lived inline in this file, and every workflow tweak required editing the skill, re-syncing the Claude Code plugin cache, and rolling new agent sessions. The manual now lives in `plugins/op-obsidian/src/skill/manual.md` and is bundled into the plugin at build time. A plugin release is the only artifact that needs to ship; this stub stays put.
