import type { WorkflowDiagnostic } from "./workflowDiagnostic";

// Workflow-module schema, types, and pure parsers. OP-195 (1b) of the OP-184
// umbrella. No I/O, no Obsidian imports — every input flows in via arguments.
//
// A workflow module is a markdown file whose frontmatter declares a partition
// of the composed workflow. Files live in either of two places:
//
//   - Global:      Projects/_op-modules/<id>.md
//   - Per-project: Projects/<slug>/MODULES/<id>.md
//
// A per-project module of the same id shadows the global (per-project wins, no
// merge). The IO loader in `workflowModule.ts` walks the vault and applies
// shadowing; this module owns shape decisions only.
//
// Frontmatter contract:
//
//   ---
//   id: review-and-merge       # required, must match the source filename basename
//   title: "Review and merge"  # required
//   type: workflow-module      # required, exact literal
//   scope: pre-commit          # required string — partition key for collision check
//   project: obsidian-projects # optional — restrict to one project (slug)
//   agent: claude              # optional — restrict to one agent id
//   order: 10                  # optional integer (default 0) — sort key within a scope
//   vars:                      # optional list of VarDecl
//     - foo                    # bare
//     - bar=baz                # default-shorthand
//     - qux=                   # explicit empty default (distinct from bare)
//     - { name: pkg, default: op-obsidian, description: "Package name" }
//   ---
//
// Composition (resolving variables across scopes, applying user values, etc.)
// is OP-197 (1d). This file ships load-and-validate primitives.

/**
 * Typed declaration of a single variable consumed by a workflow module.
 *
 * - `bare` — the module names a variable but supplies no default. Caller (1d's
 *   composer) must satisfy it from a higher-precedence source or surface a
 *   diagnostic.
 * - `default` — the module supplies a default value as a string. Empty-string
 *   default (`name=`) is intentional and distinct from `bare`.
 * - `object` — full form with optional default and optional one-line
 *   description. Description surfaces in settings UIs and the future
 *   `op-list-vars` CLI.
 */
export type VarDecl =
  | { kind: "bare"; name: string }
  | { kind: "default"; name: string; value: string }
  | { kind: "object"; name: string; default?: string; description?: string };

/** Where a loaded module came from. Carried on `WorkflowModule` for diagnostics + shadowing. */
export type ModuleSource =
  | { kind: "global"; path: string }
  | { kind: "project"; path: string; projectSlug: string };

/** Parsed and validated module. */
export interface WorkflowModule {
  id: string;
  title: string;
  scope: string;
  project?: string;
  agent?: string;
  /** Integer sort key within a scope. Default 0 when frontmatter omits it. */
  order: number;
  /** OP-192: when true, this module is emitted as an on-demand skill instead
   *  of being inlined into the composed prompt. Default false. */
  lazy: boolean;
  /** OP-192: one-line activation hint used as the emitted skill's
   *  `description:`. Optional; lazy modules without it fall back to `title`. */
  description?: string;
  vars: VarDecl[];
  source: ModuleSource;
}

/**
 * Result of parsing a single var declaration. `decl` is `null` only when a
 * `malformed-frontmatter` diagnostic is also returned — caller should drop the
 * entry but keep walking the rest of the list.
 */
export interface ParseVarDeclResult {
  decl: VarDecl | null;
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Parse a single var declaration from raw YAML-decoded input. Pure function.
 *
 * String-input rules:
 *   - No `=` → `{ kind: "bare", name }` after trimming the surrounding
 *     whitespace from the name. Empty/whitespace-only string → diagnostic.
 *   - First `=` splits into `name` and `value`. ONLY the FIRST `=` splits —
 *     `name=foo=bar` yields name="name", value="foo=bar".
 *   - Empty `name` (`=value`) → diagnostic (malformed-frontmatter).
 *   - Empty `value` (`name=`) → `{ kind: "default", name, value: "" }`. The
 *     trailing `=` is the user's explicit signal "default-of-empty-string"
 *     and is preserved verbatim (distinct from `bare`).
 *
 * Object-input rules:
 *   - `name` is required and must be a non-empty string.
 *   - `default` if present must be a string (Date/number → diagnostic).
 *   - `description` if present must be a string.
 *   - Unknown keys are tolerated (forward-compat for future fields).
 *
 * Anything else (number, boolean, Date, null, array) → diagnostic.
 *
 * The caller (`parseVarDecls`) attaches `moduleId` to diagnostics this function
 * emits — this function is decoupled from module identity so it can be unit-
 * tested in isolation.
 */
export function parseVarDecl(raw: unknown): ParseVarDeclResult {
  if (typeof raw === "string") {
    return parseStringVarDecl(raw);
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw) && !(raw instanceof Date)) {
    return parseObjectVarDecl(raw as Record<string, unknown>);
  }
  return {
    decl: null,
    diagnostics: [
      {
        code: "malformed-frontmatter",
        severity: "error",
        message: `Invalid var declaration: expected string or object, got ${describe(raw)}.`,
      },
    ],
  };
}

