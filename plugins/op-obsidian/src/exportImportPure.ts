// Pure helpers for OP-187 (Child 4 of OP-181): module export / import / undo.
// No I/O, no Obsidian imports — every input flows in via arguments. The IO
// seams (`exportModule.ts`, `importModule.ts`, `undoLastImport.ts`) wire vault
// reads and writes around these primitives.
//
// Surfaces:
//   - `formatExportFile`           — re-serialize a `WorkflowModule` + body as
//                                    a self-contained markdown file. Round-
//                                    trippable through `parseImportFile`.
//   - `parseImportFile`            — read a markdown blob into frontmatter +
//                                    body + parsed module + referenced vars.
//   - `extractVarReferences`       — list `{{vars.NAME}}` references in a body.
//   - `planImport`                 — decide target path, scope rewrites, which
//                                    vars need user input, what gets backed up.
//   - `serializeTransaction` /
//     `parseTransaction`           — read/write the transaction-record JSON.
//
// Schema doc: see `docs/plans/OP-181-workflow-modules.md` §"Export / import —
// modules are just markdown" and OP-187's issue body Plan section.

import {
  parseModule,
  type ModuleSource,
  type VarDecl,
  type WorkflowModule,
} from "./workflowModulePure";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

// ---------------------------------------------------------------------------
// Export bundle file shape
// ---------------------------------------------------------------------------

export interface FormatExportArgs {
  /** Parsed source module (frontmatter + identity). */
  module: WorkflowModule;
  /** The module body (frontmatter stripped). */
  body: string;
  /**
   * When set, overrides the `project:` frontmatter field in the exported
   * file. Useful for batch exports that re-target a slug that doesn't
   * exist in the destination vault — though the recommended path is to
   * leave the export faithful and let `op-import-module` rewrite at land
   * time. Default: preserve the source module's `project:` field.
   */
  overrideProject?: string | null;
}

/**
 * Serialize a workflow module as a self-contained markdown file: YAML
 * frontmatter (only the required + populated optional fields) followed by the
 * module body. Round-trips byte-equivalent through `parseImportFile` provided
 * the source body had no leading/trailing whitespace.
 *
 * Var declarations are written in their canonical form:
 *   - `kind: "bare"`     → `- name`
 *   - `kind: "default"`  → `- name=value`           (preserves empty value as `name=`)
 *   - `kind: "object"`   → `- { name: foo, default: "bar", description: "…" }`
 *
 * The object form quotes string values so YAML auto-coercion (Date, number)
 * can't bite a round-trip — see `workflowModulePure.ts` `parseObjectVarDecl`.
 */
export function formatExportFile(args: FormatExportArgs): string {
  const { module, body, overrideProject } = args;
  const lines: string[] = [];
  lines.push("---");
  lines.push(`id: ${module.id}`);
  lines.push(`title: ${yamlString(module.title)}`);
  lines.push("type: workflow-module");
  lines.push(`scope: ${yamlString(module.scope)}`);

  const project =
    overrideProject !== undefined ? overrideProject : (module.project ?? null);
  if (project !== null && project !== "") {
    lines.push(`project: ${yamlString(project)}`);
  }
  if (module.agent) {
    lines.push(`agent: ${yamlString(module.agent)}`);
  }
  if (module.order !== 0) {
    lines.push(`order: ${module.order}`);
  }
  if (module.vars.length > 0) {
    lines.push("vars:");
    for (const decl of module.vars) {
      lines.push(`  - ${formatVarDecl(decl)}`);
    }
  }
  lines.push("---");
  lines.push("");
  lines.push(body.replace(/\s+$/, ""));
  lines.push("");
  return lines.join("\n");
}

function formatVarDecl(decl: VarDecl): string {
  if (decl.kind === "bare") return decl.name;
  if (decl.kind === "default") return `${decl.name}=${decl.value}`;
  // object form
  const fragments: string[] = [`name: ${yamlString(decl.name)}`];
  if (decl.default !== undefined) {
    fragments.push(`default: ${yamlString(decl.default)}`);
  }
  if (decl.description !== undefined) {
    fragments.push(`description: ${yamlString(decl.description)}`);
  }
  return `{ ${fragments.join(", ")} }`;
}

/**
 * Quote any string that needs YAML quoting for safety. We over-quote rather
 * than try to be clever — the cost of an extra `"` per field is nothing, the
 * cost of a YAML round-trip surprise (a `2026-04-26` value silently parsing
 * as a Date) is real.
 */
