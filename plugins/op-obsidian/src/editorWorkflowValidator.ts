// IO seam for OP-207's editor-save validator. Detects whether a saved file is
// a workflow module or workflow file, derives the project slug, runs
// `loadAndComposeWorkflow` once per (step × installed agent) tuple, and hands
// the accumulated diagnostics back through the pure helpers.
//
// The pure logic lives in `editorWorkflowValidatorPure.ts`; everything in
// here is vault reads and the synthetic launch context the validator stands
// in for an actual launch's `RenderContext`.

import type { App, TFile } from "obsidian";
import { TFile as ObsidianTFile } from "obsidian";

import { AGENT_IDS, type AgentId } from "./agentProfiles";
import type { AgentDetector } from "./agentDetect";
import { loadModuleSources } from "./composeWorkflow";
import {
  composeWorkflowPure as composePure,
} from "./composeWorkflow";
import type { ComposeContext } from "./composeWorkflowPure";
import type { OpSettings } from "./settings";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";
import {
  enumerateTuples,
  dedupeDiagnostics,
  summarizeStatus,
  type ValidatorSummary,
} from "./editorWorkflowValidatorPure";

const PROJECTS_ROOT = "Projects/";
const GLOBAL_MODULES_DIR = "Projects/_op-modules/";
const PER_PROJECT_MODULES_INFIX = "/MODULES/";
const GLOBAL_WORKFLOW_PATH = "Projects/_op-workflow.md";

export type ValidatedFileKind = "module" | "workflow";

export interface ValidatedFileInfo {
  kind: ValidatedFileKind;
  /** Project slug. Empty string for global modules / the global workflow. */
  project: string;
}

/**
 * Identify whether `path` is a file the editor-save validator should run on,
 * and pull out the project slug. Returns `null` for unrelated files.
 *
 * Recognized shapes:
 *   - `Projects/_op-modules/<id>.md`              → kind: module, project: ""
 *   - `Projects/<slug>/MODULES/<id>.md`           → kind: module, project: slug
 *   - `Projects/<slug>/WORKFLOW.md`               → kind: workflow, project: slug
 *   - `Projects/_op-workflow.md`                  → kind: workflow, project: ""
 *
 * The global-scoped variants resolve to project: "" — the validator picks an
 * arbitrary project to compose under (or skips when none is available).
 */
export function classifyFile(path: string): ValidatedFileInfo | null {
  if (path === GLOBAL_WORKFLOW_PATH) {
    return { kind: "workflow", project: "" };
  }
  if (path.startsWith(GLOBAL_MODULES_DIR)) {
    const rel = path.slice(GLOBAL_MODULES_DIR.length);
    if (rel.includes("/")) return null;
    if (!rel.endsWith(".md")) return null;
    return { kind: "module", project: "" };
  }
  const moduleIdx = path.indexOf(PER_PROJECT_MODULES_INFIX);
  if (moduleIdx !== -1) {
    const beforeInfix = path.slice(0, moduleIdx);
    const slugStart = beforeInfix.lastIndexOf("/");
    if (slugStart === -1) return null;
    const slug = beforeInfix.slice(slugStart + 1);
    if (!slug || beforeInfix !== `${PROJECTS_ROOT.slice(0, -1)}/${slug}`) return null;
    const after = path.slice(moduleIdx + PER_PROJECT_MODULES_INFIX.length);
    if (after.includes("/")) return null;
    return { kind: "module", project: slug };
  }
  // Per-project workflow file.
  if (path.startsWith(PROJECTS_ROOT) && path.endsWith("/WORKFLOW.md")) {
    const rel = path.slice(PROJECTS_ROOT.length, -"/WORKFLOW.md".length);
    if (!rel || rel.includes("/")) return null;
    return { kind: "workflow", project: rel };
  }
  return null;
}

export interface ValidatorDeps {
  settings: OpSettings;
  /** Optional agent detector — when absent or empty, the validator falls back to AGENT_IDS. */
  detector?: AgentDetector;
}

export interface ValidationResult {
  diagnostics: WorkflowDiagnostic[];
  summary: ValidatorSummary;
  /** Project slug the validator composed under — useful for logging. */
  project: string;
}

const EMPTY_RESULT = (project: string): ValidationResult => ({
  diagnostics: [],
  summary: summarizeStatus([]),
  project,
});

/**
 * Run the editor-save validator against `file`. Returns a `ValidationResult`
 * for the CM6 layer to consume. When the file is unrecognized or the project
 * cannot be derived, returns a clean result so the editor surface paints
 * nothing — same shape, no exception path for the caller.
 */
