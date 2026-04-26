# Workflow Module Schema

Status: shipped in OP-195 (1b of OP-184). Composition (1d/OP-197) consumes
loaded modules; this doc covers the file format and load behavior only.

## What a module is

A workflow module is a markdown file whose frontmatter declares a partition of
the composed workflow — typically a step (or set of steps) that should be
spliced into a larger workflow at a named scope. Composition stitches modules
together; **this doc covers the file format only**, not how composition works.

## Where modules live

| Location | Path | Applies to |
| :--- | :--- | :--- |
| Global | `Projects/_op-modules/<id>.md` | Every project. |
| Per-project | `Projects/<slug>/MODULES/<id>.md` | Only project `<slug>`. |

`<id>` is the module id. **The filename basename must match the `id:`
frontmatter field exactly.** A file named `review-and-merge.md` must declare
`id: review-and-merge`. Mismatches emit `malformed-frontmatter` diagnostics
and the module is dropped.

Files outside these two layouts are ignored — including subdirectories. A
file at `Projects/_op-modules/sub/foo.md` is **not** loaded.

## Frontmatter contract

```yaml
---
id: review-and-merge       # required, must match the filename basename
title: "Review and merge"  # required
type: workflow-module      # required, exact literal
scope: pre-commit          # required string — partition key for collision check
project: obsidian-projects # optional — restrict to one project (slug)
agent: claude              # optional — restrict to one agent id
order: 10                  # optional integer (default 0) — sort key within a scope
vars:                      # optional list of VarDecl
  - foo                    # bare
  - bar=baz                # default-shorthand
  - qux=                   # explicit empty default (distinct from bare)
  - { name: pkg, default: op-obsidian, description: "Package name" }
---

# Module body (prose / template)

The body is opaque to OP-195 — composition (1d) renders it through the
generic {{var}} template engine from OP-194.
```

### Required fields

- **`id`** (string) — module id, must match the filename basename.
- **`title`** (string) — human-readable title.
- **`type`** (literal `workflow-module`) — anything else is ignored by the
  loader.
- **`scope`** (string) — partition key. Two modules at the same scope that
  declare the same variable name trigger an `intra-scope-collision`
  diagnostic. The set of valid scope names is open-ended; conventions emerge
  with the workflow surfaces 1d wires up.

### Optional fields

- **`project`** (string) — restricts a global module to a specific project
  slug. Per-project modules already live under their slug, so they don't need
  this field; if set, the value should match the enclosing slug or the module
  is filtered out at load time. An empty or whitespace-only value (`project:
  ""`) is silently treated as absent — the field is ignored and the module
  applies to all projects.
- **`agent`** (string) — restricts the module to a specific agent id
  (`claude`, `gemini`, `copilot`, custom). Loader doesn't filter on this
  today; consumers may apply it. Same empty-string rule as `project`.
- **`order`** (integer, default `0`) — sort key within a scope.
- **`vars`** (list of `VarDecl`) — see below.

## `vars:` declarations

Each entry in `vars:` is a single `VarDecl`. Three shapes:

### Bare

```yaml
vars:
  - pkg
```

Just a variable name. The composer (1d) must satisfy this from a higher-
precedence source, or it surfaces a diagnostic.

### Default-shorthand

```yaml
vars:
  - bar=baz       # default value "baz"
  - qux=          # default value "" (empty string — explicit)
  - expr=a=b=c    # only the FIRST = splits; value is "a=b=c"
  - due=2026-04-25  # value is the string "2026-04-25"
```

The first `=` splits name from default value. The empty-default form
(`name=`) is intentionally distinct from the bare form: bare means "the
caller must supply a value"; empty-default means "the default is the empty
string".

**Value whitespace is preserved verbatim.** `bar=  hi  ` yields a default
of `"  hi  "` (two leading spaces, two trailing). If your intent is "empty
default", write `bar=` (no trailing space). Spaces inside the name
segment (before `=`) are trimmed, but spaces in the value segment
(after `=`) are not.

#### YAML auto-coercion gotcha

