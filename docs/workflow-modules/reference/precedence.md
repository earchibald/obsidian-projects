# Precedence — Module / Global / Project / Launch

Workflow-module composition resolves variable values through a
four-layer precedence chain. **Later layers shadow earlier ones**:

```
   Module      (lowest precedence — module's own `vars:` defaults)
   ▼
   Global      (vault-wide user vars, settings.workflowVars)
   ▼
   Project     (per-project user vars, STATUS.md `vars:` map)
   ▼
   Launch      (per-launch overrides — UI, URI, CLI)  (highest precedence)
```

Two distinct token namespaces live on top of this:

- **Plugin vars** — `{{id}}`, `{{branch}}`, `{{today}}`, … live
  exclusively at **Launch**. They are computed per-launch from the
  render context and shadow any same-named lower-precedence value. See
  [`plugin-vars.md`](./plugin-vars.md).
- **User vars** — `{{vars.<name>}}` walk the full chain above. They
  are declared by modules and bound by Global / Project / Launch
  layers.

The two namespaces are disjoint by token shape (`{{id}}` vs.
`{{vars.id}}`), so a user-named var can never accidentally shadow a
plugin var like `{{branch}}`.

## Layer 1 — Module (defaults declared with the module)

A module's `vars:` list may carry inline defaults. These are the
lowest-precedence binding for that variable name.

```yaml
# Projects/_op-modules/welcome.md
vars:
  - greeting=hello
  - target=world
```

```
Module body: "{{vars.greeting}}, {{vars.target}}!"
Rendered:    "hello, world!"
```

If a different module at the same scope also declares the same name
with a default, that's an `intra-scope-collision` diagnostic — the
schema treats two modules at one scope owning the same var as a
conflict. Across **different** scopes the same name is fine.

If only one module declares the var, its default is the value seen
when no higher layer binds anything.

## Layer 2 — Global (vault-wide)

Global user vars live in the plugin settings (`settings.workflowVars`)
and apply to every project. Use them for values that are
vault-personal but project-stable: your name, your default reviewer,
your preferred PR template path.

```
settings.workflowVars = { greeting: "hi", reviewer: "@earchibald" }
```

```
Module body: "{{vars.greeting}}, {{vars.target}}! cc {{vars.reviewer}}"
Rendered:    "hi, world! cc @earchibald"
```

Note: `target` is still resolved from the module default (`"world"`)
because the global layer didn't bind it; `greeting` is shadowed.

## Layer 3 — Project (per-project)

Per-project user vars live in `STATUS.md`'s frontmatter `vars:` map and
apply only to issues in that project. Use them for values the project
varies on but the rest of your vault doesn't care about: a project's
package name, its CI workflow id, its primary slack channel.

```yaml
# Projects/obsidian-projects/STATUS.md
vars:
  pkg: op-obsidian
  reviewer: "@plugin-reviewers"
```

```
Module body: "Building {{vars.pkg}}, cc {{vars.reviewer}}"
Rendered:    "Building op-obsidian, cc @plugin-reviewers"
```

The `reviewer` from Project shadows Global; `pkg` was unbound at
Module/Global so Project supplies it.

## Layer 4 — Launch (per-launch overrides)

Launch overrides come from whatever launch surface you used:

- **Launch modal** — the "Vars" section of `op-open-agent` lets you
  override any var for this single launch.
- **`obsidian://op-open-agent` URI** — `&var.<name>=<value>` query
  params (URL-encoded).
- **CLI** — `obsidian op-open-agent var.<name>=<value> …`.

Launch wins over everything below.

```
launch override: { reviewer: "@hot-fix-reviewer" }
```

```
Module body: "Building {{vars.pkg}}, cc {{vars.reviewer}}"
Rendered:    "Building op-obsidian, cc @hot-fix-reviewer"
```

`pkg` still comes from Project (no launch override); `reviewer` is now
the launch value, even though Global and Project both bound it.

## Combined worked example

Let's resolve every layer at once.

**Sources:**

```yaml
# Projects/_op-modules/welcome.md  (Module)
vars:
  - greeting=hello
  - target=world
  - reviewer=
```

```
settings.workflowVars                 # Global
  greeting: hi
  reviewer: "@earchibald"
```

```yaml
# Projects/obsidian-projects/STATUS.md  (Project)
vars:
  pkg: op-obsidian
  reviewer: "@plugin-reviewers"
```

```
launch overrides                      # Launch
  reviewer: "@hot-fix-reviewer"
```

**Module body:**

```
Hi {{vars.greeting}} — building {{vars.pkg}} for {{vars.target}}, cc {{vars.reviewer}}.
```

**Resolution per var:**

| Var | Module | Global | Project | Launch | Resolved |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `greeting` | `hello` | `hi` | _unbound_ | _unbound_ | **`hi`** (Global) |
| `target` | `world` | _unbound_ | _unbound_ | _unbound_ | **`world`** (Module) |
| `pkg` | _undeclared_ | _unbound_ | `op-obsidian` | _unbound_ | **`op-obsidian`** (Project) |
| `reviewer` | `` (empty default) | `@earchibald` | `@plugin-reviewers` | `@hot-fix-reviewer` | **`@hot-fix-reviewer`** (Launch) |

**Rendered:**

```
Hi hi — building op-obsidian for world, cc @hot-fix-reviewer.
```

## What the dry-run preview shows

The launch modal's "▶ Composed prompt preview" disclosure renders the
final string. The same data is available structurally — the composer
returns a `perVarSourceMap` whose entries record both the resolved
value **and** the supplying scope (`module` / `global` / `project` /
`launch`). Surfaces that want to display "this value came from
Project, not Module" read the source map directly.

## Edge cases

- **Bare module declaration with no upper-layer binding.** A module
  declaring `- foo` (bare, no default) leaves `{{vars.foo}}` unbound
  if no Global / Project / Launch layer supplies it. The renderer
  emits `missing-var` (warning) and leaves the literal token in the
  rendered output. Never aborts — soft failure.
- **Undeclared-but-referenced.** A module body that mentions
  `{{vars.bar}}` without any module ever declaring `bar` is a
  separate diagnostic (`malformed-frontmatter` warning) — distinct
  from "declared somewhere but no value resolved". This catches typos
  early.
- **Plugin-var name collision.** A user var named `id` would still
  render as a separate token because the plugin-var token is `{{id}}`
  but the user-var token is `{{vars.id}}`. Both are valid; they are
  not the same token.

## See also

- [`plugin-vars.md`](./plugin-vars.md) — every always-on plugin var
  surfaced at the Launch layer.
- [`module-schema.md`](./module-schema.md) — `vars:` declaration
  shapes (bare / shorthand / object).
- [`workflow-schema.md`](./workflow-schema.md) — `extends:` and
  per-step `agent:`/`model:` overrides (these are workflow-level
  overrides, not user-var overrides — they sit alongside this chain).