export async function validateFile(
  app: App,
  file: TFile,
  deps: ValidatorDeps,
): Promise<ValidationResult> {
  const info = classifyFile(file.path);
  if (!info) return EMPTY_RESULT("");

  const project = info.project || pickProjectForGlobalFile(app);
  if (!project) return EMPTY_RESULT("");

  const bundle = await loadModuleSources(app, { project });
  if (!bundle.workflow) {
    // The loader's diagnostics still describe the failure (missing workflow
    // file, schema-mismatch, etc.). Fold them through dedupe + summarize so
    // the editor still surfaces the problem.
    const diags = dedupeDiagnostics(bundle.diagnostics);
    return { diagnostics: diags, summary: summarizeStatus(diags), project };
  }

  const installedAgents = installedAgentIds(deps.detector);
  const tuples = enumerateTuples(bundle.workflow, installedAgents);

  // Compose once per tuple. Reuse the loader's diagnostics across the sweep —
  // they don't depend on (step, agent), so we add them once at the end before
  // dedupe collapses any duplicates emerging from multi-step composition.
  const allDiags: WorkflowDiagnostic[] = [];
  for (const tuple of tuples) {
    const ctx = buildSyntheticContext({
      settings: deps.settings,
      project,
      step: tuple.step,
      agent: tuple.agent,
    });
    const composed = composePure({
      loadedModules: bundle.loadedModules,
      workflow: bundle.workflow,
      step: tuple.step,
      ctx,
    });
    allDiags.push(...composed.diagnostics);
  }

  const merged = dedupeDiagnostics([...bundle.diagnostics, ...allDiags]);
  return { diagnostics: merged, summary: summarizeStatus(merged), project };
}

function installedAgentIds(detector: AgentDetector | undefined): string[] {
  const map = detector?.get();
  if (!map) return [...AGENT_IDS];
  const installed = (Object.values(map) as { id: AgentId; installed: boolean }[])
    .filter((d) => d.installed)
    .map((d) => d.id);
  return installed.length > 0 ? installed : [...AGENT_IDS];
}

/**
 * When the saved file is a *global* module or the global workflow, the
 * validator needs to pick a project to compose under (since `loadModuleSources`
 * is per-project). The first project folder that has a WORKFLOW.md is the
 * pragmatic pick — it gives the most realistic compose result for an
 * authored-once-shared-everywhere global module.
 */
function pickProjectForGlobalFile(app: App): string {
  const files = app.vault.getMarkdownFiles();
  for (const f of files) {
    if (!f.path.endsWith("/WORKFLOW.md")) continue;
    if (!f.path.startsWith(PROJECTS_ROOT)) continue;
    const rel = f.path.slice(PROJECTS_ROOT.length, -"/WORKFLOW.md".length);
    if (rel && !rel.includes("/")) return rel;
  }
  return "";
}

interface SyntheticCtxArgs {
  settings: OpSettings;
  project: string;
  step: string;
  agent: string;
}

/**
 * Build a `ComposeContext` for the validator's sweep. Plugin-var values are
 * placeholders — the validator's job is to surface bad-model / undeclared-var
 * / unknown-module type errors, NOT to flag every issue field that a real
 * launch will fill in. Every required field gets a non-empty string so
 * `renderTemplate` doesn't emit a `missing-var` diagnostic for `{{id}}`,
 * `{{branch}}`, etc.
 *
 * User-var scopes (Global, Project, Launch) are read from settings the same
 * way the launcher does. The validator deliberately leaves `launchVars`
 * empty — at launch time the user can supply per-launch values, but at edit
 * time the absence of a launch override should NOT make a previously-OK
 * workflow look broken.
 */
function buildSyntheticContext(args: SyntheticCtxArgs): ComposeContext {
  const { settings, project, step, agent } = args;
  return {
    render: {
      id: "(editor-validator)",
      title: "(editor-validator)",
      project,
      status: "open",
      priority: "med",
      parent: null,
      pr_url: "(editor-validator)",
      github_issue: "(editor-validator)",
      repo_path: "(editor-validator)",
      vault_path: "(editor-validator)",
      vault_name: "(editor-validator)",
      branch: "(editor-validator)",
      today: new Date().toISOString().slice(0, 10),
      agent,
      model: "(editor-validator)",
      mode: step,
    },
    globalVars: settings.workflowVars ?? {},
    projectVars: readProjectVarsFromSettings(settings, project),
    launchVars: {},
    maxWorkflowChars: settings.injection.maxWorkflowChars,
  };
}

function readProjectVarsFromSettings(_settings: OpSettings, _project: string): Record<string, string> {
  // The launcher reads project vars from `Projects/<slug>/STATUS.md`. We
  // intentionally don't replicate that here — STATUS-level project vars are
  // a launch concern, not an authoring concern, and including them would
  // require a vault read for every keystroke. Empty record is the safe
  // default; missing-var diagnostics for project-vars-only declarations are
  // surfaced as warnings, not errors.
  return {};
}

// Re-export so the CM6 extension can narrow on a TFile without re-importing
// from "obsidian".
export { ObsidianTFile };
