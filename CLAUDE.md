# obsidian-projects — project rules

## Always work in a git worktree

Create an isolated worktree (`EnterWorktree`, or the `superpowers:using-git-worktrees` skill) before making any changes for an issue. No exceptions — including one-line tweaks, schema comments, and typo fixes. Editing the main checkout risks branch, build, and vault-sync conflicts with parallel work, PR review, and any other agent that still holds the main checkout open.

## Eval is read-only

`obsidian eval` is for introspection — probing plugin state, listing properties, dumping settings. Never use it to write to a vault note: `app.vault.modify(...)`, `app.vault.create(...)`, `vault.adapter.write(...)`, `processFrontMatter(...)`, etc. from inside `obsidian eval code='…'` bypass `op-*` dispatch, the audit-log trail, and the Phase 2/3 pretool guards in one shot. If no `op-*` endpoint covers your write, file an issue and add the endpoint — don't ship the eval one-off. See [`reference/cli-gotchas.md`](plugins/op/skills/op/reference/cli-gotchas.md) → "Eval mutation is the surviving bypass hole" for the worked `bypass: true` audit-log example.

## After any change to `plugins/op-obsidian/`

Always, in order:

1. **Semver bump + build.** Run `node scripts/bump-version.mjs <patch|minor|major>` so `plugins/op-obsidian/manifest.json`, `plugins/op-obsidian/package.json`, and `plugins/op/.claude-plugin/plugin.json` move in lockstep. Pick the bump level by judgment (patch = fix, minor = additive, major = breaking). The script then runs `npm run build` in `plugins/op-obsidian/` and asserts `main.js` is fresher than `manifest.json` — a green run guarantees the artifact matches the source you just bumped (OP-105 guardrail). If `node_modules/` is missing, the script aborts with an actionable error; install deps (`npm ci` when `package-lock.json` exists, else `npm install`) in `plugins/op-obsidian/` and re-run.

   **Fresh-worktree fixup mode.** In a freshly created worktree (`EnterWorktree` / `git worktree add`), `plugins/op-obsidian/node_modules/` does not exist. The script writes the new version into all three JSON files **before** the `npm run build` step fails with `Cannot find package 'esbuild'` — so the bump is already on disk when you see the error. Recovery:

   1. `cd plugins/op-obsidian && npm ci` (or `npm install` if no lockfile — but op-obsidian has one).
   2. Re-run with the **literal version** that's now in the JSON files, e.g. `node scripts/bump-version.mjs 0.37.3` — **not** `patch`/`minor`/`major`, which would compound the bump. The script idempotently re-runs the build step against the version already on disk.

2. **Sync into the OP-Test vault.**
   ```bash
   node scripts/dev-sync.mjs
   ```
   The script targets `<OP-Test-vault>/.obsidian/plugins/op-obsidian/`, where the vault path is resolved by `scripts/lib/op-test.mjs` (see the override precedence in "OP-Test vault: the sole dev sync target" below — canonical location is `~/Vault/OP-Test`). It asserts OP-Test is **open** in Obsidian (any window — focus is not required since OP-175 routes every internal CLI call via `vault=OP-Test`) and rejects any path containing `Agent-Vault` (belt-and-suspenders against muscle-memory mistakes — Agent-Vault is BRAT-only, see below). Never `rm -rf` the dest — `data.json` (user settings) lives there; `dev-sync.mjs` only overwrites `main.js` and `manifest.json`.