function parseStringVarDecl(raw: string): ParseVarDeclResult {
  const eqIdx = raw.indexOf("=");
  if (eqIdx === -1) {
    const name = raw.trim();
    if (!name) {
      return {
        decl: null,
        diagnostics: [
          {
            code: "malformed-frontmatter",
            severity: "error",
            message: `Invalid var declaration: empty string.`,
          },
        ],
      };
    }
    return { decl: { kind: "bare", name }, diagnostics: [] };
  }

  const rawName = raw.slice(0, eqIdx);
  const value = raw.slice(eqIdx + 1);
  const name = rawName.trim();
  if (!name) {
    return {
      decl: null,
      diagnostics: [
        {
          code: "malformed-frontmatter",
          severity: "error",
          message: `Invalid var declaration: empty name in ${JSON.stringify(raw)}.`,
        },
      ],
    };
  }
  return { decl: { kind: "default", name, value }, diagnostics: [] };
}

function parseObjectVarDecl(obj: Record<string, unknown>): ParseVarDeclResult {
  const rawName = obj.name;
  if (typeof rawName !== "string" || rawName.trim().length === 0) {
    return {
      decl: null,
      diagnostics: [
        {
          code: "malformed-frontmatter",
          severity: "error",
          message: `Invalid var declaration: object form requires a non-empty string \`name\` (got ${describe(rawName)}).`,
        },
      ],
    };
  }
  const name = rawName.trim();

  const decl: { kind: "object"; name: string; default?: string; description?: string } = {
    kind: "object",
    name,
  };
  const diagnostics: WorkflowDiagnostic[] = [];

  if (Object.prototype.hasOwnProperty.call(obj, "default")) {
    const def = obj.default;
    if (typeof def !== "string") {
      diagnostics.push({
        code: "malformed-frontmatter",
        severity: "error",
        message: `Invalid var declaration ${JSON.stringify(name)}: \`default\` must be a string (got ${describe(def)}). Quote the value in YAML to keep it as a string.`,
        varName: name,
      });
    } else {
      decl.default = def;
    }
  }

  if (Object.prototype.hasOwnProperty.call(obj, "description")) {
    const desc = obj.description;
    if (typeof desc !== "string") {
      diagnostics.push({
        code: "malformed-frontmatter",
        severity: "error",
        message: `Invalid var declaration ${JSON.stringify(name)}: \`description\` must be a string (got ${describe(desc)}).`,
        varName: name,
      });
    } else {
      decl.description = desc;
    }
  }

  if (diagnostics.length > 0) return { decl: null, diagnostics };
  return { decl, diagnostics: [] };
}

export interface ParseVarDeclsResult {
  decls: VarDecl[];
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Parse a `vars:` list. Accepts unknown — undefined / missing field is fine
 * (returns empty list, no diagnostics). Anything that isn't an array (string,
 * scalar, object) → one `malformed-frontmatter` diagnostic and an empty list.
 *
 * Duplicate names within one module emit a `malformed-frontmatter` diagnostic
 * per duplicate (with `varName` set to the colliding name); the second
 * occurrence is dropped from the returned list. The first wins.
 */
