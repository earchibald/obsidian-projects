# Workflow Library — reusable modules for any project

This subtree is a **library of reusable workflow modules** distilled
from the historical `WORKFLOW.md` of this very project, with all
per-project specifics swapped out for `vars:` defaults so a different
project can copy the modules verbatim and have them work.

It is shaped like a real Obsidian vault — copy any module file into
your own vault under the same path and the loader picks it up:

```
docs/examples/workflow-library/   ← vault root
├── README.md                      ← this file (not loaded by the engine)
└── Projects/
    ├── _op-modules/               ← global modules — apply to every project
    │   ├── orient.md
    │   ├── branching.md
    │   ├── tmux-safety.md
    │   ├── commit-mapping.md
    │   ├── pr-required.md
    │   ├── adversarial-review.md
    │   ├── version-cadence.md
    │   └── gh-issue-close.md
    ├── _op-workflow.md            ← global default workflow (5 steps)
    ├── code-project/
    │   └── WORKFLOW.md            ← extends the global default verbatim
    └── docs-project/
        └── WORKFLOW.md            ← standalone 3-step variant (no review/finalize)
```

## What's inside

### Modules (8)

| Module | Scope | Vars (with inline defaults) | Source — what it codifies |
| :--- | :--- | :--- | :--- |
| `orient.md` | `kickoff` | _none_ | Read the issue note; surface ambiguity before coding. |
| `branching.md` | `kickoff` | `default_branch=main`, `branch_strategy=worktree` | Always isolate from the default branch — worktree or feature branch. |
| `tmux-safety.md` | `kickoff` | `protected_session_prefixes=op-agents-,view-`, `experiment_session_pattern=op-experiment-$$` | Don't kill shared tmux sessions; experiment in a disposable one. |
| `commit-mapping.md` | `implement` | `commit_command=op-append-commit`, `commit_field=commits` | Append every commit to the issue note's commits list, per-commit not batched. |
| `pr-required.md` | `review` | `default_branch=main`, `pr_title_pattern="<ID>: <subject>"`, `merge_command=gh pr merge --squash --delete-branch` | PRs gate merges; PR title carries the issue id. |
| `adversarial-review.md` | `review` | `copilot_cmd=copilot --autopilot --allow-all -p`, `bypass_criteria=all` | Invoke the local `copilot` CLI synchronously with concrete pressure-test prompts; expect pushed fix commits plus a `## Adversarial review (local copilot)` summary comment on the PR; bypass only when *all* criteria apply. |
| `version-cadence.md` | `finalize` | `package_name=op-obsidian`, `bump_command=node scripts/bump-version.mjs` | Bump version files in lockstep at resolve time. |
| `gh-issue-close.md` | `finalize` | `auto_close_setting_path=closeGithubIssueOnResolve` | Don't close the linked GH issue manually — let `op-resolve` handle it; read the JSON response. |

Every module declares its `vars:` block in one of the three documented
shapes (bare, shorthand `name=VALUE`, or object form with
`description:`). Together the eight modules exercise all three shapes
at least once, so the file collection doubles as a vars-syntax
reference.

The kickoff-scoped modules (`orient`, `branching`, `tmux-safety`) are
declared with `scope: kickoff` so they fire at agent launch via the
kickoff injection path. The other modules are wired into the matching
step in the workflow files below — see [the scope-tags
reference](../../workflow-modules/reference/scope-tags.md) for the
conventions.

### Workflows (3)

| File | Shape | Use for |
| :--- | :--- | :--- |
| `Projects/_op-workflow.md` | Global default — 5 steps (`evaluate, plan, implement, review, finalize`). | The canonical sequence. Every per-project workflow can `extends:` this file to inherit it wholesale. |
| `Projects/code-project/WORKFLOW.md` | Per-project — `extends:` the global default with no overrides. | Real code projects: inherits the full five-step pipeline verbatim. |
| `Projects/docs-project/WORKFLOW.md` | Per-project — standalone, three steps (`evaluate, plan, implement`). | Domain-flavored variant for docs-only projects with no merge gate / version bump / GH issue close to apply. |

The `code-project` and `docs-project` files together demonstrate the
two ways a per-project workflow can declare its step list:
`extends:`-and-inherit (when the per-project shape matches the global
default), or standalone (when a step needs to be removed, since the
file format has no "remove inherited step" semantics).

## How to copy this into your vault

The library is designed to be cherry-picked, not adopted wholesale.

1. **Pick the modules you want.** Copy individual `.md` files from
   `Projects/_op-modules/` into your vault's `Projects/_op-modules/`
   directory. The filename and the frontmatter `id:` must match — keep
   them in sync if you rename.
2. **Drop the workflow file you want.** Either copy
   `Projects/_op-workflow.md` to your vault's
   `Projects/_op-workflow.md` and `extends:` it from each project's
   `WORKFLOW.md`, or copy one of the per-project examples to
   `Projects/<your-slug>/WORKFLOW.md` and edit the `project:` field.
3. **Override defaults at the right precedence layer.** The `vars:`
   defaults declared in each module are the lowest-precedence layer.
   To customize without forking the module, set the same name in:
   - the global module-vars layer (a higher-precedence layer for vars
     that apply across every project),
   - the project's `STATUS.md` `vars:` block (project scope), or
   - the launch-modal override panel (launch scope, OP-204).

   See [`docs/workflow-modules/reference/precedence.md`](../../workflow-modules/reference/precedence.md)
   for the full precedence chain.
4. **Run `op: explain workflow`** in the command palette (or
   `obsidian op-explain-workflow id=<your-issue-id> mode=kickoff`) to
   confirm zero diagnostics. Any error there tells you exactly what's
   wrong.

## Verifying — CI keeps the library honest

`plugins/op-obsidian/src/docsExamples.test.ts` walks every file in
this subtree, runs it through the same loader and composer the runtime
uses, and asserts zero error-severity diagnostics for both the
`code-project` and `docs-project` slugs at every step they declare. If
a future engine change breaks the schema, this test goes red — the docs
and the engine stay in sync via the merge gate.

## How the workflow-library differs from the tutorial trees

The other three subtrees under `docs/examples/` (`author-first-module`,
`compose-first-workflow`, `variables-and-templating`) back the
[OP-212 tutorials](../../workflow-modules/) and are intentionally
minimal — each illustrates one concept. **This subtree is the curated
library** — the files that have proven useful in production and that a
real project might cherry-pick from on day one. Treat them as a
starting point, not gospel: edit, fork, override, delete.

## Note on var-name reuse across libraries

A few var names appear in both this library and the `variables-and-templating/`
tutorial tree (e.g. `package_name`). They live in different example
subtrees, which the test loads independently — the loader sees one set
of declarations at a time, so there is no collision. If you copy
modules from both libraries into the same vault, the loader's
`intra-scope-collision` rule kicks in only when two modules at the same
`scope:` declare the same var name; cross-scope or cross-tree
duplicates compose fine.
