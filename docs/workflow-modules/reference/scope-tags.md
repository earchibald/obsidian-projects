# Scope tags and gating fields

A workflow module's `scope:` field decides **when** its body reaches
the agent; the optional `agent:` and `project:` fields decide **for
which launches** the module is even considered. Together these are
the gating surface that lets you write modules with narrow
applicability without touching the workflow file each time.

The loader does **not** enforce a fixed enum of `scope:` values —
authors invent the names they need. This page documents the
conventions emerging in shipped fixtures and the patterns the launch
surface understands.

## `scope:` — partition key

`scope:` is the partition key used to:

1. Decide **which step** in the workflow file's `steps:` list a module
   participates in. A module with `scope: kickoff` is only considered
   for steps whose `step:` id matches `kickoff`.
2. Detect intra-scope variable collisions. Two modules at the same
   scope declaring the same `vars:` name is an
   `intra-scope-collision` error. Across different scopes the same
   name is fine.

A module's scope must match a `step:` id in the active workflow file
for the module to actually fire. Modules with a scope no step
references are loaded but never injected — useful for migration (drop
the module first, wire the step later) but easy to forget about. The
launch modal's "▶ Composed prompt preview" disclosure shows you
exactly what's about to be injected.

## Conventional scope values

| Scope | Convention | Use for |
| :--- | :--- | :--- |
| `kickoff` | Injected once at the start of the agent's first prompt. | Orientation rules: branching discipline, where the issue note lives, which test command to run. |
| `plan` | Injected when the agent enters plan mode. | "Before implementing, write the plan section" / planning-stage hints. |
| `review` | Injected when the agent reaches the review step. | "Request adversarial review before merging" / merge-gate checklists. |
| `finalize` | Injected at workflow end. | Resolve / cleanup / retro instructions. |
| `mode:<launch-mode>` | Injected only when the launch mode (`{{mode}}`) matches. | Mode-specific prompts: `mode:plan` for plan-mode-only guidance, `mode:implement` for implement-only guidance. The launch surface and workflow file must agree on the spelling — this is a convention, not a built-in match rule. |
| `always` | Conventional name for "every step". | Truly cross-cutting reminders. To make `always` actually inject everywhere, the workflow file's every `step:` must list the `always`-scoped module's id in its `modules:`. There is no automatic broadcast — the workflow file is explicit. |

The composer doesn't care what scope is called; it just buckets modules
by scope and stitches them in at the matching step. A project could
just as easily have `triage` or `qa-handoff` — invent what you need.

## `agent:` — agent gating

A module may declare `agent: <id>` to restrict it to one agent.
Common values today: `claude`, `gemini`, `copilot`. The loader does
**not** filter on this field — the consumer (the composer) does. Use
it for prose that only makes sense for a specific agent (model-
specific tool quirks, agent-specific memory recipes).

```yaml
---
id: claude-skill-cache
title: Claude — using the Skill cache
type: workflow-module
scope: kickoff
agent: claude
---

# Body — Claude-only orientation
```

A module without `agent:` applies to every agent. An empty or
whitespace-only `agent:` (`agent: ""`) is silently treated as absent
— some authors write that to mean "no restriction"; we honor that.

## `project:` — project gating

For **global** modules (`Projects/_op-modules/<id>.md`), `project:`
restricts the module to one project slug, even though the file lives
in the global folder.

```yaml
---
id: op-obsidian-vault-prep
title: op-obsidian — vault prep
type: workflow-module
scope: kickoff
project: obsidian-projects
---

# Body — only injected for the obsidian-projects project
```

Per-project modules already live under `Projects/<slug>/MODULES/` so
they don't need this field. If a per-project module sets `project:` to
a value that disagrees with its enclosing folder, the module is
filtered out at load time.

Same empty-string rule as `agent:` — `project: ""` is treated as
absent.

## Combining gates

Gates are AND-combined. A module with all four:

```yaml
scope: review
agent: claude
project: obsidian-projects
order: 50
```

… participates only when (a) the active workflow file has a `review`
step, (b) that step's `modules:` list names this module, (c) the
launch agent is `claude`, and (d) the project slug is
`obsidian-projects`. Within those launches it sorts by `order` (lower
first; default 0).

## Choosing a scope

- Start with `kickoff` for any rule the agent needs upfront (branch
  policy, where to find the issue note, test command).
- Promote rules to a stage-specific scope (`plan`, `review`,
  `finalize`) once you find yourself writing "before <stage>, do X".
- Use `mode:<mode>` only when the rule is genuinely mode-specific
  and **the launch surface threads `mode:` through to the workflow
  file's `step:` ids**. This is a convention; verify it works in your
  setup with the launch preview before relying on it.
- Reach for `agent:` / `project:` gating only when the rule truly
  doesn't generalize. Most rules either apply everywhere or are
  better split into smaller scope-specific modules.

## See also

- [`module-schema.md`](./module-schema.md) — full module frontmatter
  contract.
- [`workflow-schema.md`](./workflow-schema.md) — how the workflow
  file's `steps:` list selects modules by scope.
- [`workflow-module-schema.md`](../../specs/workflow-module-schema.md)
  — canonical spec; covers loader behavior, shadowing, and every
  diagnostic.