3. **Reload the plugin.** `dev-sync.mjs` handles this: it tries `obsidian plugin:reload id=op-obsidian` first and falls back to the `loadManifests + enablePluginAndSave` recipe on first-install (when Obsidian hasn't scanned the new folder yet). No separate manual step needed.

4. **Smoke test** per the `obsidian-plugin-creator:obsidian-plugin-creator` skill §9. Pass `vault=OP-Test` on every CLI call so the command routes at OP-Test regardless of which window is focused (see [`reference/cli-gotchas.md`](plugins/op/skills/op/reference/cli-gotchas.md) "Per-call vault targeting"):
   ```bash
   obsidian vault=OP-Test dev:debug on
   obsidian vault=OP-Test dev:console clear
   # exercise the commands you just changed via obsidian vault=OP-Test eval / executeCommandById
   obsidian vault=OP-Test dev:console   # expect no errors
   ```
   Also spot-check the plugin instance: `obsidian vault=OP-Test eval code='app.plugins.plugins["op-obsidian"]'` should return a live object with your commands registered.

   **Workflow-modules smoke probe.** When the change touches the workflow composer, modules, settings, or any code path that feeds a launched agent's prompt, also run `op-explain-workflow` against an OP-Test issue to verify the composed prompt is intact:

   ```bash
   obsidian vault=OP-Test op-explain-workflow issue=TST-5 mode=kickoff
   obsidian vault=OP-Test op-list-vars project=testing issue=TST-5
   ```

   Both are read-only and emit a JSON payload to `Projects/_scratch/op-last-response.md`. Expect no `error`-severity diagnostics for the seeded `seed/workflow-modules` checkpoint; any new error there is a regression. Pair with `node scripts/smoke-workflow-modules.mjs` (which runs the same probes plus assertions about the precedence chain) when the change is non-trivial.

5. **Smoke-test Settings UIs.** When the change touches the op-obsidian Settings tab — Project order, working dirs, agent overlays, flow chaining, GitHub integration — `executeCommandById` won't reach it. Use `app.setting.openTabById` to render the tab synchronously and assert against the live DOM. Pass `vault=OP-Test` on every call:

   ```bash
   # Daily-group rows (Default agent / Terminal / Sidebar tab / Onboarding / Hotkey preset) — visible from open:
   obsidian vault=OP-Test eval code='(()=>{ app.setting.open(); app.setting.openTabById("op-obsidian"); return document.querySelectorAll(".op-settings__group--daily .setting-item").length; })()'

   # Advanced subsections (each is its own collapsible) — count the wrappers:
   obsidian vault=OP-Test eval code='(()=>{ app.setting.open(); app.setting.openTabById("op-obsidian"); return document.querySelectorAll(".op-settings__group--advanced .op-collapsible").length; })()'

   # Project-order drag rows: post-OP-164 they live INSIDE the "Working directories & project order" collapsible, which starts collapsed. Expand it first by clicking the header, then count:
   obsidian vault=OP-Test eval code='(()=>{ app.setting.open(); app.setting.openTabById("op-obsidian"); document.querySelector("[data-op-section=\"workingDirs\"] .op-collapsible__header").click(); return document.querySelectorAll(".op-project-order__item").length; })()'
   ```

   Returns synchronously — no `await` needed. Use it to verify drag-row count, `draggable=true` flags, prefix badges, reset-button presence, etc. without touching the GUI. Worked example: after a change to the "Project order" section, the count above should equal the number of discovered projects (one `.op-project-order__item` per project). Swap the selector for the section you actually changed.

   **OP-164 layout note.** Sections are tagged with `data-op-section="<id>"` on the collapsible wrapper. IDs are: `injection`, `workingDirs`, `orchestrator`, `profileOverlays`, `worktreeEnforcement`, `flowChaining`, `github`, `developer`. Each starts collapsed; click its `.op-collapsible__header` to expand before asserting against rows inside. The fuzzy search box at the top auto-expands matching collapsibles when its `value` is set and an `input` event is dispatched.

   Cross-reference: OPD-8 captures the generic obsidian-plugin-creator skill update for this recipe (also covers the async-modal-probe hang). The snippet here is the OP-side mirror so agents working op tasks aren't blocked on the OPD skill being updated first.

Never skip these steps, even for "trivial" changes — untested plugin builds ship silently broken.

## OP-Test vault: the sole dev sync target

The **OP-Test** vault — canonically at `~/Vault/OP-Test/` (matches the `~/Vault/` domain in the global AGENTS.md) — is a clean-room test vault, separate from your day-to-day Agent-Vault, used to verify the plugin's behavior in a vault that has no project state, no settings carry-over, and no other plugins. **OP-Test is the only vault that receives dev syncs from this repo.** `node scripts/dev-sync.mjs` enforces this: it asserts the OP-Test vault is open in Obsidian before mutating, routes every internal CLI call via `vault=OP-Test` (OP-175 — focus is not required), and refuses any target path containing `Agent-Vault`.

**Vault-path resolution (OP-278).** `scripts/lib/op-test.mjs` resolves the OP-Test vault path once at module load, with this precedence:

1. **`OP_TEST_VAULT` env var** — explicit override, highest precedence. Use it when the vault lives somewhere non-standard: `OP_TEST_VAULT=/abs/path node scripts/dev-sync.mjs`.
2. **Obsidian-reported `app.vault.adapter.basePath`** — auto-derived from the running app (probed via `obsidian vault=OP-Test eval`). Since these scripts already require OP-Test to be open, this tracks vault moves (e.g. the `~/Documents/OP-Test` → `~/Vault/OP-Test` relocation) with zero config.
3. **Legacy `~/Documents/OP-Test/OP-Test`** — final fallback, used only when Obsidian is unreachable so the open-vault assertion still surfaces a clear error rather than crashing at import.

Everything downstream (`OP_TEST_PLUGIN_DEST`, the smoke/seed scratch paths) derives from the resolved value, so no script hardcodes a vault location.

**Do not install op-obsidian into OP-Test via BRAT.** We're the plugin's authors and the dev build is on disk; BRAT adds GitHub-release latency and doesn't carry uncommitted work. Use `dev-sync.mjs` instead — it handles the file copy, the first-install enable recipe, and subsequent reloads.

**Target OP-Test on every CLI call: `obsidian vault=OP-Test …`.** The `obsidian` CLI accepts a top-level `vault=<name>` argument that routes the command at the named vault regardless of which window is currently focused (`obsidian help` documents it). Use it on every call in this repo's smoke tests, settings probes, and any ad-hoc CLI dispatch — it removes the focused-window race entirely and means you don't need to hand-verify focus before each command. The form is `vault=<name>` (key=value), not `--vault <name>`; see [`reference/cli-gotchas.md`](plugins/op/skills/op/reference/cli-gotchas.md) "Per-call vault targeting" for the full pattern.

The `dev-sync.mjs` / `reset-test-vault.mjs` / `build-seeds.mjs` scripts assert the OP-Test vault is open in Obsidian as defense in depth — they probe via `obsidian vault=OP-Test eval code='app.vault.getName()'` and abort with "Open the OP-Test vault in Obsidian (any window — focus is no longer required) and re-run" on miss. Since OP-175 every internal CLI call inside these scripts is routed via `vault=OP-Test`, so OP-Test does not need to be the focused window — opening the vault in any Obsidian window is enough.

## Resetting between scenarios

The OP-Test vault is a git repo with named seed tags capturing known states. Before any plugin-modifying smoke test, reset to the lowest seed that exercises what you're testing — that way a smoke test starts from a clean, predictable baseline and can't be polluted by leftover state from a previous test.

```bash
node scripts/reset-test-vault.mjs <seed>
# valid seeds: empty | scaffolded | mid-flow | github-linked | multi-project | workflow-modules | managed-discipline
```

The script asserts the OP-Test vault is open in Obsidian (focus not required since OP-175), runs `git reset --hard seed/<name> && git clean -fd` inside OP-Test, then reloads op-obsidian so Obsidian re-reads the vault state. The seed ladder itself is built (and rebuilt) by `node scripts/build-seeds.mjs` — re-runnable so seeds stay in sync as the plugin's scaffolding behavior evolves.

### `seed/workflow-modules` + smoke harness

`seed/workflow-modules` is the launchable checkpoint for the OP-181 workflow-module pipeline (one global module, one per-project module, a per-project workflow file referencing them, project-level `vars:`, plus issue `TST-5`). After resetting to it, run:

```bash
node scripts/smoke-workflow-modules.mjs
```

The harness invokes `op-explain-workflow id=TST-5 mode=kickoff` and `mode=plan`, plus `op-list-vars project=testing issue=TST-5`, then asserts the composed prompt contains the expected module bodies, that variables resolve through the precedence chain (project-default overrides the module's `name=VALUE` default), and that no `error`-severity diagnostics are emitted. Other workers landing changes in the OP-181 child series should run this against `seed/workflow-modules` after their dev-sync as part of the per-PR smoke step.

### `vaultGit.autoCommit` is opt-in and orthogonal to seed reset

OP-261 (Phase 4 of OP-218) added optional vault-git auto-commit (`vaultGit.autoCommit` + `vaultGit.initOnEnable` in Settings → op → Advanced → Vault git). Both default off and live entirely in the user's own vault. They have **no interaction** with `scripts/reset-test-vault.mjs` (which targets the OP-Test scratch repo) and no interaction with per-project `repo_path/` git workflows. If you flip them on in OP-Test for smoke purposes, remember to flip them back so the seed-reset replay stays clean. See `plugins/op/skills/op/reference/schema.md` → "Audit log" → "Vault git (opt-in)" for the full opt-in story.

## Agent-Vault is BRAT-only

The user's daily-driver vault at `~/work/Agent-Vault/` no longer receives dev syncs. It consumes op-obsidian releases like an external user would, via [BRAT](https://github.com/TfTHacker/obsidian42-brat). One-time detach (idempotent — re-runs are no-ops):

```bash
node scripts/agent-vault-detach.mjs
```

The script removes `main.js`/`manifest.json` from `Agent-Vault/.obsidian/plugins/op-obsidian/` while preserving `data.json` (user settings — picked back up by the BRAT install). It refuses to run unless `obsidian42-brat` is already installed in Agent-Vault.

After detach, install via BRAT — Settings → BRAT → "Add Beta plugin" → paste the GitHub repo URL. **First BRAT install requires a published GitHub release** with `main.js` and `manifest.json` attached as assets; cutting that release is a separate workflow concern.

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
