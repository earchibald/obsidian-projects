# Workflow Modules — Example Library

Each subdirectory under this folder mirrors the layout of a real Obsidian
vault. Copy any subtree into your own vault (under the same paths) and the
files work verbatim — they're the canonical examples the tutorials in
[`docs/workflow-modules/`](../workflow-modules/) walk through, and they
ship to CI to keep the docs from drifting away from the engine.

## What's here

| Subtree | Backs | What it shows |
| :--- | :--- | :--- |
| [`author-first-module/`](./author-first-module/) | Tutorial: [03 — Author your first module](../workflow-modules/03-author-your-first-module.md) | A single global module, no vars, no workflow file. The minimum viable file. |
| [`compose-first-workflow/`](./compose-first-workflow/) | Tutorial: [04 — Compose your first workflow](../workflow-modules/04-compose-your-first-workflow.md) | Global default workflow + a per-project workflow that `extends:` it, with two modules and a per-step agent override. |
| [`variables-and-templating/`](./variables-and-templating/) | Tutorial: [05 — Use variables and templating](../workflow-modules/05-variables-and-templating.md) | Plugin vars (`{{branch}}`, `{{today}}`, `{{repo_path}}`), user vars (`{{vars.package_name}}`), `name=VALUE` inline defaults, and the precedence chain in action. |
| [`workflow-library/`](./workflow-library/) | Curated reusable library | Eight `vars:`-driven modules distilled from this project's `WORKFLOW.md` (branching, tmux safety, PR-required, version cadence, GH issue close, adversarial review, commit mapping, orient) plus three reference workflows (global default + extends-default + standalone docs-only). Copy into your own vault to bootstrap a project. |

## How the layouts map onto your vault

Every example's top folder *is* a vault root — paths inside it line up 1:1
with where the loader expects to find files in your own vault.

| Path inside an example | Path inside your real vault | Purpose |
| :--- | :--- | :--- |
| `Projects/_op-modules/<id>.md` | `<vault>/Projects/_op-modules/<id>.md` | Global module — applies to every project. |
| `Projects/<slug>/MODULES/<id>.md` | `<vault>/Projects/<slug>/MODULES/<id>.md` | Per-project module — applies to one project; shadows a same-id global. |
| `Projects/<slug>/WORKFLOW.md` | `<vault>/Projects/<slug>/WORKFLOW.md` | Per-project workflow — picks the step list, can `extends:` a global default. |
| `Projects/_op-workflow.md` | `<vault>/Projects/_op-workflow.md` | Global default workflow — referenced from per-project files via `extends:`. |

The slug `tutorial-project` is a placeholder — replace it with your own
project's slug when you copy the files in. The two paths to update inside
the file contents are `project: tutorial-project` (workflow file
frontmatter) and any in-prose project references.

## Verifying an example

Once the files are in your vault, run **op: explain workflow** from the
command palette (or `obsidian op-explain-workflow id=<your-issue-id>
mode=kickoff`) and read the diagnostics block. Zero diagnostics means the
example loaded and composed cleanly; any diagnostic surfaces here as a
short row with the offending file and a one-line `code: …` description.

CI runs the same check against every file in this folder via
`plugins/op-obsidian/src/docsExamples.test.ts`. If you edit an example and
break it, that test goes red — and so does the merge gate.

## Reading the schema reference alongside

The tutorials are the prose; the spec docs are the contract:

- [`docs/specs/workflow-module-schema.md`](../specs/workflow-module-schema.md)
  — every frontmatter field on a module file, every diagnostic code, every
  edge case in the `vars:` parser.
- [`docs/specs/workflow-file-schema.md`](../specs/workflow-file-schema.md)
  — workflow file format, `extends:` rules, model registry, the legacy
  `WORKFLOW.md` fallback ladder.

When in doubt, the spec wins.
