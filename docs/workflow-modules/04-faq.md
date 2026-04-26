# Workflow Modules — FAQ

The four questions users hit most often. For diagnostic-by-diagnostic
fixes, see [03-troubleshooting.md](./03-troubleshooting.md). For the
underlying file formats, see
[`workflow-module-schema.md`](../specs/workflow-module-schema.md) and
[`workflow-file-schema.md`](../specs/workflow-file-schema.md).

## Why is `{{vars.foo}}` rendering literally in the agent's prompt?

**Short answer.** The composer found no value for `vars.foo` at any
precedence layer — Module default → Global default → Project default →
Launch override. The renderer leaves unresolved tokens verbatim so the
diagnostic is visible in the agent's first message rather than silently
dropped, and it emits a `missing-var` `WorkflowDiagnostic` to surface
the failure in the Workflows panel and the dry-run preview banner.

**How to diagnose.**

1. Open `op: explain workflow` from the command palette (or run `obsidian
   op-explain-workflow issue=<PREFIX>-<N> mode=kickoff`). The CLI writes
   a structured payload to `Projects/_scratch/op-last-response.md`.
2. Find the `vars:` array in the payload. Each row carries a `name`,
   `value`, and `scope` (the layer that supplied the value, or `null`
   when nothing did).
3. Locate the row for `foo`. If `scope: null`, no layer had a value —
   that's the cause.

**How to fix.** Pick the layer that should own the value:

| Where | Edit | Use when |
| :--- | :--- | :--- |
| Module default | The module's `vars:` block (`- foo=value`). | Value is intrinsic to the module's behavior. |
| Global default | `Projects/_op-modules/_overrides.md`'s `vars:`. | Vault-wide policy. |
| Project default | `Projects/<slug>/MODULES/_overrides.md`'s `vars:`. | Differs per project. |
| Launch override | The launch modal's variables panel (OP-204). | One-off launch. |

**Two common mistakes.**

- **The variable name doesn't match `[a-zA-Z_][a-zA-Z0-9_]*`.** Names
  with hyphens or leading digits parse and load successfully but the
  renderer never matches them — the `{{var}}` pattern is `[a-zA-Z_]
  [a-zA-Z0-9_]*` per OP-194. Rename to a valid identifier.
- **A typo in `default:` (object form).** `defualt:` is silently
  accepted as an unknown key for forward-compat, but the value never
  reaches the composer. Fix the key spelling.

**Why doesn't the composer just use the empty string?** Because
"unresolved" and "intentionally empty" are different. The shorthand
`name=` (with a trailing `=`) declares the empty string as a default; a
bare `name` declares "the caller must supply a value". Treating
"missing" as "empty" would make the second form impossible to express.

## Why didn't my workflow advance to the next step?

The workflow-modules engine composes the prompt for each step on demand
— it doesn't itself drive step-to-step progression. Two engines do
that, depending on your setup:

**1. Flow chaining (Settings → Advanced → Flow chaining).**

When on, op auto-advances the issue's stage based on its current state:
`evaluate → planning → implementation → review → finalize`. Off by
default; opt in if you want auto-advance.

If you expected it to advance and it didn't:

- **Confirm "Auto-advance" is on.** Settings → Advanced → Flow chaining
  → "Auto-advance flow stages on status changes". Off by default.
- **Confirm the issue's `flow:` frontmatter matches expectations.** The
  next-stage resolver reads `flow:` and the issue's `status:` to decide
  what runs. A missing `flow:` field stops the chain at the current
  step.
- **Watch the developer console.** The chain emits warnings on hard
  stops (`[op-obsidian] flow:auto-advance: blocked because …`).
