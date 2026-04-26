// Pure data layer for the launch-time variable override panel (OP-204 / 3d).
// Builds a `PanelRow[]` from the loaded modules + per-layer var maps so the
// modal IO seam can render rows with canonical scope badges, populate "show
// all" vs "only-referenced" views, and edit the launch-override map. The
// composer (`composeWorkflowPure.ts`) remains the single source of truth for
// resolution; this layer only summarises the precedence chain for display.
//
// No Obsidian imports, no I/O, no clock — every input flows in as plain data.

import type {
  LoadedModule,
  UserVarScope,
} from "./composeWorkflowPure";
import type { VarDecl, WorkflowModule } from "./workflowModulePure";
import {
  PRECEDENCE_SCOPES,
  type PrecedenceScopeAbbrev,
  type PrecedenceScopeLabel,
} from "./workflowDiagnosticFormat";

/**
 * One row in the launch-modal "Workflow variables" panel. Covers the four
 * precedence layers (Module / Global / Project / Launch); the modal renders a
 * compact label + badge for the *current* (winning) layer and exposes the
 * full per-layer breakdown for the disclosure dropdown.
 *
 * `currentScope` is `null` only when no layer supplies a value (`isUnset`
 * surfaces this for the UI). The panel still lets the user set a Launch
 * override on those rows — that's the primary affordance for satisfying a
 * `missing-var` diagnostic at launch time.
 */
export interface PanelRow {
  name: string;
  /** First module declaration's description, when authored. */
  description?: string;
  /** Currently-resolved value (after the precedence chain). `null` when unset. */
  currentValue: string | null;
  /** Layer that supplied `currentValue`, or `null` when every layer was empty. */
  currentScope: UserVarScope | null;
  /** Full canonical label for `currentScope`. Omitted when `currentScope` is null. */
  currentScopeLabel?: PrecedenceScopeLabel;
  /** Single-letter abbreviation paired with `currentScopeLabel`. Tooltip-only per OP-201 contract. */
  currentScopeAbbrev?: PrecedenceScopeAbbrev;
  /** Per-layer values. `undefined` means the layer didn't supply this var. Empty string is a real value. */
  defaults: {
    module?: { value: string; moduleId: string };
    global?: string;
    project?: string;
    launch?: string;
  };
  /** True iff at least one composed module body references `{{vars.<name>}}`. */
  isReferenced: boolean;
  /** True iff the Launch layer carries this var (i.e. the user has applied an override). */
  hasLaunchOverride: boolean;
  /** True iff every layer is empty AND `isReferenced` — surfaces "missing var" rows. */
  isUnset: boolean;
}

export interface BuildPanelRowsArgs {
  loadedModules: LoadedModule[];
  globalVars: Record<string, string>;
  projectVars: Record<string, string>;
  launchVars: Record<string, string>;
  /**
   * Optional set of var names referenced in the composed step's modules — when
   * supplied, rows for those names get `isReferenced: true`. The modal uses
   * this to power the "only-referenced" toggle without re-walking the
   * composer pipeline.
   */
  referencedNames?: ReadonlySet<string>;
}

/**
 * Build one panel row per **declared** user var across the loaded module set,
 * union'd with names that appear only at the Global / Project / Launch layers
 * (a launch-time override on an undeclared name is still a valid row — the
 * user might be overriding a name a module references via `{{vars.<name>}}`
 * without declaring it). Rows are sorted by name so the modal's render order
 * is deterministic across reloads.
 *
 * The Module layer's value is taken from the lowest-id module that declares
 * the name with a default — same tie-break the composer uses (`a.id.localeCompare(b.id)`).
 * Bare declarations (no inline default) contribute the declaration but no
 * default value; Global/Project/Launch can satisfy them.
 */
