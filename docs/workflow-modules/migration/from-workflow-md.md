# Migrate from a Legacy WORKFLOW.md

The classic op layout was a single `Projects/<slug>/WORKFLOW.md` per project —
a long markdown blob that the agent received verbatim at kickoff. It worked
fine, but every agent launch carried every rule, even rules that only applied
later in the lifecycle, and there was no clean way to share rules across
projects.

The modules schema replaces the monolith with composable pieces: small named
markdown files under `Projects/_op-modules/` (global) or
`Projects/<slug>/MODULES/` (per-project), wired together by a per-project
schema-1 `WORKFLOW.md` that lists which modules each step composes from.

You don't have to migrate today. **The loader supports legacy WORKFLOW.md
files indefinitely** via a six-shape fallback ladder — your agents keep
auto-advancing on the rules you already wrote. This guide walks the actual
migration this project went through (OP-189) so you have a concrete shape to
copy, and documents the fallback ladder so you know what'll happen if you
keep your existing file as-is.

## Why migrate

Three things you get with the new schema:

1. **Per-step injection.** A rule scoped to `review` only reaches the agent
   when a review-mode session launches. A `kickoff` agent doesn't carry the
   release-day rules; a `finalize` agent doesn't carry the planning rules.
   Lower context, sharper signal.
2. **Cross-project reuse.** A rule that's genuinely vault-wide (branching
   discipline, commit cadence, "don't mock the database") lands once in
   `Projects/_op-modules/` and every project that mentions it in its
   `steps:` list picks it up. No copy-paste drift between project WORKFLOW
   blobs.
3. **Shadow without forking.** A project that wants a stricter version of a
   global rule drops a same-id file under its own `MODULES/` folder. The
   global is shadowed silently; the per-project copy reaches the agent. No
   inheritance gymnastics, no "extends-with-overrides" vocabulary — same id
   wins, project beats global.

You also get cleaner reviews — diffs to a 10-line module are auditable in a
way diffs to a 200-line `WORKFLOW.md` blob aren't — and the import/export
flow described in [`share-modules.md`](../sharing/share-modules.md) only
works on individual modules, so migrating unblocks sharing.

## The migration this project did, in full

This repo's own `WORKFLOW.md` was a long monolithic SDLC doc. OP-189 split it
into 9 modules behind a schema-1 workflow file. The shape is general — most
projects' WORKFLOW.md files have the same kinds of rules, just in different
prose — so it's a useful template.

### Before

`Projects/obsidian-projects/WORKFLOW.md`, condensed to the section headings:

```markdown
# obsidian-projects — workflow

## Branching
Always work in an isolated worktree. No exceptions, including one-line tweaks…

## Tmux experimentation: never target shared op sessions
When developing anything that touches the orchestrator… do not run kill-session
against op-agents-* prefixes. This is what caused OP-180: an agent…

## Version bump cadence
Every issue that ships code bumps the project's version files in lockstep…

## Commit-to-issue mapping
After each commit, run `op-append-commit issue=<id> sha=<sha7> subject=<msg>`…

## PR requirement
PRs are required to merge to main. Title format: `<ISSUE>: <subject>`. Pull
after merge — `gh pr merge --squash --delete-branch` doesn't fast-forward…

## Adversarial AI review before merge
Request adversarial Copilot review on the PR before squash-merging. Bypass
criteria: docs-only PRs, version-bump-only commits, …

## Releases (op-obsidian)
op-obsidian releases auto-publish from main via .github/workflows/op-obsidian-release.yml…

## GitHub issue close on resolve
When closeGithubIssueOnResolve is on, op-resolve runs `gh issue close` on the
issue's github_issue: URL atomically. The setting lives at
settings.github.closeGithubIssueOnResolve — NOT the top level (the => {} misread).

## Parent-issue orchestration
For umbrella tickets: dispatch each child to its own tmux window under
session `op-agents`, name windows by issue id, poll `tmux capture-pane`…
```

