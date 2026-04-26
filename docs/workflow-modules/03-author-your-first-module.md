# Author Your First Module

This walkthrough takes you from "I want to teach my agent a rule" to a
loadable workflow module file the launch preview shows verbatim. By the
end you'll have authored
[`docs/examples/author-first-module/Projects/_op-modules/branching.md`](../examples/author-first-module/Projects/_op-modules/branching.md)
in your own vault and seen it appear in the composed-prompt preview.

You should already be in `workflowMode: modules` and have a project
scaffolded. If you don't, run through the [5-minute
quickstart](./02-quickstart.md) first — it sets up the prerequisites for
this tutorial.

## What's in a module

Open
[`docs/examples/author-first-module/Projects/_op-modules/branching.md`](../examples/author-first-module/Projects/_op-modules/branching.md)
in another tab. The whole file is about ten lines:

```yaml
---
id: branching
title: Branching discipline
type: workflow-module
scope: kickoff
order: 10
---

Always create a feature branch off `main` before making changes — no
exceptions, including one-line tweaks. Branch names use
`<issue-id>-<slug>` (e.g. `OP-212-author-tutorials`). Push commits to
that branch only; never directly to `main`.
```

Five frontmatter fields and a body. That's the entire authoring surface;
once you internalise these five fields you can write any module.

The frontmatter fields decide *whether* and *when* the module participates
in a workflow. The body is plain markdown that gets injected into the
agent's prompt at the matching step. There's no DSL; everything past the
closing `---` is opaque prose to the loader.

## The five required-or-near-required fields

### `id` — must match the filename basename

`id: branching` lives in a file named `branching.md`. **Mismatches are a
hard error.** A file named `branching-rules.md` declaring `id: branching`
gets dropped at load time with a `malformed-frontmatter` diagnostic and
never reaches the agent.

The id is the handle other surfaces use to refer to the module: a
workflow file's `steps[].modules: [branching]` list, a per-project file
shadowing a global with the same id, the diagnostics surface citing
"module `branching`". Keep it short, lowercase, and meaningful — kebab-
case is conventional.

### `title` — what the settings UI calls it

A non-empty human-readable string. Surfaces in the Settings →
Workflows reference panel, the launch preview's per-chunk breakdown, and
any future op-list-modules CLI. Title once, refine later — agents read
the body, not the title.

### `type: workflow-module` — exact literal

The loader is suspicious: any markdown file with frontmatter walks past
the same scanner, and `type: workflow-module` is the discriminator that
says "yes, treat me as a module". A wrong value (`type: skill`,
`type: notes`) emits `malformed-frontmatter` and the file is dropped.
Leaving it off entirely also drops the file.

### `scope` — where the module plugs into a workflow

The string in `scope:` is the partition key the workflow file's
`steps[].step` matches against. The kickoff module above uses
`scope: kickoff`; a review-stage module would use `scope: review`; a
plan-stage module would use `scope: plan`.

**Scope names are open-ended.** The composer doesn't care whether you
call your steps `kickoff`, `triage`, `qa-handoff`, or `cleanup` — it
just buckets modules by scope and stitches each step's bucket into the
prompt at launch time. The convention emerging in the shipped fixtures
is `kickoff` / `plan` / `review` / `finalize`, but a project that wants
its own taxonomy is free to invent one.

#### When to use `scope: kickoff` vs a step-scoped value

- **`kickoff`** — orientation rules the agent needs at the **top of the
  very first prompt**: branching discipline, where the issue note lives,
  the test command, mandatory pause-before-push behaviors. Kickoff fires
  exactly once per launch chain and stays in the agent's prompt for the
  rest of the session.
- **`plan` / `review` / `finalize` / etc.** — instructions specific to
  one stage of the work: "before merging, request an adversarial
  Copilot review", "when the plan is ready, post it for sign-off",
  "before resolving, write the Summary section". The composer only
  injects step-scoped modules **at the moment that step launches** —
  before that, they don't burn the agent's context.

A common mistake is to overload `kickoff` with everything. The system
gives you free per-step injection — use it. Move the "before merging"
prose into a `review`-scoped module so the implementer doesn't carry
review-stage rules through implementation.

There's no "always" scope shipped today; **if you want a module to fire
at every step, list it in every step's `modules:` list in the workflow
file**. Forcing the choice into the workflow file rather than a magic
scope keeps the composer's behavior easy to reason about — every step's
prompt is exactly the modules its step record names, no more.

### `order` — sort key within a scope

Optional, default `0`, integer. When two modules share the same scope,
the composer sorts them ascending by `order` to decide which prose comes
first in the composed prompt. Negative numbers work; ties fall back to
module-id alphabetical.

`order: 10` instead of `order: 1` is conventional. Leaving room between
numbers means you can insert a new module between two existing ones
without renumbering. Pick `10`, `20`, `30` for the first three modules
in a scope and you'll thank yourself when the fourth shows up.

## Optional frontmatter fields

