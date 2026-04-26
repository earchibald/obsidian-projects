import type { App } from "obsidian";

// Inline example workflow-module library for the Settings → Workflows
// empty-state. The "Install example library" button writes these files into
// the global modules dir so a brand-new user goes from zero to a working
// modules tree in one click.
//
// Inline (not loaded from a vault folder) so the install path is
// self-contained — no chicken-and-egg dependency on OP-189 ("migrate this
// project's WORKFLOW.md content into named modules") or on the user having
// any pre-existing module files. Examples are deliberately tiny: one minimal,
// one with a `vars:` block. They serve double duty as documentation — opening
// either file shows a complete, valid module.

const EXAMPLES_DIR = "Projects/_op-modules/";

export interface ExampleModule {
  /** Module id — used for the filename, must match the frontmatter `id:`. */
  id: string;
  /** Markdown body including frontmatter. Written to disk verbatim. */
  content: string;
}

/**
 * The inlined example library. Order is the install order — first example is
 * the simplest and the one a new user reads first when the Notice surfaces
 * "Open `example-minimal.md` to see a complete module". Keep it short.
 */
export const EXAMPLE_MODULES: readonly ExampleModule[] = Object.freeze([
  Object.freeze({
    id: "example-minimal",
    content: `---
id: example-minimal
title: "Example: minimal module"
type: workflow-module
scope: example
order: 0
---

This is a minimal workflow module. The frontmatter declares its id, title,
scope (used to partition the workflow), and order (sort key within the scope).

A module with no \`vars:\` block has no template variables to resolve — it
simply contributes its body to the composed workflow. Delete this file once
you have your own modules.
`,
  }),
  Object.freeze({
    id: "example-with-vars",
    content: `---
id: example-with-vars
title: "Example: module with variables"
type: workflow-module
scope: example
order: 10
vars:
  - bare_var
  - default_var=hello
  - { name: described_var, default: "world", description: "A var with a description" }
---

This module declares three variables in its \`vars:\` frontmatter block:

- \`bare_var\` — no default; the launcher must supply a value at a higher
  precedence scope (Project default or Launch override).
- \`default_var\` — short form, default is the literal string \`hello\`.
- \`described_var\` — long form with a description that surfaces in the
  Settings → Workflows reference panel and \`op-list-vars\`.

Reference these in the body via \`{{bare_var}}\`, \`{{default_var}}\`,
\`{{described_var}}\`.
`,
  }),
]);

export interface InstallExamplesResult {
  /** Files newly written. */
  installed: string[];
  /** Files skipped because they already existed (no overwrite). */
  skipped: string[];
}

/**
 * Write each example to `Projects/_op-modules/<id>.md`. Idempotent: existing
 * files are NEVER overwritten — re-running after a partial install completes
 * the rest, and re-running after a full install is a no-op.
 *
 * Why no overwrite: the user may have edited an example file in place to
 * learn from it, and clicking the button again should not silently throw
 * that work away. The skipped list lets the caller surface a Notice
 * distinguishing "installed N" from "skipped N already-present".
 */
export async function installExampleLibrary(app: App): Promise<InstallExamplesResult> {
  const adapter = app.vault.adapter;
  const installed: string[] = [];
  const skipped: string[] = [];
  await ensureDir(app, EXAMPLES_DIR);
  for (const ex of EXAMPLE_MODULES) {
    const path = `${EXAMPLES_DIR}${ex.id}.md`;
    if (await adapter.exists(path)) {
      skipped.push(path);
      continue;
    }
    await adapter.write(path, ex.content);
    installed.push(path);
  }
  return { installed, skipped };
}

async function ensureDir(app: App, dir: string): Promise<void> {
  const adapter = app.vault.adapter;
  // `mkdir` is idempotent on Obsidian's adapter — it's a no-op if the dir
  // already exists. Wrap in try/catch defensively in case future adapter
  // implementations diverge.
  if (await adapter.exists(dir)) return;
  try {
    await adapter.mkdir(dir);
  } catch {
    // Another concurrent caller (or pre-existing folder we somehow missed)
    // — re-check and only re-throw if it's still missing.
    if (!(await adapter.exists(dir))) throw new Error(`Could not create ${dir}`);
  }
}
