import { App, TFile } from "obsidian";
import {
  parseModule,
  validateIntraScopeCollisions,
  type ModuleSource,
  type WorkflowModule,
} from "./workflowModulePure";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

// Workflow-module IO loader. Walks the vault, parses each module file via the
// pure layer (workflowModulePure.ts), applies per-project shadowing of global
// modules, and runs intra-scope collision validation. Composition (resolving
// vars across scopes, applying user values) is OP-197 (1d).
//
// Module locations:
//   - Global:      Projects/_op-modules/<id>.md
//   - Per-project: Projects/<slug>/MODULES/<id>.md
//
// A per-project module of the same id shadows the global. Shadowing is silent
// — no diagnostic — because it's intentional behavior. The schema doc calls
// this out so users don't lose hours wondering why a global module went quiet.

export type {
  ModuleSource,
  ParseModuleArgs,
  ParseModuleResult,
  ParseVarDeclResult,
  ParseVarDeclsResult,
  VarDecl,
  WorkflowModule,
} from "./workflowModulePure";
export {
  parseModule,
  parseVarDecl,
  parseVarDecls,
  validateIntraScopeCollisions,
} from "./workflowModulePure";

const PROJECTS_ROOT = "Projects/";
const GLOBAL_MODULES_DIR = "Projects/_op-modules/";
const PER_PROJECT_MODULES_INFIX = "/MODULES/";

export interface LoadModulesOptions {
  /**
   * If set, drop modules whose `project:` frontmatter is non-empty and doesn't
   * match this slug. Per-project modules (`Projects/<slug>/MODULES/`) are
   * always restricted to their own slug regardless of this option — only
   * globals carrying an explicit `project:` field participate in this filter.
   */
  project?: string;
}

export interface LoadModulesResult {
  modules: WorkflowModule[];
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Discover and load every workflow module visible in the vault. Pure logic
 * lives in `workflowModulePure.ts`; this function is the IO seam.
 *
 * Steps:
 *   1. Walk every markdown file in `Projects/`.
 *   2. Bucket each file as global or per-project based on its path.
 *   3. Read frontmatter via `app.metadataCache` and call `parseModule`.
 *   4. Apply shadowing: per-project modules win over same-id globals.
 *   5. Optionally filter by `opts.project`.
 *   6. Run intra-scope collision validation.
 *
 * Caller responsibility: invoke after `workspace.onLayoutReady` so
 * `metadataCache` has resolved frontmatter for newly-opened vaults. Earlier
 * calls may surface spurious `malformed-frontmatter` diagnostics for files
 * whose cache hasn't populated yet.
 */
export function loadModules(app: App, opts: LoadModulesOptions = {}): LoadModulesResult {
  type Bucket = { file: TFile; id: string; source: ModuleSource };

  const globals: Bucket[] = [];
  const perProject: Bucket[] = [];

  for (const file of app.vault.getMarkdownFiles()) {
    const path = file.path;
    if (!path.startsWith(PROJECTS_ROOT)) continue;

    const id = file.basename;

    if (path.startsWith(GLOBAL_MODULES_DIR)) {
      // Global modules live exactly one directory deep below GLOBAL_MODULES_DIR.
      const rel = path.slice(GLOBAL_MODULES_DIR.length);
      if (rel.includes("/")) continue;
      globals.push({ file, id, source: { kind: "global", path } });
      continue;
    }

    const moduleIdx = path.indexOf(PER_PROJECT_MODULES_INFIX);
    if (moduleIdx === -1) continue;
    const beforeInfix = path.slice(0, moduleIdx);
    const slugStart = beforeInfix.lastIndexOf("/");
    if (slugStart === -1) continue;
    const slug = beforeInfix.slice(slugStart + 1);
    if (!slug || beforeInfix !== `${PROJECTS_ROOT.slice(0, -1)}/${slug}`) continue;
    const afterInfix = path.slice(moduleIdx + PER_PROJECT_MODULES_INFIX.length);
    if (afterInfix.includes("/")) continue;
    perProject.push({
      file,
      id,
      source: { kind: "project", path, projectSlug: slug },
    });
  }

  const diagnostics: WorkflowDiagnostic[] = [];
  const byId = new Map<string, WorkflowModule>();

  // Load globals first; per-project copies overwrite by id below.
  for (const bucket of globals) {
    const r = parseFile(app, bucket);
    diagnostics.push(...r.diagnostics);
    if (r.module) byId.set(r.module.id, r.module);
  }
  for (const bucket of perProject) {
    const r = parseFile(app, bucket);
    diagnostics.push(...r.diagnostics);
    if (r.module) byId.set(r.module.id, r.module); // shadows any same-id global
  }

  let modules = Array.from(byId.values());

  if (opts.project) {
    modules = modules.filter((m) => !m.project || m.project === opts.project);
  }

  diagnostics.push(...validateIntraScopeCollisions(modules));

  return { modules, diagnostics };
}

function parseFile(
  app: App,
  bucket: { file: TFile; id: string; source: ModuleSource },
): { module: WorkflowModule | null; diagnostics: WorkflowDiagnostic[] } {
  const fm = app.metadataCache.getFileCache(bucket.file)?.frontmatter ?? null;
  return parseModule({ id: bucket.id, frontmatter: fm, source: bucket.source });
}
