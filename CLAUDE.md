# obsidian-projects — project rules

## After any change to `plugins/op-obsidian/`

Always, in order:

1. **Semver bump.** Run `node scripts/bump-version.mjs <patch|minor|major>` so `plugins/op-obsidian/manifest.json`, `plugins/op-obsidian/package.json`, and `plugins/op/.claude-plugin/plugin.json` move in lockstep. Pick the bump level by judgment (patch = fix, minor = additive, major = breaking).
2. **Install into Obsidian.** Build (`npm run build` inside `plugins/op-obsidian/`) and sync `main.js` + `manifest.json` into the active vault's `.obsidian/plugins/op-obsidian/` (the vault path comes from `obsidian vault`).
3. **Reload the plugin.** Disable + re-enable `op-obsidian` in Obsidian, or reload the app, so the new build is live.
4. **Smoke test.** Follow the `obsidian-plugin-creator:obsidian-plugin-creator` skill's smoke-test procedure against the newly loaded plugin before declaring work complete.

Never skip these steps, even for "trivial" changes — untested plugin builds ship silently broken.
