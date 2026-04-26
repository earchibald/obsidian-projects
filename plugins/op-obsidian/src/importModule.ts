import { App, TFile, normalizePath, parseYaml } from "obsidian";
import { promises as fs } from "fs";
import { isAbsolute } from "path";
import type { OpSettings } from "./settingsPure";
import {
  ImportPlan,
  ImportScopeKind,
  PlannedVarWrite,
  TransactionRecord,
  TRANSACTION_HISTORY_DIR,
  TRANSACTION_VERSION,
  parseImportFile,
  planImport,
  serializeTransaction,
  transactionFilename,
} from "./exportImportPure";
import type { WorkflowModule, VarDecl } from "./workflowModulePure";

/**
 * Read the per-project vars map from `Projects/<slug>/STATUS.md`. Equivalent
 * to `explainWorkflow.ts:readProjectVars` but inlined here so this module
 * doesn't transitively pull `openAgent.ts` → `modals.ts` (Modal class) into
 * a vitest run that mocks `obsidian` minimally.
 */
function readProjectVars(app: App, project: string): Record<string, string> {
  const statusPath = `Projects/${project}/STATUS.md`;
  const file = app.vault.getAbstractFileByPath(statusPath);
  if (!(file instanceof TFile)) return {};
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!fm || typeof fm !== "object") return {};
  const raw = (fm as Record<string, unknown>).vars;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

// IO seam for `op-import-module` (OP-187 / Child 4 of OP-181). Two stages:
//
//   1. `prepareImport`  — parse the source file, plan the import. No vault
//                         mutation. Used by URI/CLI to return needs-input
//                         payloads when scope/project/vars haven't been
//                         supplied, and by the palette modal flow to drive
//                         per-var prompts.
//   2. `commitImport`   — execute the planned writes: backup any existing
//                         module file, write the new module, write var
//                         answers to the appropriate scope, append a
//                         transaction record. Atomicity-best-effort: writes
//                         are sequenced so a mid-flow failure leaves the
//                         transaction record absent (so undo refuses to
//                         touch a half-import — the user fixes and re-runs).

export interface ImportSourceResolved {
  /** Caller-supplied path. Recorded in the transaction record. */
  originalPath: string;
  /** Vault-relative path of the source if it lives in the vault, else null. */
  vaultPath: string | null;
  /** Raw file content. */
  raw: string;
}

export interface PreparedImport {
  source: ImportSourceResolved;
  module: WorkflowModule;
  body: string;
  plan: ImportPlan;
  /** Surface-level diagnostics from parseImportFile (warnings + errors). */
  diagnostics: ReturnType<typeof parseImportFile>["diagnostics"];
}

export interface PrepareImportArgs {
  /** Vault-relative or absolute path to the import bundle file. */
  sourcePath: string;
  /** Where the import lands. */
  targetScope: ImportScopeKind;
  /** Required when `targetScope === "project"`. */
  targetProjectSlug?: string;
  /** Pre-supplied var answers (URI / CLI param `var.<name>=<value>`). */
  varAnswers?: Record<string, string>;
  /**
   * Test seam: read raw file content. Defaults to vault-or-fs read using
   * the live `app`.
   */
  readFile?: (sourcePath: string) => Promise<ImportSourceResolved>;
}

/**
 * Stage 1: read + parse + plan. No vault mutation.
 *
 * Throws on hard input errors (file unreadable, frontmatter unparseable,
 * scope=project without slug). Soft errors (unknown var refs, etc.) flow
 * through `prepared.diagnostics`.
 */