export function parseVarDecls(rawVars: unknown): ParseVarDeclsResult {
  if (rawVars === undefined || rawVars === null) {
    return { decls: [], diagnostics: [] };
  }
  if (!Array.isArray(rawVars)) {
    return {
      decls: [],
      diagnostics: [
        {
          code: "malformed-frontmatter",
          severity: "error",
          message: `\`vars\` must be a list (got ${describe(rawVars)}).`,
        },
      ],
    };
  }

  const decls: VarDecl[] = [];
  const seen = new Set<string>();
  const diagnostics: WorkflowDiagnostic[] = [];

  for (const entry of rawVars) {
    const result = parseVarDecl(entry);
    diagnostics.push(...result.diagnostics);
    if (!result.decl) continue;
    if (seen.has(result.decl.name)) {
      diagnostics.push({
        code: "malformed-frontmatter",
        severity: "error",
        message: `Duplicate var \`${result.decl.name}\` declared more than once in this module — keeping the first declaration, dropping later ones.`,
        varName: result.decl.name,
      });
      continue;
    }
    seen.add(result.decl.name);
    decls.push(result.decl);
  }

  return { decls, diagnostics };
}

export interface ParseModuleArgs {
  /** Filename basename without `.md`. parseModule asserts it equals `frontmatter.id`. */
  id: string;
  frontmatter: Record<string, unknown> | null | undefined;
  source: ModuleSource;
}

