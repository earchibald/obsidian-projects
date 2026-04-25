# obsidian-projects — project rules

## Always work in a git worktree

Create an isolated worktree (`EnterWorktree`, or the `superpowers:using-git-worktrees` skill) before making any changes for an issue. No exceptions — including one-line tweaks, schema comments, and typo fixes. Editing the main checkout risks branch, build, and vault-sync conflicts with parallel work, PR review, and any other agent that still holds the main checkout open.

## After any change to `plugins/op-obsidian/`

Always, in order:

1. **Semver bump + build.** Run `node scripts/bump-version.mjs <patch|minor|major>` so `plugins/op-obsidian/manifest.json`, `plugins/op-obsidian/package.json`, and `plugins/op/.claude-plugin/plugin.json` move in lockstep. Pick the bump level by judgment (patch = fix, minor = additive, major = breaking). The script then runs `npm run build` in `plugins/op-obsidian/` and asserts `main.js` is fresher than `manifest.json` — a green run guarantees the artifact matches the source you just bumped (OP-105 guardrail). If `node_modules/` is missing, the script aborts with an actionable error; install deps (`npm ci` when `package-lock.json` exists, else `npm install`) in `plugins/op-obsidian/` and re-run.

2. **Sync into the active vault.**
   ```bash
   VAULT=$(obsidian vault | awk -F'\t' '/^path\t/{print $2}')
   DEST="$VAULT/.obsidian/plugins/op-obsidian"
   mkdir -p "$DEST"
   cp plugins/op-obsidian/main.js plugins/op-obsidian/manifest.json "$DEST/"
   ```
   Never `rm -rf` the dest — `data.json` (user settings) lives there.

3. **Reload the plugin.**
   - **First install (or after the dest folder was just created)**: `obsidian plugin:reload id=op-obsidian` fails with "Plugin not found" because Obsidian hasn't scanned the new folder yet. Run this instead:
     ```bash
     obsidian eval code='(async()=>{await app.plugins.loadManifests(); await app.plugins.enablePluginAndSave("op-obsidian"); return {enabled: app.plugins.enabledPlugins.has("op-obsidian")}})()'
     ```
   - **Subsequent reloads**: `obsidian plugin:reload id=op-obsidian` is enough.

4. **Smoke test** per the `obsidian-plugin-creator:obsidian-plugin-creator` skill §9:
   ```bash
   obsidian dev:debug on
   obsidian dev:console clear
   # exercise the commands you just changed via obsidian eval / executeCommandById
   obsidian dev:console   # expect no errors
   ```
   Also spot-check the plugin instance: `obsidian eval code='app.plugins.plugins["op-obsidian"]'` should return a live object with your commands registered.

Never skip these steps, even for "trivial" changes — untested plugin builds ship silently broken.
