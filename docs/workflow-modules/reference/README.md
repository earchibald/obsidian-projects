# Workflow Modules — Reference

This folder holds the canonical reference for the workflow-modules
subsystem. Three categories of page:

- **Auto-generated tables** that ride alongside hand-written prose. The
  tables come from a registry source in `plugins/op-obsidian/src/` and
  are kept in sync by `scripts/check-workflow-docs.mjs`. Editing the
  table by hand will be undone the next time the script runs.
- **Hand-written cheat-sheets** that point at the canonical specs in
  `docs/specs/` for the deep field-by-field contract.
- **Hand-written precedence and tag references** that explain how the
  pieces compose at runtime.

## Pages

- [`plugin-vars.md`](./plugin-vars.md) — every always-on plugin variable
  the renderer surfaces (`{{id}}`, `{{title}}`, `{{branch}}`, …),
  generated from `pluginVarRegistry.ts`.
- [`module-schema.md`](./module-schema.md) — workflow-module frontmatter
  cheat-sheet and diagnostic codes. Points at
  [`workflow-module-schema.md`](../../specs/workflow-module-schema.md)
  for the canonical contract.
- [`workflow-schema.md`](./workflow-schema.md) — workflow-file frontmatter
  cheat-sheet, plus the auto-generated **model registry** of allowed
  per-agent aliases and canonical versioned ids. Points at
  [`workflow-file-schema.md`](../../specs/workflow-file-schema.md) for
  the canonical contract.
- [`precedence.md`](./precedence.md) — the four-layer precedence chain
  (Module → Global → Project → Launch) with worked examples for each
  layer.
- [`scope-tags.md`](./scope-tags.md) — the conventional `scope:` values
  (`kickoff`, `mode:*`, `always`) and the gating fields (`agent:`,
  `project:`).

## How regeneration works

```
$ node scripts/check-workflow-docs.mjs
unchanged docs/workflow-modules/reference/plugin-vars.md
unchanged docs/workflow-modules/reference/workflow-schema.md
```

The generator reads `pluginVarRegistry.ts` and `modelRegistry.ts` as
text, pulls the literal initializer entries via narrow regexes, and
rewrites each page between paired sentinel comments:

```
<!-- AUTO-GENERATED:plugin-vars-table -->
| Variable | Example | Description |
…
<!-- /AUTO-GENERATED:plugin-vars-table -->
```

Every other byte of the page is hand-written and never touched by the
script. To edit a table by hand, edit the registry source — the table
is the projection.

## CI guard

`.github/workflows/op-obsidian-pr-checks.yml` runs the script in
`--check` mode whenever a PR touches the registry sources, the script
itself, or any reference page. The check regenerates and then
`git diff --exit-code`s — drift fails CI with the offending diff and
the exact recovery command.

To regenerate locally before pushing:

```
node scripts/check-workflow-docs.mjs
git add docs/workflow-modules/reference/
```
