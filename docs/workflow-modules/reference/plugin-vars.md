# Plugin variables — full reference

Plugin variables (also called *always-on vars*) are the named values
the workflow renderer substitutes into every module body without the
author having to declare them. They live exclusively at the
**Launch-override** layer of the precedence chain — every plugin var is
computed per-launch from the launch context and shadows any same-named
lower-precedence value. Module-declared user vars (`{{vars.<name>}}`)
are a separate namespace, distinguished by token shape; the renderer
never confuses them.

The single source of truth is
`plugins/op-obsidian/src/pluginVarRegistry.ts`. The table below is
**generated** from that file — to add, remove, or rename a variable,
edit the registry and run:

```
node scripts/check-workflow-docs.mjs
```

## How vars are spelled in module bodies

```
The issue id is {{id}} — branch is {{branch}}, today is {{today}}.
```

- Token shape is `{{<name>}}` with optional whitespace inside the
  braces (`{{ id }}` works too).
- Names are case-sensitive.
- A token whose name is **not** in the registry below leaves the
  literal `{{name}}` in the rendered output and emits a `missing-var`
  diagnostic.
- Some vars are **always populated** for any launch (`id`, `title`,
  `today`, `agent`, `mode`); others are populated only when the launch
  context can supply them (`branch` is empty before the worktree
  exists; `pr_url` is empty before the PR opens). Optional vars whose
  source is missing render as the literal `{{name}}` and emit
  `missing-var` — that's a soft failure: the workflow does not abort.

## Registry

<!-- AUTO-GENERATED:plugin-vars-table -->
| Variable | Example | Description |
| :--- | :--- | :--- |
| `{{id}}` | `OP-194` | The issue's canonical id (e.g., OP-194). |
| `{{title}}` | `Generic {{var}} renderer + context builder` | The issue's title from its frontmatter. |
| `{{project}}` | `obsidian-projects` | The project slug the issue belongs to. |
| `{{status}}` | `in-progress` | The issue's lifecycle status (open, in-progress, blocked, resolved, wontfix). |
| `{{priority}}` | `high` | The issue's priority (low, med, high) — undefined if not set. |
| `{{slug}}` | `add-slug-plugin-var-extract-shared` | Branch-safe kebab-cased slug derived from `title` (lowercase, capped at 40 chars on a `-` boundary, leading `NN[a-z]?:` task-prefix stripped) — undefined if `title` collapses to empty. |
| `{{parent}}` | `OP-184` | The parent issue id from frontmatter, or `(none — this is a top-level issue)` when no parent is set. |
| `{{pr_url}}` | `https://github.com/earchibald/obsidian-projects/pull/232` | The pull-request URL once the issue has one — undefined before the PR opens. |
| `{{github_issue}}` | `https://github.com/earchibald/obsidian-projects/issues/232` | The mirrored GitHub issue URL when the issue is GH-linked — undefined when local-only. |
| `{{repo_path}}` | `/Users/you/Projects/obsidian-projects` | Absolute path to the project's code repository — undefined for meta-only projects. |
| `{{vault_path}}` | `/Users/you/work/Agent-Vault` | Absolute path to the active Obsidian vault. |
| `{{vault_name}}` | `Agent-Vault` | Display name of the active Obsidian vault. |
| `{{branch}}` | `worktree-OP-220-add-slug-plugin-var-and-extract-shared` | The git branch the agent is operating on — undefined before the worktree exists or for meta-only projects. |
| `{{today}}` | `2026-04-26` | Today's date in ISO YYYY-MM-DD form, computed by the launching surface. |
| `{{agent}}` | `claude` | The agent id launching this session (claude, gemini, copilot). |
| `{{model}}` | `claude-opus-4-7` | The resolved model id for this launch — undefined if the agent has no per-launch model selection. |
| `{{mode}}` | `implement` | The launch mode (evaluate, plan, implement, review, finalize). |

Sentinel for an issue with no parent: **`(none — this is a top-level issue)`** — emitted as the rendered value of `{{parent}}` when the issue's frontmatter has no `parent:` field.
<!-- /AUTO-GENERATED:plugin-vars-table -->

## Why a sentinel, not an empty string

`{{parent}}` is special: a top-level issue genuinely has no parent, but
emitting an empty string for the var would produce dangling prose like
"the parent is ." in any module that references it. The registry
substitutes a human-readable sentinel instead, so module authors don't
have to write conditional templates and so agents reading the rendered
prompt see a clear "this is a top-level issue" signal rather than an
unrendered `{{parent}}` token or an empty hole.

If you author a module that needs to behave differently for top-level
vs. parented issues, branch on the sentinel string in your prose
("when applicable, mention the parent issue ({{parent}}); for
top-level issues, the value will read `(none — this is a top-level
issue)`") rather than expecting an empty render.

## Adding a new always-on var

1. Add an entry to `PLUGIN_VAR_REGISTRY` in
   `plugins/op-obsidian/src/pluginVarRegistry.ts`. The keys, in order,
   are `name`, `description`, `example`, `compute`.
2. If the var draws on a value not already in `RenderContext`, add the
   field to that interface and to `LaunchContext` if it's per-launch,
   then thread it through `buildRenderContext` and the launch
   call-sites.
3. Run `node scripts/check-workflow-docs.mjs` to regenerate the table
   above.
4. Commit the registry change and the regenerated doc together — the
   CI guard rejects partial updates.

## See also

- [`workflow-module-schema.md`](../../specs/workflow-module-schema.md)
  — the full contract for module frontmatter, including how
  module-declared user vars (`{{vars.<name>}}`) interact with plugin
  vars.
- [`precedence.md`](./precedence.md) — where plugin vars sit in the
  four-layer precedence chain and what shadowing rules apply.
