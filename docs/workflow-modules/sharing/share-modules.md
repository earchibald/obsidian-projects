# Share Modules Across Vaults

Workflow modules are plain markdown files. They round-trip through git, sync,
copy-paste, and any other mechanism that moves text between machines. The op
plugin ships three thin wrappers — `op-export-module`, `op-import-module`, and
`op-undo-last-import` — that handle the awkward bits of cross-vault sharing:
bundling per-project modules together, prompting for missing variable values,
backing up files we're about to overwrite, and giving you a one-step undo when
you change your mind.

This walkthrough takes you through one full hand-off: a module authored in
**OP-Test** (this repo's clean-room test vault) → exported → imported into
**Agent-Vault** (the daily-driver vault). It's the same flow you'd use to share
a module with a teammate, between two of your own machines, or to keep a global
default in sync across vaults you maintain.

If you haven't read the [conceptual overview](../01-overview.md) yet, the
four-layer precedence chain (Module / Global / Project / Launch) is the model
the import-time variable prompt is built on; skim it first if `{{vars.<name>}}`
references and per-project shadowing don't already feel familiar.

## What the three commands do

All three are available as palette commands, URI handlers, and CLI verbs.

| Command | What it does |
| :--- | :--- |
| `op-export-module` | Writes one module (`id=<id>`) or every module visible to a project (`project=<slug>`) into `Projects/_op-export/`. Single-module exports land at `_op-export/<id>.md`; bundle exports land under `_op-export/<slug>/<id>.md`. |
| `op-import-module` | Reads a module file from a vault path or absolute filesystem path, picks where it lands (global vs per-project), prompts for any `{{vars.<name>}}` references missing at higher precedence, and writes a transaction record to `Projects/_op-import-history/<ts>.json`. |
| `op-undo-last-import` | Reverses the most recent import: trashes the imported module file(s), restores any backed-up originals, prunes only the variables that import added (preserving any that already existed). One-step undo only — older transactions are not stacked. |

Modules live as plain `.md` files; the export step is a convenience wrapper
that re-serializes the module through the same writer the plugin uses
internally, so a malformed source surfaces a clear diagnostic at export time
rather than silently passing through.

## Step 1 — Author a module in OP-Test

Pick something concrete enough to be worth sharing. For this walkthrough we'll
use a `release-checklist` module: a short kickoff-scoped checklist the agent
should run through before tagging a release. We give it one variable —
`release_command` — so the same module body works in any project that
uses it.

`Projects/_op-modules/release-checklist.md` (in OP-Test):

```markdown
---
id: release-checklist
title: Release checklist
type: workflow-module
scope: kickoff
order: 50
vars:
  - { name: release_command, default: "node scripts/release.mjs", description: "Command this project uses to cut a release." }
---

Before tagging a release, run through:

1. `git status` is clean.
2. CHANGELOG entry exists for the new version.
3. `{{vars.release_command}}` runs green locally.
4. The PR that bumped the version has been merged into the default branch.
```

The frontmatter declares one variable (`release_command`) with an inline
default and a one-line description. The body uses `{{vars.release_command}}` —
this is the reference the import flow scans for to decide what to prompt for.

Quick sanity check that OP-Test sees the module:

```bash
obsidian vault=OP-Test op-list-modules | grep release-checklist
# → release-checklist (kickoff, order 50) — Projects/_op-modules/release-checklist.md
```

## Step 2 — Export it from OP-Test

Single-module export, simplest form:

```bash
obsidian vault=OP-Test op-export-module id=release-checklist
```

The command writes `Projects/_op-export/release-checklist.md` and prints a
one-line summary. The full payload (file paths, byte count) lives at
`Projects/_scratch/op-last-response.md` — the canonical place to read
structured output from any op verb.

The exported file is byte-equivalent to the source (frontmatter + body
preserved verbatim, including the `vars:` declarations). You can open it,
diff it against the original, and round-trip it through git unchanged.

If you wanted to export *every* module visible to a project — the project's
own `MODULES/` plus any global modules tagged with `project: <slug>` — pass
`project=<slug>` instead and you'll get a folder bundle:

```bash
obsidian vault=OP-Test op-export-module project=demo
# → Projects/_op-export/demo/<id>.md (one file per module)
```

For a single-module hand-off between vaults, stick with `id=`.

## Step 3 — Move the file to Agent-Vault

Modules are markdown. Anything that moves text between vaults works:

- **Copy** the `.md` file out of OP-Test's `_op-export/` folder and drop it
  anywhere in Agent-Vault — even outside the vault folder is fine; the
  importer accepts absolute paths.
- **Sync** through git, iCloud, Dropbox, etc.
- **Paste** the file content into a new note inside Agent-Vault.

For this walkthrough, copy the file directly into Agent-Vault's vault root:

```bash
cp ~/Documents/OP-Test/OP-Test/Projects/_op-export/release-checklist.md \
   ~/work/Agent-Vault/release-checklist.md
```

The importer doesn't care that the file lives at the vault root rather than
under `Projects/_op-modules/` — that decision is the import step's job, not
the file's. The default landing path is derived from the module's frontmatter
`project:` field (present → per-project, absent → global), and you can
override it with `scope=`.

## Step 4 — Import into Agent-Vault (with the variable prompt)

Now the interesting part. Run the import in Agent-Vault:

```bash
obsidian vault=Agent-Vault op-import-module path=release-checklist.md
```

Because `release-checklist.md` has no `project:` field, the importer derives
`scope: global` and lands the file at `Projects/_op-modules/release-checklist.md`.
The body's only `{{vars.<name>}}` reference is `release_command`, and the
loader walks the four-layer precedence chain looking for a binding:

1. **Launch overrides** — n/a for headless imports.
2. **Project** — n/a for a global import.
3. **Global** (`settings.workflowVars`) — checked.
4. **Module-default** — the `release_command=node scripts/release.mjs`
   declaration in the module's own `vars:` block.

Layers 1–3 don't have a binding, so the import needs an answer before it
can land. The palette command opens a single-prompt modal per missing var,
pre-filled with the module's inline default:

```
┌────────────────────────────────────────────────────────────────────┐
│  Import: release-checklist                                         │
│                                                                    │
│  Missing variable: release_command                                 │
│  Command this project uses to cut a release.                       │
│                                                                    │
│  Value:  [node scripts/release.mjs                              ]  │
│                                                                    │
│  [ Skip import ]                              [ Continue ]         │
└────────────────────────────────────────────────────────────────────┘
```

The pre-fill is exactly the `default:` value from the module's `vars:`
declaration — that's the contract: "module-supplied `name=VALUE` is the
prompt pre-fill, not an automatic write." You can accept the default by
clicking **Continue**, or edit it first if Agent-Vault uses a different
release command (say `gh release create`).

For headless invocations (CLI / URI), the same flow surfaces as a
structured response. Run the CLI without an answer and you'll get:

```
ok: false
status: needs-input
needsInput.vars[0]: { name: "release_command", prefill: "node scripts/release.mjs", hasModuleDefault: true, description: "Command this project uses to cut a release." }
```

Re-dispatch with the answer pre-filled:

```bash
obsidian vault=Agent-Vault op-import-module \
  path=release-checklist.md \
  var.release_command="gh release create"
```

You can pack multiple var answers into a single packed `vars=` argument too:
`vars="release_command=gh release create\nother_var=…"` (newline- or
comma-separated). The packed and per-key forms both exist for parity with
OP-204's variable contract.

## Step 5 — What the import produced

The import writes three things:

1. **The module file** at the chosen target — for our walkthrough,
   `Projects/_op-modules/release-checklist.md` in Agent-Vault. Frontmatter and
   body match the exported file exactly; the `project:` field, if any, is
   rewritten to whatever scope you picked.
2. **The variable answer** — for a global import, `settings.workflowVars.release_command`
   is set to your answer (or the default if you accepted the pre-fill). For
   `scope=project` imports, the answer lands in the project's `STATUS.md`
   `vars:` map via `fileManager.processFrontMatter`, so it sits alongside any
   other per-project variables.
3. **The transaction record** at `Projects/_op-import-history/<YYYYMMDD-HHmmss-mmm>.json`:

    ```json
    {
      "version": 1,
      "timestamp": "2026-04-26T12:34:56.789Z",
      "command": "op-import-module",
      "modulesLanded": [
        {
          "sourcePath": "/Users/.../Agent-Vault/release-checklist.md",
          "targetPath": "Projects/_op-modules/release-checklist.md",
          "scopeKind": "global",
          "overwrote": false
        }
      ],
      "varsWritten": [
        { "name": "release_command", "value": "gh release create",
          "scopeKind": "global", "preexisting": false }
      ]
    }
    ```

   `preexisting: false` marks variables that this import added; rows with
   `preexisting: true` (i.e. a value already lived at higher precedence) are
   recorded for traceability but the undo step skips them.

If the import overwrote an existing module file at `targetPath`, the
record also carries `backupPath` — the location of the pre-import contents,
copied to `Projects/_op-import-history/<ts>.bak/<vault-relative-path>`. Undo
restores from that location.

## Step 6 — Verify the round-trip

The exported file is byte-equivalent to the source. After the import lands,
diff the imported copy against OP-Test's original:

```bash
diff ~/Documents/OP-Test/OP-Test/Projects/_op-modules/release-checklist.md \
     ~/work/Agent-Vault/Projects/_op-modules/release-checklist.md
# → empty (no diff)
```

Empty diff means the round-trip is faithful — the byte-equivalence is the
contract. (For per-project modules with `project:` rewriting, the only
expected diff is the rewritten `project:` value.)

You can also confirm the agent will pick the module up. Open any issue in
Agent-Vault, run **op: open agent**, and expand the **Composed prompt
preview** disclosure. The body of `release-checklist.md` should appear in the
kickoff section, with `{{vars.release_command}}` substituted with `gh release
create` (the value you supplied at import time).

## Undoing an import

Changed your mind? `op-undo-last-import` reverses the most recent import:

```bash
obsidian vault=Agent-Vault op-undo-last-import
```

It walks the latest transaction record (lex-sorted filenames pick the most
recent), then:

1. **Trashes** every module file at the recorded `targetPath`.
2. **Restores** any backed-up originals from `<ts>.bak/`.
3. **Prunes** only variables that this transaction added (the
   `preexisting: false` rows). Variables that pre-existed at any scope —
   marked `preexisting: true` in the record — stay untouched.
4. **Trashes** the transaction record + its `.bak/` directory so a second
   undo is a clean no-op.

It's a one-step undo, not a stack: running it twice in a row gives you a
structured `status: "no-history"` response on the second call (not an error).

If you imported a v2 of a module that overwrote a v1, undo restores v1 from
the backup *and* respects any variable v1 already supplied — the v2 import
would have recorded that variable as `preexisting: true` because v1 had
already supplied a binding. Undo doesn't accidentally strip the v1 value.

## OP-Test → Agent-Vault hand-off, end-to-end

A typical "I tested this in OP-Test, now I want it in my real vault" flow,
all in one block:

```bash
# 1. Author + verify in OP-Test (this repo's clean-room vault).
obsidian vault=OP-Test op-list-modules | grep release-checklist

# 2. Export from OP-Test.
obsidian vault=OP-Test op-export-module id=release-checklist

# 3. Carry the file across.
cp ~/Documents/OP-Test/OP-Test/Projects/_op-export/release-checklist.md \
   ~/work/Agent-Vault/Projects/_op-export/release-checklist.md

# 4. Import into Agent-Vault. Headless form — supply the var answer up front.
obsidian vault=Agent-Vault op-import-module \
  path=Projects/_op-export/release-checklist.md \
  var.release_command="gh release create"

# 5. Verify the file landed and the var is bound.
obsidian vault=Agent-Vault op-list-vars | grep release_command
# → release_command (global) = gh release create

# 6. (Optional) Undo if you change your mind.
obsidian vault=Agent-Vault op-undo-last-import
```

The same pattern works for any pair of vaults you control, between machines,
or for sharing a module with a teammate via a gist or PR — the export file is
just a markdown file.

## Caveats and good habits

- **One concept per module.** Two `kickoff`-scoped modules are easier to
  reason about at the receiving vault than one module that does five things.
  Per-scope intra-collision checks catch *variable* collisions; they don't
  catch prose ones. Smaller modules also undo cleanly: a v2 overwrite of a
  small module is a smaller blast radius.
- **Keep `vars:` declarations close to their use.** When the importing vault
  sees the prompt, the inline default and description from the module's own
  frontmatter are the only context the user has — make them count. A
  `description:` field on the variable declaration shows up directly in the
  prompt modal.
- **Don't move modules by hand to bypass the import flow.** It works (modules
  are markdown), but you skip the missing-var bootstrap, the transaction
  record, and the one-step undo. The wrappers exist to give those for free.
- **Per-project imports rewrite `project:`.** When you import a module at
  `scope=project project=<slug>`, the importer rewrites the file's
  frontmatter `project:` to the chosen slug. The transaction record carries
  both the original and rewritten values so undo restores the original
  frontmatter.
- **Concurrent imports are single-shot.** Filenames use millisecond
  precision, so back-to-back imports don't collide. There's no lockfile —
  treat the import flow as serial within a vault.

## Where to next

- [`from-workflow-md.md`](../migration/from-workflow-md.md) — the migration
  story for projects that still have a legacy `WORKFLOW.md` blob to
  decompose into modules before they're worth sharing.
- [`from-agent-flows.md`](../migration/from-agent-flows.md) — the migration
  story for agent-flow auto-advance: what changes, what doesn't, and how
  legacy `flow:` enum values keep working forever via the alias map.
- [`workflow-module-schema.md`](../../specs/workflow-module-schema.md) —
  the full module-file contract, including the `vars:` declaration shapes
  the import prompt reads.