function yamlString(value: string): string {
  // Empty string must be quoted to be distinguishable from null in YAML.
  if (value === "") return '""';
  // Quote anything containing characters that are unsafe as bare YAML scalars.
  const needsQuote =
    /^[?\-:!*&|>%@`#]/.test(value) ||
    /[:#\n\r\t"'\\{}\[\],&*!|>%@?]/.test(value) ||
    /^(?:true|false|null|yes|no|on|off|~)$/i.test(value) ||
    /^-?\d/.test(value) ||
    value.startsWith(" ") ||
    value.endsWith(" ");
  if (!needsQuote) return value;
  // Use double quotes with backslash escapes for `"` and `\`.
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// ---------------------------------------------------------------------------
// Import-side parse
// ---------------------------------------------------------------------------

export interface ParseImportFileArgs {
  /** Vault-relative or absolute path the raw text was read from — diagnostics tag this. */
  sourcePath: string;
  /** Full file content including the YAML frontmatter fence. */
  raw: string;
  /**
   * Frontmatter parser — Obsidian's `metadataCache` exposes a YAML→object
   * function; tests inject a thin one. Receives the *contents* of the
   * frontmatter (between the `---` fences, no fences) and returns either an
   * object (parsed YAML root mapping) or `null` (unparseable).
   */
  parseFrontmatter: (yamlBlock: string) => Record<string, unknown> | null;
}

export interface ParseImportFileResult {
  /** Parsed module if frontmatter validates; `null` otherwise. */
  module: WorkflowModule | null;
  /** Body with frontmatter stripped (frontmatter-less files = whole raw). */
  body: string;
  /** Distinct names referenced as `{{vars.<name>}}` in the body. */
  referencedVars: string[];
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Parse an import-bundle file into its constituent pieces. The source file is
 * assumed to be a workflow-module export (or any module markdown) — the
 * frontmatter MUST declare `type: workflow-module`. Frontmatter problems
 * surface as diagnostics rather than throws so callers can present them as
 * Notice + structured payload.
 */
export function parseImportFile(args: ParseImportFileArgs): ParseImportFileResult {
  const { sourcePath, raw, parseFrontmatter } = args;
  const diagnostics: WorkflowDiagnostic[] = [];

  const split = splitFrontmatter(raw);
  if (!split) {
    return {
      module: null,
      body: raw,
      referencedVars: [],
      diagnostics: [
        {
          code: "malformed-frontmatter",
          severity: "error",
          message: `${sourcePath}: missing YAML frontmatter — expected leading \`---\` fence with \`type: workflow-module\`.`,
          extra: { path: sourcePath },
        },
      ],
    };
  }
  const frontmatter = parseFrontmatter(split.frontmatter);
  if (!frontmatter) {
    return {
      module: null,
      body: split.body,
      referencedVars: [],
      diagnostics: [
        {
          code: "malformed-frontmatter",
          severity: "error",
          message: `${sourcePath}: failed to parse YAML frontmatter.`,
          extra: { path: sourcePath },
        },
      ],
    };
  }

  // Filename basename (without `.md`) is what `parseModule` uses as the id
  // identity check. For import we don't have a vault filename yet — fall back
  // to the frontmatter id when available, else a placeholder that will fail
  // the id-required check.
  const fallbackId =
    typeof frontmatter.id === "string" && frontmatter.id.trim().length > 0
      ? frontmatter.id.trim()
      : "(unknown-id)";

  const source: ModuleSource = { kind: "global", path: sourcePath };
  const parseResult = parseModule({
    id: fallbackId,
    frontmatter,
    source,
  });
  diagnostics.push(...parseResult.diagnostics);

  return {
    module: parseResult.module,
    body: split.body,
    referencedVars: extractVarReferences(split.body),
    diagnostics,
  };
}

/**
 * Split a markdown blob into `{ frontmatter, body }` if it begins with a
 * `---` fence; returns `null` otherwise. The frontmatter is the inner YAML
 * (no fences); the body is everything after the closing fence (one trailing
 * newline consumed).
 */
function splitFrontmatter(
  raw: string,
): { frontmatter: string; body: string } | null {
  if (!raw.startsWith("---")) return null;
  // Allow `---\n` or `---\r\n`.
  const firstNl = raw.indexOf("\n");
  if (firstNl === -1) return null;
  // Search for `\n---` followed by EOL or EOF.
  let from = firstNl + 1;
  while (from < raw.length) {
    const idx = raw.indexOf("\n---", from);
    if (idx === -1) return null;
    const after = idx + 4;
    if (after === raw.length || raw[after] === "\n" || raw[after] === "\r") {
      const frontmatter = raw.slice(firstNl + 1, idx).replace(/\r$/, "");
      // Body = everything after the closing fence's terminating newline.
      const bodyStart =
        after === raw.length
          ? raw.length
          : raw[after] === "\r"
            ? after + 2 // skip \r\n
            : after + 1; // skip \n
      const body = raw.slice(bodyStart);
      return { frontmatter, body };
    }
    from = after;
  }
  return null;
}

const VAR_REF_RE = /\{\{\s*vars\.([A-Za-z_][A-Za-z0-9_-]*)\s*\}\}/g;

/**
 * Distinct ordered list of `{{vars.<name>}}` references in a body. Matches
 * the renderer's `vars.<name>` syntax (see OP-194 / `renderTemplate.ts`).
 * Whitespace inside the braces is tolerated to match the renderer.
 */
export function extractVarReferences(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of body.matchAll(VAR_REF_RE)) {
    const name = match[1];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Import planning
// ---------------------------------------------------------------------------

export type ImportScopeKind = "global" | "project";

export interface PlanImportArgs {
  /** Parsed module (output of `parseImportFile`). Must be non-null at planning time. */
  module: WorkflowModule;
  /** Body of the import (frontmatter stripped). */
  body: string;
  /** Where the import lands. */
  targetScope: ImportScopeKind;
  /** Required when `targetScope === "project"`. */
  targetProjectSlug?: string;
  /**
   * The user's pre-supplied answers for any var the importer would otherwise
   * prompt for. Keyed by var name. Empty string is preserved as a real answer.
   */
  varAnswers?: Record<string, string>;
  /**
   * Vault-wide vars (`settings.workflowVars`). Keys present here at import
   * time skip the prompt because Global precedence already supplies them.
   */
  globalVars: Record<string, string>;
  /**
   * Per-project vars from the *target* project's STATUS.md. Keys present
   * here skip the prompt because Project precedence already supplies them.
   * Empty `{}` for global imports.
   */
  projectVars: Record<string, string>;
  /**
   * Vault-relative path of an existing module file at the chosen target,
   * if any. When set, the existing file is backed up and overwritten at
   * import time. Pure: caller pre-resolves; we only branch on its presence.
   */
  existingTargetPath?: string;
}

export interface VarPromptDescriptor {
  name: string;
  /** Pre-fill for the prompt. Empty string is a valid pre-fill (explicit `name=`). */
  prefill: string;
  /** Whether the module declared an inline default for this var. */
  hasModuleDefault: boolean;
  /** Optional description from object-form declarations. */
  description?: string;
}

export interface PlannedVarWrite {
  name: string;
  value: string;
  scopeKind: ImportScopeKind;
  projectSlug?: string;
  /**
   * `false` for vars this import will write; `true` for vars that already
   * existed at higher precedence and were skipped (recorded for traceability
   * only — undo never touches `preexisting=true` rows).
   */
  preexisting: boolean;
}

export interface ImportPlan {
  /** Vault-relative path the module file lands at. */
  targetPath: string;
  /**
   * The scope this import targets. Authoritative for var-write routing — do
   * NOT use `rewrittenProject` as a proxy, because a global import of a
   * per-project module has `rewrittenProject !== null` even though vars must
   * land at global scope.
   */
  targetScope: ImportScopeKind;
  /** Slug rewritten into the module's `project:` field (or `null` to clear). */
  rewrittenProject: string | null;
  /** Original `project:` from the import (or `null` if absent). */
  originalProject: string | null;
  /** Whether overwrite + backup will happen. */
  overwrite: boolean;
  /** When `overwrite=true`, the relative path under `<ts>.bak/` we'll back the original up to. */
  backupRelPath?: string;
  /** Vars the importer must prompt the user for (no higher-precedence value, no answer supplied). */
  promptsNeeded: VarPromptDescriptor[];
  /** Vars the importer will write to settings/STATUS at land time. */
  varsToWrite: PlannedVarWrite[];
  /** Vars referenced in the body but missing from any module's `vars:` declaration. Surfaced as warnings. */
  undeclaredVarRefs: string[];
}

/**
 * Plan the import: figure out target path, project rewrites, what to back up,
 * what vars to prompt for, what vars to write at land time.
 *
 * Pure — caller supplies the "exists?" check via `existingTargetPath` and the
 * higher-precedence var maps.
 */
export function planImport(args: PlanImportArgs): ImportPlan {
  const {
    module,
    body,
    targetScope,
    targetProjectSlug,
    varAnswers = {},
    globalVars,
    projectVars,
    existingTargetPath,
  } = args;

  if (targetScope === "project" && !targetProjectSlug?.trim()) {
    throw new Error("planImport: targetProjectSlug is required when targetScope=project");
  }

  const targetPath =
    targetScope === "global"
      ? `Projects/_op-modules/${module.id}.md`
      : `Projects/${targetProjectSlug!.trim()}/MODULES/${module.id}.md`;

  // Project rewrite: per-project landings always set `project:` to the slug
  // they land under. Global landings preserve the source `project:` field.
  const originalProject = module.project ?? null;
  const rewrittenProject =
    targetScope === "project" ? targetProjectSlug!.trim() : (module.project ?? null);

  const declarations = new Map<string, VarDecl>();
  for (const decl of module.vars) {
    declarations.set(decl.name, decl);
  }

  const referenced = extractVarReferences(body);
  const promptsNeeded: VarPromptDescriptor[] = [];
  const varsToWrite: PlannedVarWrite[] = [];
  const undeclaredVarRefs: string[] = [];

  for (const name of referenced) {
    const decl = declarations.get(name);
    if (!decl) {
      undeclaredVarRefs.push(name);
      continue;
    }

    // Higher-precedence sources shadow Module-default. Project beats Global.
    if (Object.prototype.hasOwnProperty.call(projectVars, name)) {
      varsToWrite.push({
        name,
        value: projectVars[name],
        scopeKind: "project",
        projectSlug: targetProjectSlug?.trim(),
        preexisting: true,
      });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(globalVars, name)) {
      varsToWrite.push({
        name,
        value: globalVars[name],
        scopeKind: "global",
        preexisting: true,
      });
      continue;
    }

    // No higher-precedence value. We need an answer from either varAnswers
    // (already supplied) or a prompt.
    const hasAnswer = Object.prototype.hasOwnProperty.call(varAnswers, name);
    const prefill = pickPrefill(decl);

    if (hasAnswer) {
      const answer = varAnswers[name];
      if (targetScope === "project") {
        varsToWrite.push({
          name,
          value: answer,
          scopeKind: "project",
          projectSlug: targetProjectSlug!.trim(),
          preexisting: false,
        });
      } else {
        varsToWrite.push({
          name,
          value: answer,
          scopeKind: "global",
          preexisting: false,
        });
      }
      continue;
    }

    promptsNeeded.push({
      name,
      prefill,
      hasModuleDefault: prefill !== "" || hasExplicitDefault(decl),
      description: decl.kind === "object" ? decl.description : undefined,
    });
  }

  const plan: ImportPlan = {
    targetPath,
    targetScope,
    rewrittenProject,
    originalProject,
    overwrite: !!existingTargetPath,
    promptsNeeded,
    varsToWrite,
    undeclaredVarRefs,
  };
  if (existingTargetPath) {
    plan.backupRelPath = existingTargetPath;
  }
  return plan;
}

function pickPrefill(decl: VarDecl): string {
  if (decl.kind === "default") return decl.value;
  if (decl.kind === "object" && typeof decl.default === "string") return decl.default;
  return "";
}

function hasExplicitDefault(decl: VarDecl): boolean {
  if (decl.kind === "default") return true;
  if (decl.kind === "object") return typeof decl.default === "string";
  return false;
}

// ---------------------------------------------------------------------------
// Transaction record
// ---------------------------------------------------------------------------

export const TRANSACTION_HISTORY_DIR = "Projects/_op-import-history";
export const TRANSACTION_VERSION = 1;

export interface TransactionModuleEntry {
  /** Original import source (vault-relative or absolute path passed to op-import-module). */
  sourcePath: string;
  /** Vault-relative path the module landed at. */
  targetPath: string;
  scopeKind: ImportScopeKind;
  projectSlug?: string;
  originalProject?: string | null;
  rewrittenProject?: string | null;
  overwrote: boolean;
  /** Set iff `overwrote=true`: vault-relative path of the backup copy. */
  backupPath?: string;
}

export interface TransactionVarEntry {
  name: string;
  value: string;
  scopeKind: ImportScopeKind;
  projectSlug?: string;
  /**
   * `false` for vars this import added (undo prunes them); `true` for vars
   * that already existed (undo leaves them alone).
   */
  preexisting: boolean;
}

export interface TransactionRecord {
  version: number;
  /** ISO 8601 UTC. */
  timestamp: string;
  /** Always "op-import-module" today; future commands may extend this. */
  command: "op-import-module";
  modulesLanded: TransactionModuleEntry[];
  varsWritten: TransactionVarEntry[];
}

export function serializeTransaction(record: TransactionRecord): string {
  return JSON.stringify(record, null, 2);
}

export interface ParseTransactionResult {
  record: TransactionRecord | null;
  error?: string;
}

/**
 * Parse a transaction-record JSON blob. Validates the shape strictly so a
 * corrupted history file surfaces a clear error rather than half-undoing
 * something. Forward-compat: unknown future versions are rejected.
 */
export function parseTransaction(raw: string): ParseTransactionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { record: null, error: `transaction record is not valid JSON: ${(e as Error).message}` };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { record: null, error: "transaction record is not an object" };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== TRANSACTION_VERSION) {
    return {
      record: null,
      error: `transaction record version ${JSON.stringify(obj.version)} is not supported (expected ${TRANSACTION_VERSION})`,
    };
  }
  if (typeof obj.timestamp !== "string" || obj.command !== "op-import-module") {
    return { record: null, error: "transaction record missing timestamp/command fields" };
  }
  if (!Array.isArray(obj.modulesLanded) || !Array.isArray(obj.varsWritten)) {
    return { record: null, error: "transaction record missing modulesLanded/varsWritten arrays" };
  }
  // Trust-but-verify each entry shape.
  const modulesLanded: TransactionModuleEntry[] = [];
  for (const entry of obj.modulesLanded) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.sourcePath !== "string" || typeof e.targetPath !== "string") {
      return { record: null, error: "modulesLanded entry missing sourcePath/targetPath" };
    }
    if (e.scopeKind !== "global" && e.scopeKind !== "project") {
      return { record: null, error: "modulesLanded entry has invalid scopeKind" };
    }
    const out: TransactionModuleEntry = {
      sourcePath: e.sourcePath,
      targetPath: e.targetPath,
      scopeKind: e.scopeKind,
      overwrote: e.overwrote === true,
    };
    if (typeof e.projectSlug === "string") out.projectSlug = e.projectSlug;
    if (typeof e.originalProject === "string" || e.originalProject === null) {
      out.originalProject = e.originalProject as string | null;
    }
    if (typeof e.rewrittenProject === "string" || e.rewrittenProject === null) {
      out.rewrittenProject = e.rewrittenProject as string | null;
    }
    if (typeof e.backupPath === "string") out.backupPath = e.backupPath;
    modulesLanded.push(out);
  }
  const varsWritten: TransactionVarEntry[] = [];
  for (const entry of obj.varsWritten) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.name !== "string" || typeof e.value !== "string") {
      return { record: null, error: "varsWritten entry missing name/value" };
    }
    if (e.scopeKind !== "global" && e.scopeKind !== "project") {
      return { record: null, error: "varsWritten entry has invalid scopeKind" };
    }
    const out: TransactionVarEntry = {
      name: e.name,
      value: e.value,
      scopeKind: e.scopeKind,
      preexisting: e.preexisting === true,
    };
    if (typeof e.projectSlug === "string") out.projectSlug = e.projectSlug;
    varsWritten.push(out);
  }
  return {
    record: {
      version: TRANSACTION_VERSION,
      timestamp: obj.timestamp,
      command: "op-import-module",
      modulesLanded,
      varsWritten,
    },
  };
}

/**
 * Compose a timestamp filename for `Projects/_op-import-history/<ts>.json`.
 * Uses local time, dash-separated, millisecond resolution. Milliseconds
 * prevent the `vault.create` collision that two back-to-back imports in the
 * same wall-clock second would otherwise cause. Caller picks the date.
 */
export function transactionFilename(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const pad3 = (n: number) => n.toString().padStart(3, "0");
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const ms = pad3(date.getMilliseconds());
  return `${y}${mo}${d}-${h}${mi}${s}-${ms}`;
}
