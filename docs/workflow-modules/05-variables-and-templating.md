# Use Variables and Templating

Modules with hard-coded prose only get you so far. **Variables** —
single-pass `{{name}}` substitutions — let one module file work across
many projects, agents, and launches without forking. This walkthrough
covers the two namespaces (always-on plugin vars and user vars), the
four-layer precedence chain, and the inline-defaults shorthand the
import flow uses to bootstrap missing values.

The working modules and workflow file for this tutorial live under
[`docs/examples/variables-and-templating/`](../examples/variables-and-templating/).

## Two namespaces, disjoint by token shape

The composer recognises two kinds of `{{…}}` tokens:

| Shape | Namespace | Where it resolves |
| :--- | :--- | :--- |
| `{{<name>}}` (no dot) | **Plugin vars** — always-on, computed per launch | Launch context only — see registry below. |
| `{{vars.<name>}}` | **User vars** — author-declared, optional | Module → Global → Project → Launch precedence. |

The shapes are intentionally disjoint. Writing `{{vars.id}}` does *not*
shadow the plugin's `{{id}}`; they're different tokens. This is by
design — it means a module author can declare a user var named
`id`, `branch`, or `today` without colliding with the always-on
registry.

## The plugin-var registry

Every always-on var ships in
[`plugins/op-obsidian/src/pluginVarRegistry.ts`](../../plugins/op-obsidian/src/pluginVarRegistry.ts);
the table below mirrors it. **This list is the single source of truth.**
Adding a new always-on var means one entry in the registry — every
surface (renderer, autocomplete, settings panel, `op-list-vars` CLI,
generated reference docs) reads from there.

| Group | Var | What it resolves to | Example |
| :--- | :--- | :--- | :--- |
| **Issue identity** | `{{id}}` | The issue's canonical id from frontmatter. | `OP-212` |
|  | `{{title}}` | The issue's title. | `10b: Authoring tutorials with checked-in examples` |
|  | `{{slug}}` | Branch-safe kebab slug derived from `title` (lowercased, capped at 40 chars on a `-` boundary, leading `NN[a-z]?:` task-prefix stripped). Pair with `{{id}}` for branch suggestions. | `authoring-tutorials-with-checked-in` |
|  | `{{project}}` | The project slug the issue belongs to. | `obsidian-projects` |
|  | `{{status}}` | Lifecycle status. | `in-progress` |
|  | `{{priority}}` | Priority — undefined when not set. | `med` |
| **Issue links** | `{{parent}}` | Parent issue id, or the prose sentinel `(none — this is a top-level issue)` when there's no parent. | `OP-193` |
|  | `{{pr_url}}` | PR URL once one exists; undefined before. | `https://github.com/.../pull/272` |
|  | `{{github_issue}}` | Mirrored GH issue URL when GH-linked. | `https://github.com/.../issues/250` |
| **Repo / vault** | `{{repo_path}}` | Absolute path to the project's code repo; undefined for meta-only projects. | `/Users/you/Projects/obsidian-projects` |
|  | `{{vault_path}}` | Absolute path to the active vault. | `/Users/you/work/Agent-Vault` |
|  | `{{vault_name}}` | Display name of the active vault. | `Agent-Vault` |
|  | `{{branch}}` | Git branch the agent is on; undefined before the worktree exists. | `worktree-OP-212` |
| **Run context** | `{{today}}` | ISO `YYYY-MM-DD`, computed by the launching surface. | `2026-04-26` |
|  | `{{agent}}` | Agent id launching this session. | `claude` |
|  | `{{model}}` | Resolved model id; undefined when the agent doesn't pick one per launch. | `claude-opus-4-7` |
|  | `{{mode}}` | Launch mode (the step name). | `kickoff`, `review`, `finalize` |

