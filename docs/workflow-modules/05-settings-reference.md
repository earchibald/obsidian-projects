# Workflow Modules — Settings Tab Reference

A walk through the op-obsidian Settings tab as it relates to workflow
modules. Two surfaces the migration introduced — the top-level
**Workflows** group and the **Available variables** panel — plus a
call-out for the **Injection** subsection that the migration partially
retires.

ASCII layout sketches (clearer than screenshots — versionable, no PNG
drift). Each sketch reflects the panel's actual content; the
`[data-op-section]` selectors line up with what `app.setting.openTabById`
renders, so you can verify against your own install.

## Where to find it

```
Obsidian → Settings (⌘,) → op-obsidian
```

The tab is laid out in three groups, top-to-bottom:

```
┌─────────────────────────────────────────────────────────────────┐
│  [ Search settings… ]                                           │
├─────────────────────────────────────────────────────────────────┤
│  ## Daily                                                       │
│  · Default agent       (claude / gemini / copilot)              │
│  · Terminal app        (iTerm / Terminal)                       │
│  · Sidebar default tab (Issues / In flight / Recently resolved) │
│  · Onboarding README   [Open README]                            │
│  · Apply preset        [Apply hotkey preset]                    │
├─────────────────────────────────────────────────────────────────┤
│  ## Workflows         ← introduced in OP-201 (3a)               │
│  ... module list / empty state ...                              │
│  ▷ Available variables (collapsed)                              │
├─────────────────────────────────────────────────────────────────┤
│  ## Advanced                                                    │
│  ▷ Injection (collapsed)            [data-op-section=injection] │
│  ▷ Working dirs & project order      [...=workingDirs]          │
│  ▷ iTerm layout orchestrator         [...=orchestrator]         │
│  ▷ Profile overlays (JSON per agent) [...=profileOverlays]      │
│  ▷ Agent worktree enforcement        [...=worktreeEnforcement]  │
│  ▷ Flow chaining                     [...=flowChaining]         │
│  ▷ GitHub integration                [...=github]               │
│  ▷ Developer commands                [...=developer]            │
│                                                                 │
│  ▷ Glossary — tmux, orchestrator, overlay, worktree             │
└─────────────────────────────────────────────────────────────────┘
```

The fuzzy search box at the top auto-expands any collapsible whose rows
match.

## The Workflows group

Top-level group between Daily and Advanced — its own H2, not buried in
Advanced as a 9th collapsible. The reasoning, captured in OP-201:
modules surface module-level diagnostics, the "Available variables"
reference panel, and an empty-state install button — too important and
too referenced to bury.

The group's data attribute on the wrapper:

```
[data-op-section="workflows"]
```

### Empty state — no modules loaded

What you see when the loader returned zero modules (a fresh vault,
modules disabled, or every file failed to parse):

```
═══ Workflows ════════════════════════════════════════════════════
Workflow modules compose the prompt the launched agent sees. Loaded
modules appear here with their diagnostics; the Available variables
panel lists tokens you can reference in module bodies via {{name}}.

  ┌───────────────────────────────────────────────────────────┐
  │  No modules yet                                           │
  │  Open the [5-min Quickstart](…), or install the example   │
  │  library below to get a working modules tree in one click.│
  │                                                           │
  │  Install example library                                  │
  │  Writes 6 starter modules into Projects/_op-modules/.     │
  │  Existing files are never overwritten — safe to click     │
  │  again. Open the installed files to see complete, valid   │
  │  module shape.                              [ Install ]   │
  └───────────────────────────────────────────────────────────┘

  Preview composed prompt
  Open a read-only modal that renders the fully-composed launch
  prompt for a chosen (issue, mode, agent) tuple — the exact string
  the launcher would pass to the agent.       [ Open preview ]

  Auto-expand launch preview                            [ on ●]

  ▷ Available variables                                          
══════════════════════════════════════════════════════════════════
```

The empty-state quickstart link goes to
`docs/workflow-modules/02-quickstart.md` on GitHub. The "Install
example library" button writes the OP-212 starter modules into
`Projects/_op-modules/` (idempotent — never overwrites; safe to click
again).

### Module list — modules loaded

What you see once the loader has parsed at least one module:

```
═══ Workflows ════════════════════════════════════════════════════
Workflow modules compose the prompt the launched agent sees. …

  ┌──────────────────────────────────────────────────────────────┐
  │ branching      Branching discipline   global       [ ok ]    │
  │                                                  [ Explain ] │
  ├──────────────────────────────────────────────────────────────┤
  │ review-and-merge  Review and merge   project: ip   [E1]      │
  │   E  Missing variable   foo not declared at any layer        │
  │      Launch override                                         │
  │                                                  [ Explain ] │
  ├──────────────────────────────────────────────────────────────┤
  │ planner       Planner module         global        [W1] [I1] │
  │   W  Bad model spec     "oups" for agent "claude" at <…>     │
  │   I  Workflow size notice  composed prompt is 38k chars      │
  │                                                  [ Explain ] │
  └──────────────────────────────────────────────────────────────┘

  Unattributed diagnostics                ← rendered only when present
  Diagnostics from modules that failed to parse, or that don't bind
  to a single module.
    E  Malformed frontmatter  …

  Preview composed prompt                       [ Open preview ]
  Auto-expand launch preview                            [ on ●]
  ▷ Available variables
══════════════════════════════════════════════════════════════════
```