export async function prepareImport(
  app: App,
  settings: OpSettings,
  args: PrepareImportArgs,
): Promise<PreparedImport> {
  const reader = args.readFile ?? ((p) => readImportSource(app, p));
  const source = await reader(args.sourcePath);

  const parsed = parseImportFile({
    sourcePath: source.originalPath,
    raw: source.raw,
    parseFrontmatter: (block) => {
      try {
        const out = parseYaml(block);
        return out && typeof out === "object" && !Array.isArray(out)
          ? (out as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    },
  });

  if (!parsed.module) {
    const first = parsed.diagnostics[0];
    throw new Error(
      `op-import-module: failed to parse ${source.originalPath} as a workflow module: ${first?.message ?? "unknown error"}`,
    );
  }

  if (args.targetScope === "project" && !args.targetProjectSlug?.trim()) {
    throw new Error(
      "op-import-module: targetProjectSlug is required when targetScope=project",
    );
  }

  const targetPath =
    args.targetScope === "global"
      ? `Projects/_op-modules/${parsed.module.id}.md`
      : `Projects/${args.targetProjectSlug!.trim()}/MODULES/${parsed.module.id}.md`;

  const existing = app.vault.getAbstractFileByPath(normalizePath(targetPath));
  const existingTargetPath = existing instanceof TFile ? existing.path : undefined;

  const projectVars =
    args.targetScope === "project" && args.targetProjectSlug
      ? readProjectVars(app, args.targetProjectSlug.trim())
      : {};

  const planArgs: Parameters<typeof planImport>[0] = {
    module: parsed.module,
    body: parsed.body,
    targetScope: args.targetScope,
    globalVars: settings.workflowVars,
    projectVars,
  };
  if (args.targetProjectSlug) planArgs.targetProjectSlug = args.targetProjectSlug;
  if (args.varAnswers) planArgs.varAnswers = args.varAnswers;
  if (existingTargetPath) planArgs.existingTargetPath = existingTargetPath;
  const plan = planImport(planArgs);

  return {
    source,
    module: parsed.module,
    body: parsed.body,
    plan,
    diagnostics: parsed.diagnostics,
  };
}

export interface CommitImportArgs {
  prepared: PreparedImport;
  /**
   * Final var answers (must cover every `prepared.plan.promptsNeeded.name`
   * not also covered by `prepared.plan.varsToWrite`). Empty string is a
   * valid answer; `undefined` means "skipped" and aborts the commit.
   */
  varAnswers?: Record<string, string>;
  /** Test seam: clock for the transaction filename. Defaults to `new Date()`. */
  now?: () => Date;
}

export interface ImportResult {
  /** Vault-relative path of the transaction record. */
  transactionPath: string;
  /** Vault-relative path the module landed at. */
  targetPath: string;
  scopeKind: ImportScopeKind;
  projectSlug?: string;
  /** Whether an existing file at the target was overwritten + backed up. */
  overwrote: boolean;
  /** Vault-relative path of the backup (set iff overwrote=true). */
  backupPath?: string;
  /** Vars written to settings/STATUS at land time. */
  varsWritten: PlannedVarWrite[];
}

/**
 * Stage 2: execute the planned writes.
 *
 * Strict guard on missing answers. The plan already split prompts vs auto-
 * fills; the caller must supply an answer for every `promptsNeeded` row
 * (whatever the user typed in the modal, or whatever the URI/CLI passed via
 * `var.<name>=`). Skipping is a hard error — partial state is the worst-of-
 * all-worlds outcome.
 */
export async function commitImport(
  app: App,
  settings: OpSettings,
  saveSettings: () => Promise<void>,
  args: CommitImportArgs,
): Promise<ImportResult> {
  const { prepared } = args;
  const answers = args.varAnswers ?? {};
  const now = args.now ?? (() => new Date());

  const missing = prepared.plan.promptsNeeded.filter(
    (p) => !Object.prototype.hasOwnProperty.call(answers, p.name),
  );
  if (missing.length > 0) {
    throw new Error(
      `op-import-module: missing answer for var(s): ${missing.map((m) => m.name).join(", ")}`,
    );
  }

  const date = now();
  const tsFilename = transactionFilename(date);
  const backupRoot = `${TRANSACTION_HISTORY_DIR}/${tsFilename}.bak`;
  const transactionPath = `${TRANSACTION_HISTORY_DIR}/${tsFilename}.json`;

  await ensureFolder(app, TRANSACTION_HISTORY_DIR);

  // 1. Back up an existing file at the target, if any.
  let backupPath: string | undefined;
  if (prepared.plan.overwrite && prepared.plan.backupRelPath) {
    const original = app.vault.getAbstractFileByPath(
      normalizePath(prepared.plan.backupRelPath),
    );
    if (original instanceof TFile) {
      const originalContent = await app.vault.read(original);
      backupPath = `${backupRoot}/${prepared.plan.backupRelPath}`;
      await ensureFolderRecursive(app, backupPath.slice(0, backupPath.lastIndexOf("/")));
      await app.vault.create(normalizePath(backupPath), originalContent);
    }
  }

  // 2. Write the module file (creating parent folders if needed).
  const targetPath = normalizePath(prepared.plan.targetPath);
  await ensureFolderRecursive(app, targetPath.slice(0, targetPath.lastIndexOf("/")));
  const newContent = serializeModuleForLanding({
    module: prepared.module,
    body: prepared.body,
    rewrittenProject: prepared.plan.rewrittenProject,
  });
  const existingTarget = app.vault.getAbstractFileByPath(targetPath);
  if (existingTarget instanceof TFile) {
    await app.vault.modify(existingTarget, newContent);
  } else {
    await app.vault.create(targetPath, newContent);
  }

  // 3. Write var answers — promptsNeeded + planned writes that weren't
  //    pre-existing — to the appropriate scope.
  const varsToCommit: PlannedVarWrite[] = [];
  for (const w of prepared.plan.varsToWrite) {
    if (w.preexisting) {
      varsToCommit.push(w); // recorded for traceability; no write
      continue;
    }
    await applyVarWrite(app, settings, w);
    varsToCommit.push(w);
  }
  for (const p of prepared.plan.promptsNeeded) {
    const value = answers[p.name];
    const w: PlannedVarWrite = pickPromptScope({
      name: p.name,
      value,
      targetScope: prepared.plan.rewrittenProject ? "project" : "global",
      slug: prepared.plan.rewrittenProject ?? undefined,
    });
    await applyVarWrite(app, settings, w);
    varsToCommit.push(w);
  }
  await saveSettings();

  // 4. Append the transaction record (last so undo never sees a half-import).
  const record: TransactionRecord = {
    version: TRANSACTION_VERSION,
    timestamp: date.toISOString(),
    command: "op-import-module",
    modulesLanded: [
      {
        sourcePath: prepared.source.originalPath,
        targetPath: prepared.plan.targetPath,
        scopeKind: prepared.plan.rewrittenProject ? "project" : "global",
        ...(prepared.plan.rewrittenProject
          ? { projectSlug: prepared.plan.rewrittenProject }
          : {}),
        originalProject: prepared.plan.originalProject,
        rewrittenProject: prepared.plan.rewrittenProject,
        overwrote: !!prepared.plan.overwrite,
        ...(backupPath ? { backupPath } : {}),
      },
    ],
    varsWritten: varsToCommit,
  };
  await app.vault.create(normalizePath(transactionPath), serializeTransaction(record));

  const out: ImportResult = {
    transactionPath,
    targetPath: prepared.plan.targetPath,
    scopeKind: prepared.plan.rewrittenProject ? "project" : "global",
    overwrote: !!prepared.plan.overwrite,
    varsWritten: varsToCommit,
  };
  if (prepared.plan.rewrittenProject) out.projectSlug = prepared.plan.rewrittenProject;
  if (backupPath) out.backupPath = backupPath;
  return out;
}

function pickPromptScope(args: {
  name: string;
  value: string;
  targetScope: ImportScopeKind;
  slug?: string;
}): PlannedVarWrite {
  const { name, value, targetScope, slug } = args;
  if (targetScope === "project" && slug) {
    return {
      name,
      value,
      scopeKind: "project",
      projectSlug: slug,
      preexisting: false,
    };
  }
  return { name, value, scopeKind: "global", preexisting: false };
}

async function applyVarWrite(
  app: App,
  settings: OpSettings,
  w: PlannedVarWrite,
): Promise<void> {
  if (w.scopeKind === "global") {
    settings.workflowVars[w.name] = w.value;
    return;
  }
  // project scope — write into Projects/<slug>/STATUS.md `vars:` map.
  if (!w.projectSlug) {
    throw new Error(`applyVarWrite: project-scope write missing projectSlug for ${w.name}`);
  }
  const statusPath = normalizePath(`Projects/${w.projectSlug}/STATUS.md`);
  const file = app.vault.getAbstractFileByPath(statusPath);
  if (!(file instanceof TFile)) {
    throw new Error(
      `op-import-module: cannot write project var ${w.name} — ${statusPath} is missing.`,
    );
  }
  await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
    const existing = fm.vars;
    const map: Record<string, string> =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as Record<string, string>) }
        : {};
    map[w.name] = w.value;
    fm.vars = map;
  });
}

