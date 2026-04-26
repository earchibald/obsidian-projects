# Module schema — quick reference

This page is the day-to-day cheat-sheet for authoring a workflow
module. It does **not** repeat every contract detail — for the full
field-by-field rules, error semantics, and shadowing model, see
[`workflow-module-schema.md`](../../specs/workflow-module-schema.md).

## Where modules live

| Location | Path |
| :--- | :--- |
| Global (every project) | `Projects/_op-modules/<id>.md` |
| Per-project (one project only) | `Projects/<slug>/MODULES/<id>.md` |

Files outside these two layouts are ignored. Subdirectories under
either layout are not loaded — keep modules at the top level of their
folder.

## Minimal frontmatter

```yaml
---
id: branching                      # required, must equal the filename basename
title: Branching discipline        # required
type: workflow-module              # required, exact literal
scope: kickoff                     # required — partition key (see scope-tags.md)
order: 10                          # optional integer, default 0 — sort within a scope
project: obsidian-projects         # optional — restrict to one project slug
agent: claude                      # optional — restrict to one agent id
vars:                              # optional list of VarDecl
  - foo                            # bare
  - bar=baz                        # default-shorthand
  - qux=                           # explicit empty default
  - { name: pkg, default: op-obsidian, description: "Package name" }
---

# Module body — opaque markdown rendered through the {{var}} engine.
```

## `vars:` shapes

Three forms; all valid in the same list:

| Shape | Example | Default value |
| :--- | :--- | :--- |
| Bare | `- foo` | _no default_ — caller must supply via Global / Project / Launch |
| Default-shorthand | `- bar=baz` | `"baz"` |
| Empty default-shorthand | `- qux=` | `""` (empty string — distinct from bare) |
| Object | `- { name: pkg, default: op-obsidian, description: "…" }` | `"op-obsidian"` |

Only the first `=` splits — `expr=a=b=c` yields name `expr`, value
`a=b=c`. Whitespace inside the value is preserved verbatim; whitespace
in the name is trimmed.

### YAML auto-coercion gotcha

`- 2026-04-25` parses as a `Date` and is rejected. Quote it
(`'2026-04-25'`) or use the shorthand (`due=2026-04-25`) so it stays a
string. The same applies inside object form (`default: '2026-04-25'`,
not `default: 2026-04-25`).

## Diagnostics

Every loader-emitted error or warning is a `WorkflowDiagnostic`.
Modules can produce these codes:

| Code | When it fires | Severity |
| :--- | :--- | :--- |
| `malformed-frontmatter` | Missing/wrong-type required field, id-vs-filename mismatch, invalid `VarDecl`, duplicate var name within one module, vars list isn't an array, YAML coerced a value to a non-string type. | error |
| `intra-scope-collision` | Two or more modules at the same `scope:` declare the same variable name (after per-project shadowing). | error |

Diagnostics carry `moduleId`, `varName` (when applicable), and
`extra.path` so downstream surfaces can name the offending file.

The canonical home for the full diagnostic list across the whole
subsystem (workflow files included) is the spec at
[`workflow-module-schema.md`](../../specs/workflow-module-schema.md)
and [`workflow-file-schema.md`](../../specs/workflow-file-schema.md).
This table is intentionally hand-written rather than auto-generated:
diagnostic codes are emitted from many call-sites and don't live in a
single registry, so a generator would have to walk the AST. If the
list above drifts from the spec, fix the spec first and propagate
here.

## Identifier rules

- **`id`** must equal the filename basename (without `.md`). A file
  named `review-and-merge.md` must declare `id: review-and-merge`.
  Mismatch is `malformed-frontmatter` and the module is dropped.
- **`scope`** is open-ended — author whatever names you need. The
  composer just buckets modules by scope and stitches them in at the
  matching step. See [`scope-tags.md`](./scope-tags.md) for the
  conventions emerging in shipped fixtures.
- **`vars` names** that contain hyphens or start with a digit will
  load fine but won't be expanded by the renderer (the regex is
  `[a-zA-Z_][a-zA-Z0-9_]*`). Stick to that shape unless you have a
  reason not to.

## Shadowing

A per-project module shadows a same-id global module **silently** —
only the per-project copy is loaded; the global is discarded. Use this
to override or disable a shipped global for one project. If a global
appears to have stopped applying to one project, check whether that
project has a same-id file under `Projects/<slug>/MODULES/`.

## See also

- [`workflow-module-schema.md`](../../specs/workflow-module-schema.md)
  — full contract: every field, every diagnostic, every gotcha.
- [`scope-tags.md`](./scope-tags.md) — what the conventional `scope:`
  values mean and when each fires.
- [`plugin-vars.md`](./plugin-vars.md) — every always-on variable
  available without a `vars:` declaration.
- [`precedence.md`](./precedence.md) — how a module's `vars:` defaults
  interact with Global / Project / Launch overrides.
