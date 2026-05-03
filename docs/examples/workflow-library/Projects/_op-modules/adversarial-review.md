---
id: adversarial-review
title: Adversarial AI review before merge
type: workflow-module
scope: review
order: 20
vars:
  - { name: copilot_cmd, default: "copilot --autopilot --allow-all -p", description: "How to invoke the local copilot CLI for non-interactive review. Override to add flags like --add-dir, --model, --effort, etc." }
  - { name: bypass_criteria, default: "all", description: "How many bypass criteria must apply to skip review — 'all' (every criterion) or 'any' (any single one). 'all' is conservative; 'any' is unsafe." }
---

Every PR gets an adversarial review from the local `copilot` CLI **before** merge, unless the diff meets `{{vars.bypass_criteria}}` of the bypass criteria below. When in doubt, request the review — local copilot runs in minutes against your worktree, and a slipped regression costs much more.

The local CLI replaces the prior cloud `@copilot` PR-mention pattern (which polled `gh api …/timeline` for `copilot_work_started` / `copilot_work_finished` events). Local is faster, gives you direct control over the prompt and tool surface, and produces the *same artefacts on the PR* — a structured review comment plus any fix commits pushed to the PR branch — so the merge trail looks identical from a reviewer's or auditor's standpoint.

### Bypass criteria (`{{vars.bypass_criteria}}` must apply, or no bypass)

1. **No runtime behavior change.** Pure formatting, comment-only, docstring tweak, log-string clarification, removal of provably unreachable dead code.
2. **No control flow changes.** No added/removed branches, loops, or exception handling; no edits to existing ones.
3. **No new dependencies.** No new `import`, `require`, `npm` package, `obsidian` API call, shell binary, or environment variable read.
4. **No public surface change.** No CLI param, URI handler, slash command, palette command, frontmatter field, schema doc, settings tab field, or exported function signature.
5. **No security or permission impact.** Doesn't touch auth, hooks, command execution, file-write paths, vault trash/move, GitHub integration, or anything the user has to trust.
6. **Reversible in one commit.** `git revert <sha>` alone fully restores prior state; no entanglement with other work.
7. **Single concern.** One logical area; not bundled as a drive-by alongside a real change.

If even one criterion fails (under `bypass_criteria=all`) → request adversarial review.

### Bypass examples (review NOT required)

- Typo fix in a comment, doc paragraph, or Notice/log string.
- Reflow a long line, reorder imports, fix a 404'd README link.
- Add a missing `.gitignore` entry for a build artifact.

### Need review (non-exhaustive)

- Any non-pure-comment change in `plugins/op-obsidian/src/*.ts`.
- Schema additions: new frontmatter field, new relation, new status enum value.
- New CLI verb, URI handler, palette command, slash command, settings field.
- Any version bump (touches `manifest.json` / `package.json` / `plugin.json`).
- Hooks, agent overlays/profiles, terminal launch, GitHub integration, vault mutations.
- Skill or schema doc edits that change *agent behavior* (vs. pure-prose clarification).
- Test-only diffs that also touch implementation files in the same commit.
- Any change that took more than ~30 minutes of thought to write.

### How to request

You're the worker on this PR's branch worktree. You invoke `copilot` yourself; it runs synchronously and exits. Verify the binary first if unsure — `which copilot` should resolve (it ships from the GitHub Copilot CLI).

1. **Compose pressure-test prompts** — concrete, specific to this PR's diff. Cover edge cases, conflict cases, backward-compat, concurrency, schema drift, cleanup symmetry, param validation. Generic "please review" yields a generic answer.

2. **Snapshot the PR diff and invoke copilot non-interactively.** Tell copilot to mirror the cloud agent's output: post a structured comment to the PR *and* push fix commits to the PR branch for low-risk mechanical findings. Use `--autopilot --allow-all` so copilot can call `gh`, `git`, and read source files itself:

   ```bash
   PR=<#>
   gh pr diff "$PR" > /tmp/pr-$PR.diff
   {{vars.copilot_cmd}} "Adversarial review of PR #$PR. Diff is at /tmp/pr-$PR.diff; read source files directly with your tools.

   Pressure-test prompts:
   - <prompt 1>
   - <prompt 2>
   - <...>

   Produce two artefacts, exactly as the cloud @copilot agent would:

   1. **Pushed fix commits.** For each finding that is low-risk, mechanical, and you are confident about, apply the change in this worktree (we are on the PR branch), commit with subject 'OP-NNN: copilot review fix — <short subject>', and 'git push' to the PR branch. Skip pushes for anything requiring judgment, anything touching auth/hooks/vault/security paths, or anything that would change public API surface — flag those for the worker instead.

   2. **PR comment.** After all pushes, post one summary comment via 'gh pr comment $PR --body' using the heading '## Adversarial review (local copilot)'. List every finding numbered. For each, cite file:line, describe the issue, and tag it either '[fixed in <sha7>]' (if you pushed a commit) or '[for worker]' (if the worker must address it). Include any waived items with rationale.

   Save your stdout transcript so the worker can re-read it." 2>&1 | tee /tmp/pr-$PR-review.md
   ```

3. **Worker reviews both streams** — the comment text *and* the pushed commits. Treat each as *evidence*, not gospel:

   - Pull the new commits into your worktree: `git pull --ff-only`. Inspect each via `git log @{u}..HEAD` (before pull) or `git log -p <previous-tip>..HEAD` (after).
   - For every pushed commit: read it (`git show <sha>`), rebuild + run the smoke suite, decide accept / revert / amend. A copilot fix that breaks tests gets reverted with a one-line note in the PR comment.
   - For every `[for worker]` finding: address it in your worktree, commit with `OP-NNN: <subject>` per the commit-mapping module, and append the sha via `op-append-commit`. Or — if the finding is invalid or out of scope — reply on the PR comment with the rationale.

4. **Don't merge until every finding is resolved or explicitly waived in the PR comment thread.** The comment plus the commits together are the durable record of what the adversarial pass surfaced and how it was handled.