These don't show up in the example, but they're worth knowing about:

### `project` — restrict a global module to one project

A global module file at `Projects/_op-modules/<id>.md` applies to every
project by default. Add `project: <slug>` to its frontmatter to restrict
it to one project — useful when you've outgrown a per-project module
file and moved the contents global, but only one project should still
see it. (The more common pattern is the inverse: keep the module global,
let other projects pick it up via their workflow file's `steps:` list.)

### `agent` — restrict the module to one agent id

`agent: claude` filters the module out of every launch where the
resolved agent isn't `claude`. The loader doesn't enforce this today —
consumers (the launcher, the composer) apply it — but having it on the
module file is the cleanest way to declare intent. Use it for
agent-specific instructions that wouldn't make sense to the others
(e.g., a Claude-specific tool-use note, a Gemini-specific safety
disclaimer).

### `vars:` — declared variables consumed by the body

The body can reference user-supplied template variables via
`{{vars.<name>}}` syntax. Declaring those names in `vars:` does three
things:

1. The composer knows where to look for the value (and which scope
   should win — see [05 — Use variables and templating](./05-variables-and-templating.md)).
2. Authoring surfaces (autocomplete, the Settings → Workflows panel)
   know the var exists and can show it to other authors.
3. The loader can flag intra-scope-collision (two modules at the same
   scope declaring the same var name) before the value is ever
   resolved.

For a module that doesn't reference any user vars in its body, leave
`vars:` off entirely. Variables and templating are the subject of
[tutorial 05](./05-variables-and-templating.md); this tutorial keeps the
example module variable-free so you can focus on the frontmatter
contract first.

## Where the file lives

| Goal | Path |
| :--- | :--- |
| **Apply this rule to every project in your vault** | `Projects/_op-modules/<id>.md` |
| **Apply only to one project** | `Projects/<slug>/MODULES/<id>.md` |
| **Override a global rule for one project** | `Projects/<slug>/MODULES/<id>.md` *with the same id as the global* |

Per-project modules **silently shadow** same-id globals — only the
per-project copy is loaded and the global is dropped. There's no
diagnostic; the design is that a project should always be able to
override a vault-wide rule without ceremony. Comment your shadow modules
("this overrides the global X because…") so a future you can find the
shadowing relationship from `git blame` rather than from comparing files.

## Try it: drop the module in and see it compose

The example file is ready to copy. From this repo's root:

```bash
mkdir -p <your-vault>/Projects/_op-modules/
cp docs/examples/author-first-module/Projects/_op-modules/branching.md \
   <your-vault>/Projects/_op-modules/
```

Then add a workflow file to a project that uses the module:

```bash
cat > <your-vault>/Projects/<your-slug>/WORKFLOW.md <<'EOF'
---
type: workflow
schema: 1
project: <your-slug>
default_agent: claude
default_model: opus
steps:
  - step: kickoff
    modules: [branching]
---
EOF
```

(Replace `<your-vault>` and `<your-slug>` with real paths.) Open any
issue in that project, run **op: open agent** from the command palette,
and expand the **▶ Composed prompt preview** disclosure. You should see
the body of `branching.md` rendered as the kickoff prompt, with a header
line reading something like `1 module · 0 diagnostics`.

The 0-diagnostics part is the goal: zero diagnostics means the loader
accepted your module exactly as you wrote it. Anything else is the
system telling you something's off — read the diagnostic message, fix
the file, and the count goes back to zero.

## Common mistakes the loader catches

| Symptom | Likely cause | Diagnostic code |
| :--- | :--- | :--- |
| Module silently missing from the preview | Filename basename ≠ `id:` field | `malformed-frontmatter` |
| Module silently missing from the preview | `type:` field absent or wrong | `malformed-frontmatter` |
| Module loads but body shows `{{vars.foo}}` literally | Body references `vars.foo` but `vars:` doesn't declare it (or no scope supplies a value) | `missing-var` (warning) |
| Two modules' bodies collide on a var name | Both at the same scope declaring the same var | `intra-scope-collision` |
| Workflow file says "modules: [foo]" but no body | Module id doesn't match any loaded module | `unknown-module` (info) |

Every diagnostic carries a `moduleId` (and often a file path in `extra`)
so you can jump straight to the offending file. The composed-prompt
preview surface and `op-explain-workflow` both render diagnostics
verbatim — they're how you debug.

## Where to next

- [04 — Compose your first workflow](./04-compose-your-first-workflow.md)
  takes the module you just authored and shows how a workflow file
  decides which steps it participates in (and which agent runs each
  step).
- [05 — Use variables and templating](./05-variables-and-templating.md)
  unlocks `{{vars.foo}}` in your module bodies — and explains the
  precedence chain that decides whose value wins.
- [`docs/specs/workflow-module-schema.md`](../specs/workflow-module-schema.md)
  is the contract — every field, every diagnostic, every edge case in
  the `vars:` parser. Keep it next to your editor when authoring.
