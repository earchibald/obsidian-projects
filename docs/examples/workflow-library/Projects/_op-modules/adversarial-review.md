---
id: adversarial-review
title: Adversarial AI review before merge
type: workflow-module
scope: review
order: 20
vars:
  - reviewer_handle=@copilot
  - { name: bypass_criteria, default: "all", description: "How many bypass criteria must apply to skip review — 'all' (every criterion) or 'any' (any single one). 'all' is conservative; 'any' is unsafe." }
---

Every PR gets an adversarial review from {{vars.reviewer_handle}} (or
equivalent reviewer agent) **before** merge, unless the diff meets the
bypass criteria below.

### Bypass criteria — `{{vars.bypass_criteria}}` must apply, or no bypass

1. **No runtime behavior change.** Pure formatting, comment-only,
   docstring tweak, log-string clarification, removal of provably
   unreachable dead code.
2. **No control flow changes.** No added or removed branches, loops,
   exception handlers; no edits to existing ones.
3. **No new dependencies.** No new `import`, `require`, package, API
   call, shell binary, or environment variable read.
4. **No public surface change.** No CLI param, slash command, palette
   command, frontmatter field, settings tab field, or exported function
   signature.
5. **No security or permission impact.** Doesn't touch auth, hooks,
   command execution, file-write paths, or anything the user has to
   trust.
6. **Reversible in one commit.** `git revert <sha>` alone fully restores
   prior state.
7. **Single concern.** One logical area; not bundled as a drive-by
   alongside a real change.

When in doubt, request the review. It costs minutes; a slipped
regression costs much more.

### How to request

1. Comment on the PR mentioning {{vars.reviewer_handle}} with
   **concrete pressure-test prompts** — specific edge cases, conflict
   cases, backward-compat, concurrency, schema drift, cleanup symmetry,
   param validation. Generic "please review" yields a generic answer.
2. Watch the PR timeline for the reviewer's start/finish events and any
   pushed fix commits.
3. If the reviewer pushes a fix commit, fast-forward it into your
   worktree and re-run the test suite. Treat the fix as evidence, not
   gospel — review it before accepting.
4. Don't merge until findings are evaluated and addressed (or waived in
   the PR comments with rationale).