- **Open `op: explain flow`** if you have it installed (or check the
  flow runner's logs in the same `_scratch/` payload).

**2. Workflow modules don't drive progression themselves.**

Modules are composition-only — each module declares "what to inject at
this step". They don't decide *when* the agent moves on. If an agent
seemed to "stop in the middle of a step", the cause is almost always:

- The agent followed the module's instructions and stopped because the
  step's prose said to (e.g. "wait for sign-off").
- The launch was for a single step (`mode=plan`) and the next step
  needs a separate launch.
- A `bad-model` or `missing-var` diagnostic blocked the launch entirely
  — see the launch modal's preview banner or the developer console.

**Quick diagnostic.**

Run `obsidian op-explain-workflow issue=<id> mode=<step>` for the step
you expected to compose. If the payload's `composed.text` is empty or
the `diagnostics` array is non-empty, the engine has more to say —
usually one of the codes in [03-troubleshooting.md](./03-troubleshooting.md).

## How do I use a different model just for one step?

Workflow files support per-step model overrides — you don't need a
separate workflow per launch.

```yaml
---
type: workflow
schema: 1
project: myproject
default_agent: claude
default_model: opus
steps:
  - step: kickoff
    modules: [orient]
  - step: plan
    modules: [planner]
    model: sonnet           # ← per-step override
  - step: review
    modules: [review-and-merge]
    model: { claude: opus, gemini: pro }   # ← per-agent override
---
```

The override shape mirrors `default_model:` — list-or-scalar (applies
to every agent) or keyed-map (per-agent).

**For a one-off launch.**

If the change is "just for this run", you don't need to edit the file —
the launch modal's agent/model picker (OP-200) is the right surface.
Pick the model from the dropdown; the override applies to that launch
only and the workflow file stays unchanged.

**Validation.** A model name not on the agent's allow-list emits
`bad-model` at workflow load time. The error message lists the allowed
aliases and versioned ids — copy one of those into the field. The
recovery dialog (OP-205) can do the swap for you with a `.bak`.

**Cross-reference.**
[`workflow-file-schema.md` § Steps](../specs/workflow-file-schema.md#steps-required).

## How do I share my modules with a teammate?

Two patterns, depending on how often the modules need to update:

**1. Check them into the project's git repo.** This is the default for
projects that already version their `Projects/<slug>/` folder. Drop the
module under `Projects/<slug>/MODULES/<id>.md`, commit it, and pushing
to your shared remote propagates to your teammate's vault on next pull.

**Pros.** Standard git workflow; review via PR; conflicts surface
naturally; per-project shadowing means one teammate can locally
override without affecting others.

**Cons.** Teammates need write access to the same repo; one-off shares
("hey try this prompt") aren't worth a commit.

**2. Use `op-export-module` / `op-import-module`** (when these CLIs
land — tracked under OP-214). The exporter packages a module with its
`vars:` defaults; the importer pre-fills `name=VALUE` prompts so the
recipient sees what to supply.

**The OP-Test → Agent-Vault hand-off.** This is the canonical share
loop for the plugin's own developers — author and test in OP-Test, then
publish to Agent-Vault via the exporter. The full walkthrough lives in
[`docs/workflow-modules/sharing/share-modules.md`](./sharing/share-modules.md)
once OP-214 ships.

**Until then, the manual recipe.**

```bash
# In the source vault:
cp <vault>/Projects/_op-modules/<id>.md /tmp/<id>.md

# In the target vault:
cp /tmp/<id>.md <vault>/Projects/_op-modules/<id>.md
# Reload the plugin so the loader picks up the new file:
obsidian plugin:reload id=op-obsidian
```

The Settings → Workflows panel re-renders the module list on reload;
diagnostics surface immediately if anything went wrong (most often a
`malformed-frontmatter` from a YAML coercion of an ISO-date default).

## Where to next

- [01-overview.md](./01-overview.md) — concept doc: precedence chain,
  kickoff vs per-step injection.
- [02-quickstart.md](./02-quickstart.md) — five-minute walkthrough.
- [03-troubleshooting.md](./03-troubleshooting.md) — every diagnostic
  code with what-it-means + how-to-fix.
- [05-settings-reference.md](./05-settings-reference.md) — Workflows
  settings group + Available variables panel.
- [`workflow-module-schema.md`](../specs/workflow-module-schema.md) —
  module file reference.
- [`workflow-file-schema.md`](../specs/workflow-file-schema.md) —
  workflow file reference.