export function buildPanelRows(args: BuildPanelRowsArgs): PanelRow[] {
  const { loadedModules, globalVars, projectVars, launchVars, referencedNames } = args;

  // Index declarations by name, deterministically ordered by module id so
  // first-seen-wins matches the composer's intra-scope-collision tie-break.
  const declsByName = new Map<string, { module: WorkflowModule; decl: VarDecl }[]>();
  const sortedModules = [...loadedModules].sort((a, b) =>
    a.module.id.localeCompare(b.module.id),
  );
  for (const lm of sortedModules) {
    for (const decl of lm.module.vars) {
      const list = declsByName.get(decl.name) ?? [];
      list.push({ module: lm.module, decl });
      declsByName.set(decl.name, list);
    }
  }

  // Union of every name seen at any layer or any declaration.
  const allNames = new Set<string>();
  for (const name of declsByName.keys()) allNames.add(name);
  for (const name of Object.keys(globalVars)) allNames.add(name);
  for (const name of Object.keys(projectVars)) allNames.add(name);
  for (const name of Object.keys(launchVars)) allNames.add(name);

  const rows: PanelRow[] = [];
  for (const name of [...allNames].sort()) {
    const moduleHit = firstModuleDefault(declsByName.get(name) ?? []);
    const description = firstDescription(declsByName.get(name) ?? []);

    const defaults: PanelRow["defaults"] = {};
    if (moduleHit) defaults.module = moduleHit;
    if (Object.prototype.hasOwnProperty.call(globalVars, name)) {
      defaults.global = globalVars[name];
    }
    if (Object.prototype.hasOwnProperty.call(projectVars, name)) {
      defaults.project = projectVars[name];
    }
    if (Object.prototype.hasOwnProperty.call(launchVars, name)) {
      defaults.launch = launchVars[name];
    }

    // Walk lowest → highest, later wins. Mirrors `resolveUserVar` so the panel
    // and the composer agree byte-for-byte on which layer wins.
    let currentValue: string | null = null;
    let currentScope: UserVarScope | null = null;
    if (defaults.module) {
      currentValue = defaults.module.value;
      currentScope = "module";
    }
    if (defaults.global !== undefined) {
      currentValue = defaults.global;
      currentScope = "global";
    }
    if (defaults.project !== undefined) {
      currentValue = defaults.project;
      currentScope = "project";
    }
    if (defaults.launch !== undefined) {
      currentValue = defaults.launch;
      currentScope = "launch";
    }

    const row: PanelRow = {
      name,
      currentValue,
      currentScope,
      defaults,
      isReferenced: referencedNames ? referencedNames.has(name) : false,
      hasLaunchOverride: defaults.launch !== undefined,
      isUnset: currentScope === null,
    };
    if (description) row.description = description;
    if (currentScope) {
      row.currentScopeLabel = PRECEDENCE_SCOPES[currentScope].label;
      row.currentScopeAbbrev = PRECEDENCE_SCOPES[currentScope].abbrev;
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Apply a Launch override for `name` → `value`. Returns a NEW map (does not
 * mutate `existing`) so the modal can drive its state with a single `current`
 * pointer. Empty string is preserved as a distinct value — matches the
 * composer's "empty Launch override wins" semantics.
 */
export function mergeLaunchOverride(
  existing: Record<string, string>,
  name: string,
  value: string,
): Record<string, string> {
  return { ...existing, [name]: value };
}

/**
 * Clear a Launch override for `name`. Returns a NEW map. No-op when the key
 * isn't present. Used by the row's "Reset to default" button.
 */
export function clearLaunchOverride(
  existing: Record<string, string>,
  name: string,
): Record<string, string> {
  if (!Object.prototype.hasOwnProperty.call(existing, name)) return existing;
  const next = { ...existing };
  delete next[name];
  return next;
}

/**
 * Coerce a frontmatter `launch_vars` mapping into a `Record<string, string>`.
 * The carry-through path persists this on the issue note's frontmatter, so
 * `metadataCache` may hand back values typed by the YAML parser
 * (numbers, booleans, dates). Stringify scalars; drop everything else.
 *
 * Returns `{}` when `raw` is missing or unusable. Symmetric helper for the
 * write side (`stringifyLaunchVars`) lives in the modal IO seam since it
 * needs an `App` to call `processFrontMatter` and isn't pure.
 */
export function readLaunchVarsFromFrontmatter(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === "string") {
      out[key] = val;
    } else if (typeof val === "number" || typeof val === "boolean") {
      out[key] = String(val);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function moduleVarDefault(v: VarDecl): string | null {
  if (v.kind === "bare") return null;
  if (v.kind === "default") return v.value;
  if (v.kind === "object") return v.default ?? null;
  return null;
}

function firstModuleDefault(
  hits: { module: WorkflowModule; decl: VarDecl }[],
): { value: string; moduleId: string } | undefined {
  for (const h of hits) {
    const def = moduleVarDefault(h.decl);
    if (def !== null) return { value: def, moduleId: h.module.id };
  }
  return undefined;
}

function firstDescription(
  hits: { module: WorkflowModule; decl: VarDecl }[],
): string | undefined {
  for (const h of hits) {
    if (h.decl.kind === "object" && typeof h.decl.description === "string") {
      return h.decl.description;
    }
  }
  return undefined;
}
