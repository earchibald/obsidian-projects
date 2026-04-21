# Obsidian Projects (op) — Obsidian plugin

The deterministic half of the [op workflow](../op/): vault discovery, prefix→slug scans, next-N computation, filename sanitization, issue lifecycle transitions, TASKS trashing, and the `property:set` list-rewrite dance — reimplemented as typed TypeScript commands inside the vault.

**Status:** scaffold only. Commands land in OP-21 onwards (see `docs/specs/OP-19-plugin-split-recommendation.md`).

## Install via BRAT

Until this plugin ships to the community store, install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install the BRAT plugin from the Obsidian community store.
2. `BRAT → Add Beta Plugin` → paste `earchibald/obsidian-projects`.
3. BRAT will watch the repo's releases and pull `main.js` + `manifest.json` automatically.

## Develop

```bash
cd plugins/op-obsidian
npm install
npm run dev    # esbuild watch → main.js
npm run build  # production build
```

Symlink the plugin into a test vault:

```bash
ln -s "$(pwd)" /path/to/vault/.obsidian/plugins/op-obsidian
```

Reload Obsidian (`Cmd-R` in developer mode) to pick up changes.

## Versioning

All three version surfaces — `plugins/op-obsidian/manifest.json`, `plugins/op-obsidian/package.json`, and `plugins/op/.claude-plugin/plugin.json` — bump in lockstep:

```bash
node scripts/bump-version.mjs patch   # or minor / major / <explicit-version>
```

See `scripts/bump-version.mjs`.
