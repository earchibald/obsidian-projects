import { App, TFile, normalizePath } from "obsidian";
import { loadModules } from "./workflowModule";
import type { WorkflowModule } from "./workflowModulePure";
import { formatExportFile } from "./exportImportPure";

// IO seam for `op-export-module` (OP-187 / Child 4 of OP-181).
// Reads source modules from the vault, formats them via the pure layer, and
// writes the bundle into `Projects/_op-export/`.
//
// Two modes:
//   - `id=<id>`        → write a single module to `Projects/_op-export/<id>.md`.
//   - `project=<slug>` → write every module visible to that project (per-
//                        project modules + globals carrying that `project:`)
//                        to `Projects/_op-export/<slug>/<id>.md`.

export const EXPORT_DIR = "Projects/_op-export";

export interface ExportSingleArgs {
  kind: "id";
  moduleId: string;
}

export interface ExportProjectArgs {
  kind: "project";
  projectSlug: string;
}

export type ExportArgs = ExportSingleArgs | ExportProjectArgs;

export interface ExportedFile {
  /** Source module id. */
  moduleId: string;
  /** Where the source module lives in the vault. */
  sourcePath: string;
  /** Where the export file was written (vault-relative). */
  exportPath: string;
  /** Source module scope (global vs project) — copied for surfaces that report. */
  sourceScope: "global" | "project";
  /** Source project slug, if the module came from a per-project folder. */
  sourceProjectSlug?: string;
}

export interface ExportResult {
  files: ExportedFile[];
}

/**
 * Run the export. Throws when the target module/project doesn't exist; that's
 * a usage error worth surfacing as a hard `Error` (the URI/CLI handler turns
 * it into a structured response). Other partial failures (one module fails to
 * read mid-bundle) propagate the same way — we'd rather abort than ship a
 * half-written bundle.
 */
export async function exportModules(app: App, args: ExportArgs): Promise<ExportResult> {
  const { modules: discovered, diagnostics } = loadModules(app);
  const fatal = diagnostics.filter((d) => d.severity === "error");
  if (fatal.length > 0) {
    throw new Error(
      `op-export-module: vault has ${fatal.length} module-loading error(s). Fix them with op-edit-module before exporting. First: ${fatal[0].message}`,
    );
  }

  const targets = pickTargets(discovered, args);
  if (targets.length === 0) {
    throw new Error(
      args.kind === "id"
        ? `op-export-module: no module with id "${args.moduleId}" found in the vault.`
        : `op-export-module: no modules found for project "${args.projectSlug}".`,
    );
  }

  await ensureFolder(app, EXPORT_DIR);
  const subfolder = args.kind === "project" ? `${EXPORT_DIR}/${args.projectSlug}` : null;
  if (subfolder) await ensureFolder(app, subfolder);

  const out: ExportedFile[] = [];
  for (const module of targets) {
    const tfile = app.vault.getAbstractFileByPath(module.source.path);
    if (!(tfile instanceof TFile)) {
      throw new Error(
        `op-export-module: module "${module.id}" path ${module.source.path} no longer resolves to a file.`,
      );
    }
    const raw = await app.vault.read(tfile);
    const body = stripFrontmatter(raw);
    const exportPath = normalizePath(
      subfolder ? `${subfolder}/${module.id}.md` : `${EXPORT_DIR}/${module.id}.md`,
    );
    const content = formatExportFile({ module, body });
    await writeFile(app, exportPath, content);
    out.push({
      moduleId: module.id,
      sourcePath: module.source.path,
      exportPath,
      sourceScope: module.source.kind,
      sourceProjectSlug:
        module.source.kind === "project" ? module.source.projectSlug : undefined,
    });
  }

  return { files: out };
}

function pickTargets(
  discovered: WorkflowModule[],
  args: ExportArgs,
): WorkflowModule[] {
  if (args.kind === "id") {
    const hit = discovered.find((m) => m.id === args.moduleId);
    return hit ? [hit] : [];
  }
  const slug = args.projectSlug;
  return discovered.filter((m) => {
    if (m.source.kind === "project" && m.source.projectSlug === slug) return true;
    if (m.source.kind === "global" && m.project === slug) return true;
    return false;
  });
}

async function ensureFolder(app: App, path: string): Promise<void> {
  const norm = normalizePath(path);
  if (!app.vault.getAbstractFileByPath(norm)) {
    await app.vault.createFolder(norm);
  }
}

async function writeFile(app: App, path: string, content: string): Promise<void> {
  const norm = normalizePath(path);
  const existing = app.vault.getAbstractFileByPath(norm);
  if (existing instanceof TFile) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(norm, content);
  }
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  const after = raw.indexOf("\n", end + 4);
  return after === -1 ? "" : raw.slice(after + 1);
}