export interface ParseModuleResult {
  module: WorkflowModule | null;
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Parse one module from its filename basename, frontmatter, and source. Pure.
 *
 * Returns `module: null` (with diagnostics) when the frontmatter is missing,
 * not a `workflow-module` type, or fails core validation (id mismatch, missing
 * required field, wrong scalar type). Returns a populated `WorkflowModule`
 * when validation succeeds — even if `vars` parsing emitted per-entry
 * diagnostics; bad var entries are dropped from `module.vars` but the module
 * itself is still loadable.
 */
export function parseModule(args: ParseModuleArgs): ParseModuleResult {
  const { id, frontmatter, source } = args;
  const diagnostics: WorkflowDiagnostic[] = [];
  const path = source.path;

  if (!frontmatter || typeof frontmatter !== "object") {
    return {
      module: null,
      diagnostics: [
        {
          code: "malformed-frontmatter",
          severity: "error",
          message: `${path}: missing or empty frontmatter — workflow modules require frontmatter with \`type: workflow-module\`.`,
          moduleId: id,
          extra: { path },
        },
      ],
    };
  }

  if (frontmatter.type !== "workflow-module") {
    return {
      module: null,
      diagnostics: [
        {
          code: "malformed-frontmatter",
          severity: "error",
          message: `${path}: \`type\` must be \`workflow-module\` (got ${describe(frontmatter.type)}).`,
          moduleId: id,
          extra: { path },
        },
      ],
    };
  }

  const fmId = frontmatter.id;
  if (typeof fmId !== "string" || fmId.length === 0) {
    diagnostics.push(invalidFieldDiag(path, id, "id", fmId, "non-empty string"));
  } else if (fmId !== id) {
    diagnostics.push({
      code: "malformed-frontmatter",
      severity: "error",
      message: `${path}: frontmatter \`id\` (${JSON.stringify(fmId)}) must match the filename basename (${JSON.stringify(id)}).`,
      moduleId: id,
      extra: { path, expected: id, actual: fmId },
    });
  }

  const title = frontmatter.title;
  if (typeof title !== "string" || title.length === 0) {
    diagnostics.push(invalidFieldDiag(path, id, "title", title, "non-empty string"));
  }

  const scope = frontmatter.scope;
  if (typeof scope !== "string" || scope.length === 0) {
    diagnostics.push(invalidFieldDiag(path, id, "scope", scope, "non-empty string"));
  }

  let project: string | undefined;
  if (Object.prototype.hasOwnProperty.call(frontmatter, "project")) {
    const v = frontmatter.project;
    if (v !== undefined && v !== null) {
      if (typeof v !== "string") {
        diagnostics.push(invalidFieldDiag(path, id, "project", v, "non-empty string"));
      } else if (v.trim().length > 0) {
        project = v;
      }
      // empty / whitespace-only string is silently treated as absent — authors
      // sometimes write `project: ""` to mean "no restriction"; honour that intent.
    }
  }

  let agent: string | undefined;
  if (Object.prototype.hasOwnProperty.call(frontmatter, "agent")) {
    const v = frontmatter.agent;
    if (v !== undefined && v !== null) {
      if (typeof v !== "string") {
        diagnostics.push(invalidFieldDiag(path, id, "agent", v, "non-empty string"));
      } else if (v.trim().length > 0) {
        agent = v;
      }
      // empty / whitespace-only string treated as absent (same reasoning as project).
    }
  }

  let order = 0;
  if (Object.prototype.hasOwnProperty.call(frontmatter, "order")) {
    const v = frontmatter.order;
    if (v !== undefined && v !== null) {
      if (typeof v !== "number" || !Number.isInteger(v)) {
        diagnostics.push(invalidFieldDiag(path, id, "order", v, "integer"));
      } else {
        order = v;
      }
    }
  }

  let lazy = false;
  if (Object.prototype.hasOwnProperty.call(frontmatter, "lazy")) {
    const v = frontmatter.lazy;
    if (v !== undefined && v !== null) {
      if (typeof v !== "boolean") {
        diagnostics.push(invalidFieldDiag(path, id, "lazy", v, "boolean"));
      } else {
        lazy = v;
      }
    }
  }

  let description: string | undefined;
  if (Object.prototype.hasOwnProperty.call(frontmatter, "description")) {
    const v = frontmatter.description;
    if (v !== undefined && v !== null) {
      if (typeof v !== "string") {
        diagnostics.push(invalidFieldDiag(path, id, "description", v, "string"));
      } else if (v.trim().length > 0) {
        description = v;
      }
    }
  }

  const varsResult = parseVarDecls(frontmatter.vars);
  for (const d of varsResult.diagnostics) {
    diagnostics.push({ ...d, moduleId: id, extra: { ...(d.extra ?? {}), path } });
  }

  // Hard-fail diagnostics (missing/invalid required fields, id mismatch) make
  // the module unusable. The check is "did any diagnostic so far signal a
  // structural problem" — vars-only diagnostics don't disqualify the module.
  const hardFail =
    diagnostics.length > varsResult.diagnostics.length
      ? diagnostics.slice(0, diagnostics.length - varsResult.diagnostics.length)
      : [];
  if (hardFail.length > 0) {
    return { module: null, diagnostics };
  }

  const module: WorkflowModule = {
    id,
    title: title as string,
    scope: scope as string,
    project,
    agent,
    order,
    lazy,
    ...(description !== undefined ? { description } : {}),
    vars: varsResult.decls,
    source,
  };
  return { module, diagnostics };
}

/**
 * Detect cross-module variable collisions within a single scope.
 *
 * For each `(scope, varName)` pair declared by 2+ modules in the input, emit
 * one `intra-scope-collision` diagnostic naming all colliding module ids in
 * stable order (by module id). Pure — caller decides which modules are in
 * scope (after shadowing, after project filtering).
 */
export function validateIntraScopeCollisions(modules: WorkflowModule[]): WorkflowDiagnostic[] {
  // Group declared var names by (scope, varName) → moduleIds.
  const groups = new Map<string, { scope: string; varName: string; moduleIds: string[] }>();
  for (const m of modules) {
    for (const v of m.vars) {
      const key = `${m.scope} ${v.name}`;
      const existing = groups.get(key);
      if (existing) {
        existing.moduleIds.push(m.id);
      } else {
        groups.set(key, { scope: m.scope, varName: v.name, moduleIds: [m.id] });
      }
    }
  }

  const diagnostics: WorkflowDiagnostic[] = [];
  for (const { scope, varName, moduleIds } of groups.values()) {
    if (moduleIds.length < 2) continue;
    const sorted = [...moduleIds].sort();
    diagnostics.push({
      code: "intra-scope-collision",
      severity: "error",
      message: `Variable \`${varName}\` declared by multiple modules at scope \`${scope}\`: ${sorted.map((s) => `\`${s}\``).join(", ")}.`,
      varName,
      extra: { scope, moduleIds: sorted },
    });
  }
  return diagnostics;
}

function describe(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (v instanceof Date) return `Date(${v.toISOString()}) — quote the value in YAML to keep it as a string`;
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function invalidFieldDiag(
  path: string,
  id: string,
  field: string,
  value: unknown,
  expected: string,
): WorkflowDiagnostic {
  return {
    code: "malformed-frontmatter",
    severity: "error",
    message: `${path}: \`${field}\` must be a ${expected} (got ${describe(value)}).`,
    moduleId: id,
    extra: { path, field, expected, actual: describe(value) },
  };
}