YAML coerces some bare scalars to non-string types — most commonly ISO dates
to `Date`. The shorthand form sidesteps this because the `=` keeps the entry
parse-as-string. **A bare** `- 2026-04-25` **becomes a `Date` and is
rejected** with a diagnostic that points at the offending entry. Quote the
value (`'2026-04-25'`) or use the shorthand (`name=2026-04-25`) to keep it as
a string.

The same rule applies inside object form: `default: 2026-04-25` (no quotes)
is a `Date` and is rejected; `default: '2026-04-25'` is fine.

### Object form

```yaml
vars:
  - name: pkg
    default: op-obsidian
    description: Package name to install
```

`name:` is required and must be a non-empty string. `default:` and
`description:` are optional and must be strings. Unknown keys are tolerated
(forward-compat for future fields like `enum:` or `required:`).

**Watch out for typos.** `defualt:` vs `default:` won't emit an error —
unknown keys are silently accepted. If a default value appears to be
ignored, double-check the key spelling.

### Var name identifiers

Variable names are not validated against an identifier regex at parse time.
However, the OP-194 renderer uses `[a-zA-Z_][a-zA-Z0-9_]*` to match
`{{var}}` placeholders — names containing hyphens or starting with a digit
will parse and load successfully but will **not** be expanded by the renderer.
Use names that match `[a-zA-Z_][a-zA-Z0-9_]*` for full compatibility.

### Duplicate names

Two entries declaring the same `name` within one module is a
`malformed-frontmatter` diagnostic. The first declaration wins; later
duplicates are dropped from the module's loaded `vars`.

## Diagnostics

| Code | When | Severity |
| :--- | :--- | :--- |
| `malformed-frontmatter` | Missing/wrong-type required field, id-vs-filename mismatch, invalid `VarDecl`, duplicate var name within one module, vars list isn't an array, or YAML coerced a value to a non-string type. | error |
| `intra-scope-collision` | Two or more modules at the same `scope:` declare the same variable name (after per-project shadowing). | error |

Diagnostics carry `moduleId` (the module's id), `varName` (when applicable),
and `extra.path` (the source file path). The composer (1d) surfaces them
verbatim through the unified diagnostic stream.

## Shadowing

A per-project module shadows a same-id global module. **Only the per-project
copy is loaded; the global is discarded silently** — no diagnostic.

This is by design: a project can override or disable a shipped global module
by adding a same-id file under `Projects/<slug>/MODULES/`. **Watch out** —
this can be surprising. If a global module appears to have stopped applying
to one project, check whether that project has a same-id file shadowing it.

A future settings UI (out of scope here) may surface the shadowing relationship
visually so users don't have to spelunk the filesystem.

## Loading order

The IO loader (`loadModules` in `plugins/op-obsidian/src/workflowModule.ts`):

1. Walks every markdown file under `Projects/`.
2. Buckets each file as global (matching `Projects/_op-modules/<id>.md`,
   one level deep) or per-project (matching `Projects/<slug>/MODULES/<id>.md`,
   one level deep below `MODULES/`).
3. Reads each file's frontmatter via Obsidian's `metadataCache`. Files with
   missing or invalid frontmatter emit `malformed-frontmatter` diagnostics
   and are dropped.
4. Applies shadowing — per-project copies overwrite same-id globals.
5. Optionally filters by `opts.project` (drops globals carrying a `project:`
   field that doesn't match the requested slug).
6. Runs intra-scope collision validation across the surviving set.

The loader returns `{ modules, diagnostics }`; composition (1d) consumes both.

## What's NOT in this issue

- Composition: how modules combine into a workflow per `scope` and `order`.
  See OP-197 (1d).
- Workflow file schema, `extends:`, `modelRegistry`, legacy `WORKFLOW.md`
  fallback. See OP-196 (1c).
- User-var resolution (`{{vars.<name>}}` in templates). The OP-194 renderer
  ignores the `vars.` namespace; 1d wires the loaded `VarDecl[]` into the
  render context.