Every section was always loaded — including the parent-orchestration rule
on every solo-issue agent that didn't have a parent at all, and the
adversarial-review rule on a kickoff-only evaluator that wasn't going to
merge anything.

### After

The same content, decomposed into 9 module files plus a schema-1
`WORKFLOW.md` that lists which modules each step composes from.

**6 cross-cutting modules at `Projects/_op-modules/`** (global; any project
can reuse them):

```
Projects/_op-modules/
├── branching.md              (scope: kickoff, order: 10)
├── tmux-safety.md            (scope: kickoff, order: 20)
├── version-cadence.md        (scope: kickoff, order: 30)
├── commit-mapping.md         (scope: kickoff, order: 40)
├── pr-required.md            (scope: kickoff, order: 50)
└── adversarial-review.md     (scope: review,  order: 10)
```

**3 per-project modules at `Projects/obsidian-projects/MODULES/`**
(obsidian-projects-specific behavior other projects don't need):

```
Projects/obsidian-projects/MODULES/
├── parent-orchestration.md           (scope: kickoff,  order: 60, project: obsidian-projects)
├── github-issue-close-on-resolve.md  (scope: finalize, order: 20, project: obsidian-projects)
└── releases.md                       (scope: finalize, order: 30, project: obsidian-projects)
```

**The new `Projects/obsidian-projects/WORKFLOW.md`:**

```yaml
---
project: obsidian-projects
type: workflow
schema: 1
default_agent: claude
default_model: opus
updated: 2026-04-26
steps:
  - step: kickoff
    modules: [branching, tmux-safety, version-cadence, commit-mapping, pr-required, parent-orchestration]
  - step: evaluate
    modules: []
  - step: plan
    modules: []
  - step: implement
    modules: []
  - step: review
    modules: [adversarial-review]
  - step: finalize
    modules: [github-issue-close-on-resolve, releases]
---

# obsidian-projects — workflow

This workflow composes per-step modules from `Projects/_op-modules/` (global)
and `Projects/obsidian-projects/MODULES/` (per-project) into the SDLC ruleset
that used to live as monolithic prose in this file.
```

Each step's `modules:` list is just an ordered list of ids — the loader walks
each module file, buckets by `scope:`, sorts by `order:`, and stitches the
bodies into the prompt for the matching step. `kickoff` agents now carry six
rules; `review` agents carry one (`adversarial-review`); `finalize` agents
carry two (`github-issue-close-on-resolve`, `releases`). Solo-issue
evaluators no longer carry the umbrella-orchestration rules they don't need.

### One module's full before/after

The most concrete view is the level of a single rule. Take this repo's
tmux-safety rule — the one with the OP-180 incident lore. In the legacy
`WORKFLOW.md` it was a section under `## Tmux experimentation`. After
migration it lives at `Projects/_op-modules/tmux-safety.md`:

```markdown
---
id: tmux-safety
title: Tmux safety — never target shared op sessions
type: workflow-module
scope: kickoff
order: 20
vars:
  - { name: protected_session_prefixes, default: "op-agents-,view-",
      description: "Comma-separated list of tmux session-name prefixes that
      must never receive destructive commands — these host live agent state." }
  - experiment_session_pattern=op-experiment-$$
---

When developing or debugging anything that touches the orchestrator,
terminal launch, or tmux integration … do not run `tmux kill-session`,
`tmux kill-window`, `tmux kill-server`, or any other destructive tmux
command against a target whose name starts with any of
`{{vars.protected_session_prefixes}}`.

This is what caused **OP-180**: an agent developing OP-178 was experimenting
with raw tmux commands as it worked, ran a `kill-session` against an
op-agents target, and took down both its own window and the sibling agent…

[full body preserved verbatim]

[…]
```

Two things landed in the new shape:

1. **The `vars:` block.** The two values that were repo-specific in the
   legacy prose (`op-agents-,view-` for the protected prefixes; the
   experiment-session pattern) became declared variables. Other projects
   override them in their own `STATUS.md` `vars:` block without forking the
   module body.
2. **Body fidelity.** The OP-180 incident story stays — it's the canonical
   "why this rule exists" lore. Stripping it would weaken the rule. The
   migration is content-preserving by default; you generalize over time as
   you find which rules are genuinely portable.

The other 8 modules followed the same template: lift the rule from the
legacy section, declare any project-specific values as `vars:` with sensible
defaults, preserve the prose verbatim, set `scope:` to the lifecycle phase
the rule actually applies to.

### Scope-tag rationale

- **`kickoff`** — branching, tmux-safety, version-cadence, commit-mapping,
  pr-required, parent-orchestration. Every session-starting agent needs
  these. The rule "always work in a worktree" is useless if it only
  reaches the agent at review time.
- **`review`** — adversarial-review. Only the merging agent needs to know
  the bypass criteria for the Copilot review gate; the kickoff prompt
  shouldn't carry those rules.
- **`finalize`** — github-issue-close-on-resolve, releases. The op-resolve
  agent needs the release-flow rules; nobody else does.
- **`evaluate` / `plan` / `implement`** — empty for now. Phase-specific
  guidance lives in the per-mode skill prompts, and adding modules at
  these scopes would duplicate without adding signal. Future cross-cutting
  rules can land here without needing a schema change.

### What didn't change

The path stays at `Projects/<slug>/WORKFLOW.md` — there's no rename. The
loader detects the schema by reading `type:` and `schema:` from frontmatter,
not by filename. Nothing else in your project's setup needs to move; the
issue notes, scaffold base, STATUS.md, and `Projects/_scratch/` all behave
exactly as before.

## Step-by-step migration recipe

A version of the OP-189 plan, generalized for any project. Allow yourself
two sessions: one to author the modules, one to verify the composed prompt
matches what you had before.

### 1. List the rules in your current WORKFLOW.md

For each `## ` section in your existing `Projects/<slug>/WORKFLOW.md`:

- What's the rule, in one sentence?
- Is it cross-cutting (every project of yours wants it) or per-project?
- Which lifecycle phase does it apply to (`kickoff` / `evaluate` / `plan`
  / `implement` / `review` / `finalize`, or a custom step)?
- Are there project-specific values that other projects would override
  (commands, paths, prefixes, branch names)?

Write the list down. The migration is mostly bookkeeping; the categorization
is the actual work.

### 2. Create the module files

For each rule, create a markdown file under one of:

- `Projects/_op-modules/<id>.md` if cross-cutting.
- `Projects/<slug>/MODULES/<id>.md` if project-specific (set
  `project: <slug>` in the frontmatter).

The frontmatter contract is small — see
[`workflow-module-schema.md`](../../specs/workflow-module-schema.md) for the
full reference, but the minimum is:

```yaml
---
id: <kebab-case-id>             # must match the filename basename
title: <human-readable title>
type: workflow-module           # required literal
scope: kickoff                   # the step you want this rule injected at
order: 10                        # sort key within the scope (lower first)
vars:                            # optional: declared variables
  - some_var=default
---
```

The body is the rule prose, lifted verbatim from your legacy WORKFLOW.md
section. Use `{{vars.some_var}}` anywhere a project-specific value should
be substitutable.

The filename basename must match the `id:` field. A mismatch surfaces as a
`malformed-frontmatter` diagnostic and the module is silently dropped from
composition — easy to miss until you check the launch preview's diagnostic
count.

### 3. Rewrite WORKFLOW.md as a schema-1 file

Replace the legacy prose at `Projects/<slug>/WORKFLOW.md` with the new
shape:

```yaml
---
project: <your-slug>
type: workflow
schema: 1
default_agent: claude
default_model: opus
updated: <today>
steps:
  - step: kickoff
    modules: [<list every kickoff-scoped module by id>]
  - step: evaluate
    modules: []
  - step: plan
    modules: []
  - step: implement
    modules: []
  - step: review
    modules: [<list every review-scoped module by id>]
  - step: finalize
    modules: [<list every finalize-scoped module by id>]
---

# <project name> — workflow

<short prose explainer pointing at the module split>
```

The body is opaque commentary; the loader only reads frontmatter. A
one-paragraph description of how the modules compose makes future you (or a
new collaborator) much faster on the next migration.

If you'd rather keep a global default workflow that several projects share,
author it once at `Projects/_op-workflow.md` and have each per-project
`WORKFLOW.md` pull it in via `extends: Projects/_op-workflow.md`. The
[2-quickstart](../02-quickstart.md) walks the `extends:` shape end-to-end.

### 4. Verify the composed prompt

Open any issue in the migrated project and run **op: open agent**. Expand
the **Composed prompt preview** disclosure. The composed kickoff prompt
should be the concatenation of every module body listed in your
`steps[step=kickoff].modules:` array, in `order:` order, with `{{vars.*}}`
references substituted by their bindings.

Walk the legacy WORKFLOW.md section-by-section and confirm each rule lands
in the composed preview at the right scope. The rule *substance* should be
identical to the legacy file's content; the *delivery* should be sharpened
(right rule at the right phase). If a rule is missing, either:

- The module's `id:` doesn't match the filename basename (silent drop —
  check the diagnostic count in the preview).
- The module's `scope:` doesn't match any step in WORKFLOW.md (loaded but
  never injected — also surfaces as a diagnostic).
- The module is named in `WORKFLOW.md` `steps[*].modules` but doesn't
  exist on disk (preview reports "module not found").

The **Composed prompt preview** disclosure is the canonical "did the
migration work?" surface — much faster than launching a real agent.

### 5. Don't bump anything

Vault content changes don't bump op-obsidian's version. The migration is
markdown, not code. The OP-189 issue commit history was empty for the
same reason — no PR, no version bump, no release.

If your project does have version-bump cadence rules (i.e. you're using
`version-cadence.md` from `_op-modules/`), the migration itself doesn't
trigger them — those rules apply to the project the workflow belongs to,
not to the workflow file's own state.

## The legacy fallback ladder

You can keep your existing `WORKFLOW.md` as-is forever. The loader applies
a six-shape fallback ladder before declaring a file unparseable. Each shape
maps to one of: "synthesize a one-step legacy workflow from the body" or
"drop the file with a diagnostic." Here's the full table — the same one
that lives in [`workflow-file-schema.md`](../../specs/workflow-file-schema.md)
under "Legacy WORKFLOW.md fallback ladder":

| # | Trigger | Result | Diagnostic |
| :-- | :-- | :-- | :-- |
| 1 | No frontmatter fence at all. The file starts with content, not `---`. | Synthesized workflow with one step `{ step: "kickoff", modules: [], legacyKickoffBody: <entire body> }`. `isLegacy: true`. | `schema-mismatch` warning ("running in legacy compatibility mode") |
| 2 | Frontmatter fence present, no `type:` field. | Same as (1). Body extracted post-fence. | `schema-mismatch` warning |
| 3 | `type: workflow` but no `steps:` field. | Same as (1). Often appears mid-migration when you've started the rewrite but haven't finished. | `schema-mismatch` warning |
| 4 | `type: <not workflow>` (i.e. set by a metadata-management plugin to something else). | Synthesized from the body the same way as (1) so pre-OP-208 files don't lose their content; the file is *not* dropped. | `schema-mismatch` warning. (Pre-OP-208 behavior was an `error` and dropped the file; OP-208 softened it after real-world cases turned up.) |
| 5 | Frontmatter parses to `null` (e.g., empty fence `---\n---`, or `~`). | Same as (1). | `schema-mismatch` warning |
| 6 | Body contains inline `---` HRs after the frontmatter fence. | **Modern parsing** — the fence detector runs against the first `\n---` only. The body's HR lines aren't mistaken for a frontmatter close. | None — this is the happy path; the test fixture exists to lock the regression. |

Shapes 1, 2, 3, 5 all synthesize the same shape: a one-step workflow whose
single `kickoff` step carries the entire body verbatim as
`legacyKickoffBody`. The composer renders the body at kickoff; nothing is
injected at later steps because no later steps exist in the synthesized
workflow.

Shape 4 is the surprise. It used to be a hard error (the file was dropped),
and pre-OP-208 projects whose `WORKFLOW.md` had `type:` set to something
else by a metadata-management plugin would silently lose their workflow
content. OP-208 softened it: shape 4 now synthesizes the same way as shapes
1–3, with a `warning`-severity diagnostic so users see "running in legacy
compatibility mode" rather than "your file vanished."

Shape 6 is the only case in the table that doesn't enter the synthesizer at
all — it's a perfectly modern workflow whose body happens to contain
horizontal-rule markdown (`---` lines). The fence detection runs against
only the first `\n---` after the opening fence, so HR lines lower in the
body are not mistaken for a closing fence. The fixture exists to lock the
regression: a future refactor that swaps `indexOf("\n---", 3)` for greedy
match would silently break shape-6 files.

### How the auto-advance walker handles legacy

The flow walker (the bit that decides what step to launch next when an
agent's SessionEnd hook fires) routes legacy-synthesized workflows through
a separate fallback path:

```ts
// flowOrchestrator.ts:flowAdvanceDecision
if (workflow === null || workflow.source.isLegacy) {
  return legacyFlowAdvanceDecision({ flow, complexity, exitStatus });
}
// …otherwise walk workflow.steps using LEGACY_FLOW_ALIAS to resolve
// pre-OP-188 enum values…
```

`legacyFlowAdvanceDecision` is the byte-for-byte-original hardcoded matrix
from before the OP-188 refactor. Pre-modules projects keep auto-advancing
through the historical `evaluate → plan → implement → review → finalize`
sequence even with no schema-1 workflow file — the modules schema is fully
opt-in.

For the full story on what changed at the auto-advance layer, see
[`from-agent-flows.md`](./from-agent-flows.md).

## Common pitfalls

**"My module body shows up but variables aren't substituted."** The body
references `{{vars.<name>}}` but the variable isn't bound at any layer of
the precedence chain — Module-default doesn't fire automatically; it's the
prompt pre-fill, not an automatic write. Either:

- Add a default in the module's `vars:` declaration: `some_var=default`.
  This binds it as the module-default and the substitution succeeds.
- Bind it at a higher layer (`STATUS.md vars:` for per-project, the
  `workflowVars` settings block for global, or via the launch modal for
  one-off launches).

**"The composed preview shows a module count of `0`."** Almost always one
of these:

- The module's filename basename doesn't match its `id:` field.
- The module's `scope:` doesn't appear in any of the workflow's `steps:`
  ids.
- The workflow file isn't loading — open the developer console and look
  for `[op-obsidian]` warnings (`schema-mismatch`, `bad-model`,
  `malformed-frontmatter`).

**"My legacy WORKFLOW.md still works but the agent feels noisier."** It is
noisier. The synthesized legacy shape carries the entire body at kickoff;
none of the per-step injection wins reach the agent until you migrate. Per-
step injection is the main reason to migrate, not just an aesthetic.

**"I migrated but the auto-advance broke."** Step ids in the workflow are
matched against the issue's `flow:` value via the `LEGACY_FLOW_ALIAS` map
([`from-agent-flows.md`](./from-agent-flows.md) covers it in detail). If
your existing in-flight issues have `flow: planning`/`implementation`/
`finalization`, they alias to canonical step ids `plan`/`implement`/
`finalize` automatically — those are the step ids your new workflow file
should use.

## Where to next

- [`from-agent-flows.md`](./from-agent-flows.md) — the migration story for
  the auto-advance layer: what changed at the flow walker, what didn't,
  and how legacy `flow:` enum values keep working forever.
- [`share-modules.md`](../sharing/share-modules.md) — once your modules
  exist as files, the `op-export-module` / `op-import-module` flow makes
  them shareable across vaults.
- [`workflow-module-schema.md`](../../specs/workflow-module-schema.md) —
  the full module-file contract.
- [`workflow-file-schema.md`](../../specs/workflow-file-schema.md) — the
  full workflow-file contract, including the canonical legacy-fallback
  ladder reference.