**Anatomy of a row.**

- **Module id** + title + source label (`global` or `project: <slug>`).
- **Severity badges** — `Ek` / `Wk` / `Ik` count diagnostics by
  severity (or a green `ok` chip when none). Tooltip on the badge shows
  the full `codeLabel` ("Missing variable", "Bad model spec") — never
  the single-letter abbreviation in primary copy (per OP-201
  contract).
- **Diagnostic lines** — one per diagnostic, formatted through the
  unified `formatDiagnostic`. Code label, message, and (when present)
  the canonical scope name ("Launch override").
- **Explain button** — opens a modal with the multi-line block
  rendering for every diagnostic on the module. Renders even when
  there are zero diagnostics so users can verify they're looking at
  the right module.

**Footer — Unattributed diagnostics** appears only when a diagnostic
can't bind to a loaded module — most commonly a parse failure where
the file never made it to the modules list. Without this footer, those
diagnostics would silently vanish.

### Available variables panel

Collapsed by default, expanded by clicking the `▷` caret:

```
▼ Available variables                  [data-op-section=workflowsVars]

  Tokens you can reference in a module body via {{name}}. These are
  computed per-launch from the issue, the agent profile, and the
  launch context — they sit at Launch override (the highest
  precedence). User-declared {{vars.<name>}} are a separate namespace
  declared in a module's `vars:` block.

  {{issue_id}}        e.g. OP-215
    Issue id, e.g. "OP-211".
  {{issue_title}}     e.g. 10e: Troubleshooting + FAQ + …
    Issue title.
  {{issue_path}}      e.g. Projects/obsidian-projects/ISSUES/…
    Vault-relative issue path.
  {{project}}         e.g. obsidian-projects
    Project slug from the issue's frontmatter.
  {{repo_path}}       e.g. /Users/you/Projects/obsidian-projects
    Project's repo path (from STATUS.md repo_path:, optional).
  {{agent}}           e.g. claude
    Resolved agent id for this launch.
  {{mode}}            e.g. kickoff
    Workflow step the composer is rendering.
  {{today}}           e.g. 2026-04-26
    ISO date the launch was composed (UTC).
  …more rows from PLUGIN_VAR_REGISTRY…
```

Two things worth knowing:

- These variables sit at **Launch override** in the precedence chain
  — the highest precedence. A module's own `vars:` default cannot
  shadow them.
- `{{name}}` and `{{vars.name}}` are **different namespaces**.
  `{{repo_path}}` is a plugin-supplied launch variable; `{{vars.foo}}`
  is a user-declared module variable. Mixing them up is the most
  common cause of literal-render failures (see
  [04-faq.md § literal vars](./04-faq.md#why-is-varsfoo-rendering-literally-in-the-agents-prompt)).

## Injection — what the migration changed

Open this collapsible to see the legacy controls that drove the
pre-modules injection blob:

```
▼ Injection                                  [data-op-section=injection]

  · Inject issue body                                       [ on ●]
  · Max body characters                                       8000
  · Inject linked TASKS                                      [ on ●]
  · Inject recent commits                                    [ on ●]
    Max recent commits                                          12
  · Workflow inline cap (chars)         ← will retire (OP-208)
    32768
    When the issue's project has a Projects/<slug>/WORKFLOW.md, inline
    its contents up to this many characters.
  · Extra preamble                                       [ … textarea ]
```

The bold takeaway:

- **`Workflow inline cap (chars)`** is the legacy single-row cap on the
  whole-`WORKFLOW.md` inline blob. Once OP-208 ("Cutover") ships, this
  row is removed — the modules engine has its own per-launch
  `maxWorkflowChars` accounting (surfaced as the `size-budget` info
  diagnostic), and the dual surface created confusion. Until then both
  controls coexist; the modules engine ignores this row.
- **`workflowMode`** is the master toggle — `"legacy"` uses the
  inline-cap path; `"modules"` uses the OP-201 module engine. There's
  no UI toggle yet; until OP-186 lands, flip it by editing
  `<vault>/.obsidian/plugins/op-obsidian/data.json` (see
  [02-quickstart.md § step 1](./02-quickstart.md#1-switch-to-modules-mode-30-seconds)).
  After OP-208, the default flips from `"legacy"` to `"modules"` — but
  vaults that already have `workflowMode: "legacy"` set stay on legacy
  (the migration treats an explicit value as user opt-in).

If you've never edited `data.json` directly, the safe order is: quit
Obsidian first (or fully disable op-obsidian) → edit → re-enable. The
running plugin caches settings in memory and overwrites manual edits on
its next save.

## Where to next

- [01-overview.md](./01-overview.md) — concept doc: precedence chain,
  kickoff vs per-step injection.
- [02-quickstart.md](./02-quickstart.md) — five-minute walkthrough.
- [03-troubleshooting.md](./03-troubleshooting.md) — every diagnostic
  code with what-it-means + how-to-fix.
- [04-faq.md](./04-faq.md) — common questions: literal `{{vars.foo}}`,
  workflow not advancing, per-step model, sharing modules.
- [`workflow-module-schema.md`](../specs/workflow-module-schema.md) —
  module file reference.
- [`workflow-file-schema.md`](../specs/workflow-file-schema.md) —
  workflow file reference.
