## STEP: kickoff


You are working on **OP-FIX-1** (Integration fixture issue) in project `fixture-project` on branch `worktree-OP-FIX-1`. Always create an isolated worktree before making changes — no exceptions, including one-line tweaks. The main checkout may be held by the agent that delegated to you.



After every change to `plugins/op-obsidian/`, run `node scripts/bump-version.mjs <patch|minor|major>` so the manifest, package, and plugin JSON files move in lockstep. Pick the bump level by judgment: patch = fix, minor = additive, major = breaking. Today is 2026-04-26.


## STEP: plan


Before implementing, read related code (no more than 10 files), then propose a plan covering: approach, files to touch, tests, risks, and what's deliberately out of scope. Send the plan to @earchibald for sign-off before any commit.


## STEP: review


Once tests pass and CI is green, request an adversarial Copilot review with concrete pressure-test prompts. After review is addressed, merge with `gh pr merge --squash --delete-branch`. PR: https://github.com/example/repo/pull/42. Issue: OP-FIX-1 (parent: OP-FIX-PARENT).

