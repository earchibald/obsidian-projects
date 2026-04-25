# obsidian-projects — project rules

## Always work in a git worktree

Create an isolated worktree (`EnterWorktree`, or the `superpowers:using-git-worktrees` skill) before making any changes for an issue. No exceptions — including one-line tweaks, schema comments, and typo fixes. Editing the main checkout risks branch, build, and vault-sync conflicts with parallel work, PR review, and any other agent that still holds the main checkout open.

## After any change to `plugins/op-obsidian/`

Always, in order:

1. **Semver bump + build.** Run `node scripts/bump-version.mjs <patch|minor|major>` so `plugins/op-obsidian/manifest.json`, `plugins/op-obsidian/package.json`, and `plugins/op/.claude-plugin/plugin.json` move in lockstep. Pick the bump level by judgment (patch = fix, minor = additive, major = breaking). The script then runs `npm run build` in `plugins/op-obsidian/` and asserts `main.js` is fresher than `manifest.json` — a green run guarantees the artifact matches the source you just bumped (OP-105 guardrail). If `node_modules/` is missing, the script aborts with an actionable error; install deps (`npm ci` when `package-lock.json` exists, else `npm install`) in `plugins/op-obsidian/` and re-run.

   **Fresh-worktree fixup mode.** In a freshly created worktree (`EnterWorktree` / `git worktree add`), `plugins/op-obsidian/node_modules/` does not exist. The script writes the new version into all three JSON files **before** the `npm run build` step fails with `Cannot find package 'esbuild'` — so the bump is already on disk when you see the error. Recovery:

   1. `cd plugins/op-obsidian && npm ci` (or `npm install` if no lockfile — but op-obsidian has one).
   2. Re-run with the **literal version** that's now in the JSON files, e.g. `node scripts/bump-version.mjs 0.37.3` — **not** `patch`/`minor`/`major`, which would compound the bump. The script idempotently re-runs the build step against the version already on disk.

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

5. **Smoke-test Settings UIs.** When the change touches the op-obsidian Settings tab — Project order, working dirs, agent overlays, flow chaining, GitHub integration — `executeCommandById` won't reach it. Use `app.setting.openTabById` to render the tab synchronously and assert against the live DOM:

   ```bash
   obsidian eval code='(()=>{ app.setting.open(); app.setting.openTabById("op-obsidian"); return document.querySelectorAll(".op-project-order__item").length; })()'
   ```

   Returns synchronously — no `await` needed. Use it to verify drag-row count, `draggable=true` flags, prefix badges, reset-button presence, etc. without touching the GUI. Worked example: after a change to the "Project order" section, the count above should equal the number of discovered projects (one `.op-project-order__item` per project). Swap the selector for the section you actually changed.

   Cross-reference: OPD-8 captures the generic obsidian-plugin-creator skill update for this recipe (also covers the async-modal-probe hang). The snippet here is the OP-side mirror so agents working op tasks aren't blocked on the OPD skill being updated first.

Never skip these steps, even for "trivial" changes — untested plugin builds ship silently broken.

## OP-Test vault: install builds locally, never via BRAT

The **OP-Test** vault at `~/Documents/OP-Test/OP-Test/` is a clean-room test vault — separate from your day-to-day Agent-Vault — used to verify the plugin's behavior in a vault that has no project state, no settings carry-over, and no other plugins. **Do not install op-obsidian into OP-Test via BRAT.** We're the plugin's authors and the dev build is on disk; BRAT adds GitHub-release latency and doesn't carry uncommitted work. Install the locally-built artifact directly:

```bash
DEST="$HOME/Documents/OP-Test/OP-Test/.obsidian/plugins/op-obsidian"
mkdir -p "$DEST"
cp plugins/op-obsidian/main.js plugins/op-obsidian/manifest.json "$DEST/"
```

First install needs the same `loadManifests + enablePluginAndSave` recipe as the active-vault first install (community plugins must be enabled in OP-Test's settings first):

```bash
obsidian eval code='(async()=>{await app.plugins.loadManifests(); await app.plugins.enablePluginAndSave("op-obsidian"); return {enabled: app.plugins.enabledPlugins.has("op-obsidian"), version: app.plugins.plugins["op-obsidian"]?.manifest?.version}})()'
```

Subsequent installs (the file-copy alone, then `obsidian plugin:reload id=op-obsidian`) work the same way as for Agent-Vault.

**One CLI-target caveat.** The `obsidian` CLI binds to whichever Obsidian window is currently active — switching from Agent-Vault to OP-Test (or vice versa) changes which vault `obsidian vault`, `obsidian eval`, and the `op-*` dispatch verbs target. Re-run `obsidian vault` after any window switch to confirm you're operating on the vault you think you are. There's no per-vault flag; activate the right window first.

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
