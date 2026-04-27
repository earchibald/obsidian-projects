# Workflow Modules — 5-minute Quickstart

This walkthrough takes you from a vanilla op install to seeing a workflow
module rendered in the agent launch preview. You won't actually launch an
agent — the goal is to verify the composition pipeline end-to-end without
side effects.

If you haven't read the [conceptual overview](./01-overview.md), skim it
first — the precedence chain and `scope:` model show up below without
re-explanation.

## Prerequisites

- op-obsidian installed and enabled in any vault.
- At least one project scaffolded under `Projects/<slug>/` (for the
  walkthrough below, we'll use a placeholder slug `myproject`).
- An issue in that project — any open issue will do.

## 1. Confirm modules mode (10 seconds)

`workflowMode` is a per-vault setting controlled from **Settings → Obsidian
Projects (op) → Workflows → Workflow mode**. Two values:

- **Modules (default)** — the launcher composes the prompt from
  workflow-module files in this vault. This is the post-OP-208 default
  for fresh installs.
- **Legacy (inline WORKFLOW.md)** — the launcher inlines the project's
  `WORKFLOW.md` as opaque prose and ignores any modules you create.

Open the dropdown and confirm it reads **Modules (default)**. If your
install is older than the OP-208 cutover and the prior value was
`"legacy"`, the migration preserved it — pick **Modules (default)** now
to follow this walkthrough. The change is saved immediately; no restart.

If you'd rather verify from the developer console (Cmd-Option-I in
Obsidian, Console tab):

```js
app.plugins.plugins["op-obsidian"].settings.workflowMode
// → "modules"
```

Under Legacy mode the launch modal uses the WORKFLOW.md injection blob
and ignores any module files you create — you'll see a "Workflow modules
disabled" callout in the launch preview if you forget to flip it.

## 2. Author a global workflow file (90 seconds)

Modules don't activate on their own — a workflow file decides which
modules participate at which step. The lowest-effort setup is one global
default at `Projects/_op-workflow.md` that every project picks up via
`extends:`.

Create `Projects/_op-workflow.md`:

```markdown
---
type: workflow
schema: 1
project: _global
default_agent: claude
default_model: opus
steps:
  - step: kickoff
    modules: [branching]
---

Global default workflow. Every project that declares
`extends: Projects/_op-workflow.md` inherits this step list.
```

Then make sure your project's workflow file extends it. If
`Projects/myproject/WORKFLOW.md` doesn't exist yet, create it:

```markdown
---
type: workflow
schema: 1
project: myproject
default_agent: claude
default_model: opus
extends: Projects/_op-workflow.md
steps: []
---
```

The empty `steps:` list inherits everything from the parent. You can add
project-specific overrides here later.

## 3. Drop your first module (60 seconds)

Create `Projects/_op-modules/branching.md`:

```markdown
---
id: branching
title: Branching discipline
type: workflow-module
scope: kickoff
order: 10
---

Always create a feature branch off `main` before making changes. Branch
names use `<issue-id>-<slug>`. Push commits to that branch only —
never directly to `main`.
```

That's it: three lines of body, six lines of frontmatter. The filename
basename (`branching.md`) must match the `id:` field
(`id: branching`) — a mismatch is a `malformed-frontmatter` diagnostic
and the module is silently dropped.

## 4. See it in the launch preview (60 seconds)

Open any issue note in your project, then run **op: open agent** from
the command palette (⌘P). The launch modal opens.

Below the **Cancel** / **Launch** buttons, find the **▶ Composed prompt
preview** disclosure. Click it to expand.

You should see the body of `branching.md` rendered as the kickoff prompt:

```
▼ Composed prompt preview        187 chars · 1 module · 0 diagnostics

Always create a feature branch off `main` before making changes. Branch
names use `<issue-id>-<slug>`. Push commits to that branch only —
never directly to `main`.
```

The header line on the right of the disclosure tells you how many
characters of prompt the composer produced (`187 chars`), how many
modules contributed (`1 module`), and how many diagnostics fired
(`0 diagnostics` in the happy path). If the module count is `0 modules`,
scroll back through this walkthrough — most likely your workflow file's
`steps:` list doesn't mention `branching` in any kickoff step.

**Click Cancel.** You don't need to launch the agent to verify the
plumbing.

## Troubleshooting

**The preview says "(no composed prompt — no WORKFLOW.md found for this
project; create one under Projects/\<project\>/ to enable prompt
composition)".** Your project doesn't have a `WORKFLOW.md`. Re-do step 2.

**The preview says "(no composed prompt — WORKFLOW.md loaded but the
kickoff step produced empty output; check module bodies and variable
bindings)".** The workflow file loaded but the kickoff step's
`modules:` list either is empty or names modules that didn't load.
Check that the global default's `steps:` includes
`{ step: kickoff, modules: [branching] }` and that the per-project
workflow's `extends:` actually points at it.

**The preview shows "Workflow modules disabled (Settings →
workflowMode = legacy)".** You're still in legacy mode — re-do step 1.

**The preview count shows `0 modules`.** Almost always one of:

- The module's filename basename doesn't match its `id:` field.
- The module's `scope:` doesn't match any step in the workflow file.

Open the developer console (Cmd-Option-I in Obsidian) and look for
`[op-obsidian]` warnings — diagnostics surface there too while we wire
up an in-product diagnostic surface (tracked under OP-184).

## What to try next

- **Per-project shadowing.** Drop a copy of `branching.md` at
  `Projects/myproject/MODULES/branching.md` with a different body. The
  global is silently shadowed; only the per-project copy reaches the
  agent for `myproject`. Other projects still see the global.
- **A second scope.** Add a `review` step to `_op-workflow.md` and a
  `review-and-merge.md` module with `scope: review`. The kickoff
  preview won't show it (it's a different step), but the composed
  prompt for the review step will.
- **Variables.** Add `vars:` to the module and `{{var_name}}` in the
  body — see [`workflow-module-schema.md`](../specs/workflow-module-schema.md)
  for the full vars contract and how user-vars resolve.

## Where to next

- [01-overview.md](./01-overview.md) — the conceptual model: precedence
  chain, kickoff vs per-step injection, when to choose global vs
  per-project.
- [`workflow-module-schema.md`](../specs/workflow-module-schema.md) —
  module file reference.
- [`workflow-file-schema.md`](../specs/workflow-file-schema.md) —
  workflow file reference, including the legacy `WORKFLOW.md` fallback
  ladder for projects that haven't migrated yet.