/**
 * Re-serialize the module for landing. Strips the import-source frontmatter,
 * injects the rewritten `project:`, preserves every other declared field.
 * Re-uses the same canonical formatting as the export path.
 */
function serializeModuleForLanding(args: {
  module: WorkflowModule;
  body: string;
  rewrittenProject: string | null;
}): string {
  // Reuse formatExportFile via dynamic import would create a cycle; instead
  // build the same output here. Mirrors `formatExportFile`'s frontmatter
  // ordering exactly so a round-trip is identical.
  const { module, body, rewrittenProject } = args;
  const lines: string[] = [];
  lines.push("---");
  lines.push(`id: ${module.id}`);
  lines.push(`title: ${quoteYaml(module.title)}`);
  lines.push("type: workflow-module");
  lines.push(`scope: ${quoteYaml(module.scope)}`);
  if (rewrittenProject !== null && rewrittenProject !== "") {
    lines.push(`project: ${quoteYaml(rewrittenProject)}`);
  }
  if (module.agent) lines.push(`agent: ${quoteYaml(module.agent)}`);
  if (module.order !== 0) lines.push(`order: ${module.order}`);
  if (module.vars.length > 0) {
    lines.push("vars:");
    for (const decl of module.vars) {
      lines.push(`  - ${formatDecl(decl)}`);
    }
  }
  lines.push("---");
  lines.push("");
  lines.push(body.replace(/\s+$/, ""));
  lines.push("");
  return lines.join("\n");
}

