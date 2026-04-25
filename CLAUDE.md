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

## Merging a PR from a delegated worktree

When you ran `EnterWorktree` (or otherwise work in `.claude/worktrees/<name>/`) and another checkout — typically the delegating agent — still holds `main`, `gh pr merge <#> --squash --delete-branch` will **fail locally** with:

```
failed to run git: fatal: 'main' is already used by worktree at '/Users/.../obsidian-projects'
```

This is not a bug in `gh` or in op. It's an interaction with git's invariant that a branch can only be checked out in one worktree. After the squash lands on origin, `gh` tries to fast-forward your local `main` and aborts because `main` is held elsewhere; `--delete-branch` is gated on that step, so the remote branch is also left alive. Net result: **PR is merged on GitHub, but the local fast-forward is skipped and the remote/local branches are still alive.** Every worktree-per-issue flow with a delegating agent on main will hit this.

**Recognize and recover.** Don't re-merge or panic — verify, then clean up:

1. **Verify the merge actually landed.**
   ```bash
   gh pr view <#> --json state,mergedAt,mergeCommit
   ```
   Expect `"state": "MERGED"` with a non-null `mergedAt` and `mergeCommit.oid`. If state is still `OPEN`, the merge genuinely failed — investigate before retrying.

2. **Delete the remote branch manually.**
   ```bash
   git push origin --delete <branch-name>
   ```

3. **Tear down the local worktree.** Use `ExitWorktree action=remove discard_changes=true`. Safe even though the worktree's tip differs from `main` after the squash — origin's squash commit is content-equivalent to the worktree's pre-squash work.

**Avoiding the failure entirely.** `gh pr merge --auto` and `--merge-queue` defer the actual merge to GitHub server-side and skip local cleanup at invocation time, so they likely sidestep this failure — not verified in this repo, but worth trying first if you have permission to enable auto-merge on the PR. The delegating agent (the one holding `main`) can always run `gh pr merge --delete-branch` cleanly because its checkout *is* `main`.
