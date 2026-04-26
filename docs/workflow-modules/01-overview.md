# Workflow Modules — Conceptual Overview

Workflow modules are the way op composes the prompt that an agent receives
when you launch one against an issue. Instead of stuffing every rule, hint,
and house style into a single per-project `WORKFLOW.md`, you author small
markdown files — one rule or behavior per file — and let op stitch the
relevant ones together at launch time.

This page explains the model. For the full file-format contract, see the
reference docs:

- [`workflow-module-schema.md`](../specs/workflow-module-schema.md) —
  module file format, frontmatter fields, diagnostics.
- [`workflow-file-schema.md`](../specs/workflow-file-schema.md) — workflow
  file format, `extends:` inheritance, model registry, legacy fallback.

For a hands-on walkthrough, jump to the [5-minute quickstart](./02-quickstart.md).

## The shape of a module

A module is a markdown file with a small frontmatter block:

```yaml
---
id: branching
title: Branching discipline
type: workflow-module
scope: kickoff
order: 10
---

Always create a feature branch off `main` before making changes. Branch
names use `<issue-id>-<slug>` (e.g. `OP-211-overview-doc`). Push commits
to the branch you started on; never commit directly to `main`.
```

The frontmatter declares **where** the module plugs into a workflow
(`scope`) and **how** it sorts against siblings (`order`); the body is
prose that gets injected verbatim into the agent's prompt at the matching
step. That's the entire surface — there's no DSL, no scripting language.

## The four-layer precedence chain

When a user runs `op-open-agent` on an issue, op composes a single prompt
out of four layers, applied in order:

```
   ┌──────────────┐
   │  1. Module   │  Each module file is a partition keyed by `scope`.
   │              │  e.g. branching.md → kickoff, review-and-merge.md → review.
   └──────┬───────┘
          │ contributes its body + variable declarations to the matching step
          ▼
   ┌──────────────┐
   │  2. Global   │  Modules under  Projects/_op-modules/<id>.md  apply to
   │              │  every project; the global workflow file at
   │              │  Projects/_op-workflow.md (when referenced via
   │              │  `extends:`) supplies default agent + step list.
   └──────┬───────┘
          │ shadowed by per-project entries with the same id
          ▼
   ┌──────────────┐
   │  3. Project  │  Modules under  Projects/<slug>/MODULES/<id>.md  apply
   │              │  only to that project; the per-project workflow file
   │              │  at  Projects/<slug>/WORKFLOW.md  picks the step list,
   │              │  overrides default agent/model, and (optionally)
   │              │  `extends:` the global workflow.
   └──────┬───────┘
          │ values resolved against the loaded module set
          ▼
   ┌──────────────┐
   │  4. Launch   │  The launch modal (op-open-agent) lets you override
   │              │  agent/model and supply user-vars at the moment of
   │              │  launch — these win over everything below.
   └──────────────┘
```

Read top-to-bottom: a module **declares** content; a workflow file
**selects** which modules participate at which step; project-layer
declarations **shadow** global ones at the same id; the launch modal has
the final word for that single launch.

A useful way to think about it: layers 1–3 describe the *rules of the
project*; layer 4 is *what's true for this one run*. The first three
should change rarely (and are checked into the vault); the fourth is
ephemeral.

### Concrete example

You have:

- `Projects/_op-modules/branching.md` (global, scope `kickoff`).
- `Projects/_op-modules/review-and-merge.md` (global, scope `review`).
- `Projects/obsidian-projects/MODULES/review-and-merge.md` (per-project,
  scope `review`, with stricter rules for this repo).
- `Projects/obsidian-projects/WORKFLOW.md` declaring
  `extends: Projects/_op-workflow.md` and a `steps:` list of
  `[{ step: kickoff, modules: [branching] }, { step: review, modules: [review-and-merge] }]`.

When you `op-open-agent` on an `obsidian-projects` issue:

1. The loader reads all four module files.
2. The per-project `review-and-merge.md` shadows the global one with the
   same id — only the per-project copy survives the load.
3. The workflow file picks `branching` for `kickoff` and `review-and-merge`
   for `review`.
4. The launch modal renders the composed prompt; you can tweak the agent
   or fill any unbound `vars:` before hitting Launch.

The agent's kickoff prompt contains the prose from `branching.md`; its
review-step prompt contains the prose from the *per-project* version of
`review-and-merge.md`.

## Kickoff vs per-step injection

A module's `scope:` field decides **when** its body reaches the agent:

- **`scope: kickoff`** — injected once, at the top of the agent's first
  prompt. Use for orientation rules the agent needs upfront: branching
  discipline, where to find the issue note, which test command to run.
- **Other scopes (`plan`, `review`, `finalize`, …)** — injected only when
  the agent reaches that step. The workflow file's `steps:` list decides
  which named steps exist and which modules each one composes from. Use
  for stage-specific instructions: "before merging, request an
  adversarial review", "when the plan is ready, post it for sign-off".

Scopes are open-ended — you invent the names you need by using them in
your workflow file's `steps:`. The composer doesn't care what they're
called; it just buckets modules by scope and stitches them in at the
matching step. The convention emerging in shipped fixtures is
`kickoff` / `plan` / `review` / `finalize`, but a project could just as
easily have `triage` or `qa-handoff`.

A module can declare any scope, but only modules whose scope matches a
step in the active workflow file actually fire. A `scope: triage` module
in a project whose workflow file has no `triage` step is loaded but never
injected — useful for migration (drop the module first, wire the step
later) but easy to forget about. The launch modal's "Composed prompt
preview" disclosure shows you exactly what's about to be injected, which
is the first place to check if a module isn't reaching the agent.

## When to choose global vs per-project

**Reach for a global module (`Projects/_op-modules/<id>.md`) when** the
rule is genuinely vault-wide: branching discipline, commit style, "always
ask before pushing to a shared branch", an onboarding checklist that all
your projects share. Globals are the lowest-effort sharing surface — drop
the file once and every project that opts in via `extends:` or by
naming the module in its `steps:` picks it up. They're also the right
place for rules a *new* project should inherit by default; an empty per-
project `WORKFLOW.md` that only sets `extends: Projects/_op-workflow.md`
gets the global behavior for free.

**Reach for a per-project module (`Projects/<slug>/MODULES/<id>.md`)
when** the rule is project-specific *or* you want to override a global at
the same id. Common cases: this repo's stricter review checklist; a
project that wires up a tool the global doesn't know about; a temporary
relaxation while a migration is in flight. Because per-project modules
shadow same-id globals **silently**, this is also the lever you reach for
when a global rule shouldn't apply to one project — drop a same-id file
under that project's `MODULES/` and the global is dropped on the floor
for that project only.

**Rules of thumb.**

- Start global. Move per-project only when you find yourself adding
  project-specific carve-outs to a global module.
- Don't shadow a global without a comment in the per-project module
  explaining what changed and why — `git blame` will eventually answer
  the question, but a sentence saves a future-you ten minutes.
- One concept per module. Two modules at scope `kickoff` are easier to
  reason about than one module that does five things — and the
  intra-scope-collision check only catches *variable* collisions, not
  prose ones, so a kitchen-sink module is harder to safely override.

## Where to next

- [02-quickstart.md](./02-quickstart.md) — drop your first module and see
  it in the launch preview, in five minutes.
- [`workflow-module-schema.md`](../specs/workflow-module-schema.md) — the
  full file-format reference: every field, every diagnostic.
- [`workflow-file-schema.md`](../specs/workflow-file-schema.md) — workflow
  file reference: `extends:`, model registry, legacy fallback ladder.