function formatDecl(d: VarDecl): string {
  if (d.kind === "bare") return d.name;
  if (d.kind === "default") return `${d.name}=${d.value}`;
  const f: string[] = [`name: ${quoteYaml(d.name)}`];
  if (d.default !== undefined) f.push(`default: ${quoteYaml(d.default)}`);
  if (d.description !== undefined) f.push(`description: ${quoteYaml(d.description)}`);
  return `{ ${f.join(", ")} }`;
}

function quoteYaml(value: string): string {
  if (value === "") return '""';
  const needsQuote =
    /^[?\-:!*&|>%@`#]/.test(value) ||
    /[:#\n\r\t"'\\{}\[\],&*!|>%@?]/.test(value) ||
    /^(?:true|false|null|yes|no|on|off|~)$/i.test(value) ||
    /^-?\d/.test(value) ||
    value.startsWith(" ") ||
    value.endsWith(" ");
  if (!needsQuote) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function ensureFolder(app: App, path: string): Promise<void> {
  const norm = normalizePath(path);
  if (!app.vault.getAbstractFileByPath(norm)) {
    await app.vault.createFolder(norm);
  }
}

async function ensureFolderRecursive(app: App, path: string): Promise<void> {
  if (!path) return;
  const norm = normalizePath(path);
  const parts = norm.split("/");
  let cumulative = "";
  for (const part of parts) {
    if (!part) continue;
    cumulative = cumulative ? `${cumulative}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(cumulative)) {
      await app.vault.createFolder(cumulative);
    }
  }
}

async function readImportSource(
  app: App,
  sourcePath: string,
): Promise<ImportSourceResolved> {
  // Prefer a vault file (covers vault-relative paths and absolute paths that
  // happen to live inside the vault). Fall back to fs for absolute paths.
  const vaultRelative = sourcePath.startsWith("/") ? null : normalizePath(sourcePath);
  if (vaultRelative) {
    const file = app.vault.getAbstractFileByPath(vaultRelative);
    if (file instanceof TFile) {
      const raw = await app.vault.read(file);
      return { originalPath: sourcePath, vaultPath: file.path, raw };
    }
  }
  if (isAbsolute(sourcePath)) {
    const raw = await fs.readFile(sourcePath, "utf8");
    return { originalPath: sourcePath, vaultPath: null, raw };
  }
  throw new Error(
    `op-import-module: cannot read ${sourcePath} — not found in vault, and not an absolute filesystem path.`,
  );
}