A token whose `compute` returns `undefined` (e.g. `{{branch}}` before
the worktree exists, `{{pr_url}}` before the PR opens) **is left
verbatim** in the rendered prompt and a `missing-var` diagnostic
fires. Soft failure — never silent corruption. If your module is
reading vars that may be undefined at the launch you care about, write
the prose so the surrounding sentence still parses (e.g. "PR:
{{pr_url}}" reads fine when the URL is missing because the user can
see what's missing).

The full registry — including descriptions and examples surfaced in the
Settings → Workflows reference panel — is in
[`pluginVarRegistry.ts`](../../plugins/op-obsidian/src/pluginVarRegistry.ts).
The auto-generated reference docs (10c) will pull from the same source.

## User vars and the precedence chain

A user var is anything you declare in a module's `vars:` block:

```yaml
vars:
  - "package_name=op-obsidian"
  - { name: docs_dir, default: "docs", description: "..." }
  - reviewer_handle
```

References to `{{vars.package_name}}` in any module body — at any scope
in any module — go through the **four-layer precedence chain**, lowest
to highest, latest wins:

```
   Module default     ────►   The `vars: [name=value]` shorthand on
                              the module that *declares* the variable.
                              The lowest precedence; functions as a
                              "if nothing else supplies a value, fall
                              back to this".

   Global default     ────►   `settings.workflowVars` — vault-wide,
                              edited in Settings → Workflows. Shadows
                              every module default.

   Project default    ────►   `Projects/<slug>/STATUS.md` `vars:` map.
                              Per-project, shadows globals.

   Launch override    ────►   The "Workflow variables" launch panel
                              (also: URI `var.<name>=<value>` query
                              params, headless launch context). Wins
                              over everything below.
```

A useful way to think about it: layers 1–3 describe **what the project
agrees on**; layer 4 is **what's true for this one run**. Layers 1–3
should change rarely; layer 4 is ephemeral.

The launch preview's per-var "from M / G / P / L" badge tells you
*which* layer supplied each rendered value — so authors can verify the
chain resolved the way they expected before launch.

### Inline defaults — `name=VALUE` shorthand

The shorthand form

```yaml
vars:
  - "package_name=op-obsidian"
```

is equivalent to:

```yaml
vars:
  - { name: package_name, default: "op-obsidian" }
```

The first `=` splits name from value. `name=` (no value) is *not* the
same as bare `name` — it explicitly defaults to the empty string,
which is distinct from "the caller must supply a value". Subsequent
`=` characters in the value are part of the value verbatim
(`expr=a=b=c` parses to `name=expr`, `value=a=b=c`).

**Watch out for the YAML auto-coercion gotcha.** A bare
`- 2026-04-25` becomes a `Date`, not a string, and the loader rejects
it with `malformed-frontmatter`. Quote the value (`'2026-04-25'`) or
use the shorthand (`due=2026-04-25`) to keep it as a string.

### Why declare vars at all?

Declaring vars in `vars:` does three things the composer relies on:

1. **The composer knows where the value's module-default came from.**
   Without a declaration, a `{{vars.foo}}` token whose value isn't set
   anywhere fires `malformed-frontmatter` ("undeclared but
   referenced") rather than `missing-var` ("declared somewhere but no
   layer supplied a value").
2. **The intra-scope-collision validator can run.** Two modules at the
   same scope declaring the same var name (with module defaults) is an
   authoring bug — different module defaults mean unpredictable
   composition. The loader catches this at load time.
3. **The import flow knows which vars to prompt for.** `op-import-module`
   reads `vars:` and, for each declared var that has no value at any
   higher-precedence scope in the target vault, prompts the user for a
   value before landing the module. The shorthand default pre-fills
   the prompt; bare declarations get an empty prompt.

## Walking through the example

The two modules in
[`docs/examples/variables-and-templating/`](../examples/variables-and-templating/)
demonstrate every form together.

### `version-cadence.md` — shorthand default + plugin vars

```yaml
---
id: version-cadence
title: Version bump cadence
type: workflow-module
scope: kickoff
order: 20
vars:
  - "package_name=op-obsidian"
---

After every change to `plugins/{{vars.package_name}}/`, run
`node scripts/bump-version.mjs <patch|minor|major>` so the manifest,
package, and plugin JSON files move in lockstep. Pick the bump level by
judgment: patch = fix, minor = additive, major = breaking. Today is
{{today}}.
```

`{{vars.package_name}}` resolves to `op-obsidian` from the module
default. `{{today}}` is a plugin var supplied by the launch context —
the launching surface stamps it as ISO `YYYY-MM-DD`.

A second project that ships a different package (say, `op-cli`) doesn't
fork this module. Instead, the project's `STATUS.md` sets
`vars: { package_name: op-cli }` and the project-default layer wins
over the module default — same module, different rendered prompt.

### `repo-paths.md` — object-form default + bare var + multiple plugin vars

```yaml
---
id: repo-paths
title: Where to find code in this repo
type: workflow-module
scope: kickoff
order: 30
vars:
  - { name: docs_dir, default: "docs", description: "..." }
  - reviewer_handle
---

You're working on **{{id}}** ({{title}}) on branch `{{branch}}`. Code
lives under `{{repo_path}}`. Documentation lives under
`{{repo_path}}/{{vars.docs_dir}}` ...

When the PR is ready for adversarial review, tag
`{{vars.reviewer_handle}}` ...
```

Two user vars and four plugin vars. The interesting one is
`reviewer_handle`: bare, no module default. If neither global, project,
nor launch supplies a value, the composer fires `missing-var`
(warning) and the body renders `{{vars.reviewer_handle}}` literally.

That's the design point of bare vars: **they make the requirement
explicit**. Anyone reading the module knows the project hosting it must
supply a `reviewer_handle` — and the diagnostic surface tells the
operator before launch.

### Composing both modules together

The example workflow file at
[`docs/examples/variables-and-templating/Projects/tutorial-project/WORKFLOW.md`](../examples/variables-and-templating/Projects/tutorial-project/WORKFLOW.md)
puts both modules at `kickoff`:

```yaml
steps:
  - step: kickoff
    modules: [version-cadence, repo-paths]
```

Run **op: explain workflow** with `mode=kickoff` (or expand the launch
preview) and you see the two bodies concatenated in `order:` order
(20, then 30) with all the substitutions applied. The dry-run preview
header line tallies the chunk count and diagnostic count — the goal is
0 diagnostics.

## When the value should live where

Quick decision flow for "where do I set this var":

- **Just for one launch** — Workflow-variables panel in the launch
  modal, or the URI `var.<name>=<value>` param. The override applies
  to this run only and disappears.
- **Just for one project, persistently** — `Projects/<slug>/STATUS.md`
  `vars:` map. Lives next to the project's other config; survives
  across launches; doesn't leak to other projects.
- **For every project in the vault** — Settings → Workflows →
  *Workflow vars* (writes `settings.workflowVars`). One value, every
  project picks it up unless overridden.
- **For every vault that imports the module** — module default
  (`name=VALUE` shorthand or `{ default: VALUE }` object form). The
  fallback when nothing else supplies a value, and the seed for the
  import-time prompt.

A useful heuristic: **the more places a var should "just work", the
lower-precedence the layer you set it at.** Module default = "applies
anywhere this module lands"; launch override = "applies only here, only
now".

## Common mistakes the loader catches

| Symptom | Likely cause | Diagnostic code |
| :--- | :--- | :--- |
| Token renders literally as `{{vars.foo}}` | No layer supplied a value, or the var wasn't declared in any module | `missing-var` (warning) or `malformed-frontmatter` (warning, "undeclared but referenced") |
| Module dropped at load | `vars:` declared the same name twice in one module | `malformed-frontmatter` |
| Module dropped at load | Bare entry in `vars:` is a `Date` (e.g., `- 2026-04-25` parsed by YAML as a date) | `malformed-frontmatter` |
| Two modules collide on a var | Both at the same `scope:` declaring the same name with defaults | `intra-scope-collision` |
| Token renders literally as `{{branch}}` | The launch context didn't supply a branch (e.g., worktree not yet created) | `missing-var` (warning) |
| Var declaration with `defualt:` typo doesn't take effect | Object-form key misspelled (the loader silently accepts unknown keys for forward-compat) | None — review the spelling manually |

Run `obsidian op-list-vars project=<slug> issue=<id>` to dump the full
resolved chain for a given issue/launch — every plugin var and every
declared user var, with their resolved values and the supplying scope.
That CLI is the fastest way to confirm a var resolves the way you
expected before you launch the agent.

## Where to next

- [01 — Workflow modules overview](./01-overview.md) revisits the
  precedence chain alongside the storage layout — useful as a refresher
  once you've authored a few modules with vars.
- [`docs/specs/workflow-module-schema.md`](../specs/workflow-module-schema.md)
  is the full `vars:` parser contract: every form (`bare`, `default`,
  `object`), every edge case (YAML auto-coercion, empty defaults, the
  first-`=` split rule), every diagnostic.
- [`pluginVarRegistry.ts`](../../plugins/op-obsidian/src/pluginVarRegistry.ts)
  is the canonical list of always-on plugin vars. When 10c lands, the
  auto-generated reference docs will inline the registry verbatim;
  until then this file is the source of truth.
