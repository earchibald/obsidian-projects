import { App, TFile } from "obsidian";
import { loadModules, type LoadModulesOptions } from "./workflowModule";
import { loadWorkflowFile } from "./workflowFile";
import {
  composeWorkflow as composePure,
  type ComposeArgs,
  type ComposeContext,
  type ComposedPrompt,
  type LoadedModule,
} from "./composeWorkflowPure";
import type { WorkflowFile } from "./workflowFilePure";
import type { WorkflowModule } from "./workflowModulePure";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

// IO seam for OP-197 composition. Wraps OP-195's `loadModules` and OP-196's
// `loadWorkflowFile`, then reads each module's body content from disk so the
// pure composer (`composeWorkflowPure.ts`) has everything it needs as plain
// data. No composition logic lives here — every shape decision flows through
// the pure layer.

export type {
  ComposeArgs,
  ComposeContext,
  ComposedChunk,
  ComposedPrompt,
  LoadedModule,
  UserVarScope,
  UserVarSource,
} from "./composeWorkflowPure";
export { composeWorkflow as composeWorkflowPure, DEFAULT_MAX_WORKFLOW_CHARS } from "./composeWorkflowPure";

/**
 * Bundle returned by `loadModuleSources`. Bundles together the loaded
 * (frontmatter-parsed) modules with their body content, plus the merged
 * workflow file and the diagnostic stream from both loaders.
 *
 * Callers (OP-198 kickoff injection, OP-186 dry-run preview) feed
 * `loadedModules` + `workflow` into `composeWorkflow` along with their
 * `RenderContext`.
 */
export interface ModuleSourceBundle {
  loadedModules: LoadedModule[];
  workflow: WorkflowFile | null;
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Discover and load every workflow module + the project's workflow file.
 * IO function — caller MUST invoke after `workspace.onLayoutReady` so
 * `metadataCache` has resolved frontmatter for the vault.
 *
 * Steps:
 *   1. `loadModules(app, opts)` — discovers every module file at
 *      `Projects/_op-modules/<id>.md` and `Projects/<slug>/MODULES/<id>.md`,
 *      applies per-project shadowing, runs intra-scope collision validation.
 *   2. For every loaded module's `source.path`, read the body via
 *      `app.vault.read(file)` and strip the frontmatter (everything between
 *      the leading `---` fence and the matching closing `---`).
 *   3. `loadWorkflowFile(app, project)` — reads `Projects/<project>/WORKFLOW.md`,
 *      classifies legacy shape, follows `extends:` one level, validates models.
 *   4. Returns the bundle. The caller passes it into `composeWorkflow`.
 *
 * `opts.project` filters discovered modules — only the project's own
 * per-project modules + globals targeting that project (or no project) are
 * returned. The workflow file is always read from `Projects/<project>/`.
 */
export async function loadModuleSources(
  app: App,
  opts: { project: string } & LoadModulesOptions = { project: "" },
): Promise<ModuleSourceBundle> {
  const slug = opts.project.trim();
  const diagnostics: WorkflowDiagnostic[] = [];

  if (!slug) {
    diagnostics.push({
      code: "schema-mismatch",
      severity: "error",
      message: "loadModuleSources: project slug is required.",
      extra: { field: "project" },
    });
    return { loadedModules: [], workflow: null, diagnostics };
  }

  // Module discovery (frontmatter only — body is read below).
  const moduleResult = loadModules(app, { project: slug });
  diagnostics.push(...moduleResult.diagnostics);

  // Body load. Each module's `source.path` is vault-relative — re-resolve it
  // through `getAbstractFileByPath` so we have a `TFile` to read.
  const loadedModules: LoadedModule[] = [];
  for (const m of moduleResult.modules) {
    const file = app.vault.getAbstractFileByPath(m.source.path);
    if (!(file instanceof TFile)) {
      diagnostics.push({
        code: "schema-mismatch",
        severity: "error",
        message: `loadModuleSources: module "${m.id}" path ${m.source.path} no longer resolves to a TFile (file moved or deleted between metadataCache walk and body read).`,
        moduleId: m.id,
        extra: { path: m.source.path, expected: "TFile", actual: file === null ? "null" : file.constructor.name },
      });
      continue;
    }
    const raw = await app.vault.read(file);
    const body = stripFrontmatter(raw);
    loadedModules.push({ module: m, body });
  }

  // Workflow file (per-project, follows `extends:` to global default).
  const workflowResult = await loadWorkflowFile(app, slug);
  diagnostics.push(...workflowResult.diagnostics);

  return {
    loadedModules,
    workflow: workflowResult.workflow,
    diagnostics,
  };
}

/**
 * Strip a markdown file's frontmatter fence. Byte-for-byte compatible with
 * `workflowFilePure.ts:stripWorkflowFrontmatter` (which is itself byte-for-
 * byte compatible with `promptBuild.ts:stripFrontmatter`). Re-implemented
 * here so the composer pipeline doesn't drag a runtime dependency on the
 * workflow-file or prompt-build modules.
 */
function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  const afterFence = raw.indexOf("\n", end + 4);
  return afterFence === -1 ? "" : raw.slice(afterFence + 1);
}

/**
 * One-stop composer: load + compose. Convenience wrapper around
 * `loadModuleSources` + `composeWorkflowPure` for callers that want a single
 * entry point.
 *
 * Returns `null` workflow when the project's `WORKFLOW.md` couldn't be
 * salvaged at all — caller surfaces the diagnostics and aborts the launch
 * (or falls back to a no-modules launch, depending on the surface).
 */
export async function loadAndComposeWorkflow(
  app: App,
  args: { project: string; step: string; ctx: ComposeContext },
): Promise<{ composed: ComposedPrompt | null; bundle: ModuleSourceBundle }> {
  const bundle = await loadModuleSources(app, { project: args.project });
  if (!bundle.workflow) {
    return { composed: null, bundle };
  }
  const composed = composePure({
    loadedModules: bundle.loadedModules,
    workflow: bundle.workflow,
    step: args.step,
    ctx: args.ctx,
  });
  // Concat the loader's diagnostics with the composer's so callers see one
  // unified stream. The composer's already include any size-budget /
  // missing-var entries.
  return {
    composed: {
      ...composed,
      diagnostics: [...bundle.diagnostics, ...composed.diagnostics],
    },
    bundle,
  };
}

// Re-export the typed module shapes for callers that want them at the same
// import path as the composer.
export type { WorkflowFile, WorkflowModule };
