// Unified renderer for `WorkflowDiagnostic` records. Every diagnostic surface
// in the workflow-modules engine — Settings → Workflows panel (this issue),
// op-explain-workflow / op-list-vars CLIs (OP-203), editor squiggles (OP-207),
// dry-run banner (OP-206), launch-modal pre-flight (OP-204) — feeds its
// `WorkflowDiagnostic[]` through this one formatter. One shape in, one prose
// shape out. Pure: no Obsidian imports, no I/O.
//
// Public contract: `formatDiagnostic(d)` returns a `FormattedDiagnostic`
// carrying everything any UI surface needs (severity badge, code label,
// optional precedence-scope rendering, location summary, the diagnostic's own
// prose message). UI surfaces compose these fields; they do NOT re-derive
// labels by switching on `code` again. If you find yourself doing that in a
// caller, extend `FormattedDiagnostic` instead.
//
// Canonical scope names: when a diagnostic carries `extra.precedenceScope`
// (one of `module|global|project|launch`), the formatter exposes the full
// canonical name (e.g. `Module default`) for primary copy and the
// abbreviation (e.g. `M`) for compact tooltip text. Per OP-201 spec,
// abbreviations MUST NOT appear in primary copy.

import {
  assertNeverCode,
  type WorkflowDiagnostic,
  type WorkflowDiagnosticCode,
  type WorkflowDiagnosticSeverity,
} from "./workflowDiagnostic";

/**
 * Variable-resolution precedence stack. Higher level wins. Source of truth
 * for the four canonical scope names called out in OP-181 plan + OP-201.
 *
 * `module`  → a module's own `vars:` declaration default.
 * `global`  → vault-wide override (`Projects/_op-modules/_overrides.md`).
 * `project` → per-project override (`Projects/<slug>/MODULES/_overrides.md`).
 * `launch`  → per-launch context (computed from `pluginVarRegistry` plus the
 *             optional Workflow-variables panel — OP-204).
 */
export type PrecedenceScope = "module" | "global" | "project" | "launch";

export type PrecedenceScopeLabel =
  | "Module default"
  | "Global default"
  | "Project default"
  | "Launch override";

export type PrecedenceScopeAbbrev = "M" | "G" | "P" | "L";

interface PrecedenceScopeEntry {
  label: PrecedenceScopeLabel;
  abbrev: PrecedenceScopeAbbrev;
}

/**
 * Canonical lookup table. Use `precedenceScopeLabel(scope)` and
 * `precedenceScopeAbbrev(scope)` to read it; the table itself is exported
 * frozen so direct callers can iterate when rendering a reference panel.
 */
export const PRECEDENCE_SCOPES: Readonly<Record<PrecedenceScope, PrecedenceScopeEntry>> =
  Object.freeze({
    module: Object.freeze({ label: "Module default", abbrev: "M" }),
    global: Object.freeze({ label: "Global default", abbrev: "G" }),
    project: Object.freeze({ label: "Project default", abbrev: "P" }),
    launch: Object.freeze({ label: "Launch override", abbrev: "L" }),
  });

export function precedenceScopeLabel(scope: PrecedenceScope): PrecedenceScopeLabel {
  return PRECEDENCE_SCOPES[scope].label;
}

export function precedenceScopeAbbrev(scope: PrecedenceScope): PrecedenceScopeAbbrev {
  return PRECEDENCE_SCOPES[scope].abbrev;
}

/**
 * Type guard for `extra.precedenceScope`. Diagnostics emitted by 1b/1c/1d
 * may attach a precedence scope to indicate where a variable resolved (or
 * failed to resolve) in the stack. The formatter reads this opportunistically
 * — diagnostics without it render fine, just without the scope chip.
 */
export function isPrecedenceScope(x: unknown): x is PrecedenceScope {
  return x === "module" || x === "global" || x === "project" || x === "launch";
}

/**
 * Single-letter severity glyph. Compact UI surfaces (badges, gutters) use
 * this; primary copy uses the full severity word.
 */
export type SeverityBadge = "E" | "W" | "I";

export function severityBadge(s: WorkflowDiagnosticSeverity): SeverityBadge {
  switch (s) {
    case "error":
      return "E";
    case "warning":
      return "W";
    case "info":
      return "I";
  }
}

/**
 * Output of the formatter — every UI surface composes fields from this rather
 * than re-switching on `code`. Adding a field here is the migration path when
 * a new surface needs a different rendering of the same diagnostic.
 */
export interface FormattedDiagnostic {
  code: WorkflowDiagnosticCode;
  /** Sentence-case human label for the code, e.g. "Missing variable". */
  codeLabel: string;
  severity: WorkflowDiagnosticSeverity;
  severityBadge: SeverityBadge;
  /** Verbatim prose message from the source diagnostic. */
  message: string;
  /**
   * Compact location summary built from `moduleId` / `stepId` / `varName` /
   * `extra.path`, comma-separated. Empty string when none of those are set.
   */
  location: string;
  /**
   * Full canonical scope name for primary copy. Only populated when the
   * diagnostic carries `extra.precedenceScope`. Per OP-201 contract: this
   * field — never `scopeAbbrev` — is what user-visible primary text shows.
   */
  scopeLabel?: PrecedenceScopeLabel;
  /**
   * Compact abbreviation paired with `scopeLabel`. Use ONLY in tooltip text
   * or compact badge hovers. MUST NOT appear in primary copy.
   */
  scopeAbbrev?: PrecedenceScopeAbbrev;
  /**
   * Optional one-line hint for what the user can do about this diagnostic.
   * Surface it as a secondary line in modals; omit in compact contexts.
   */
  hint?: string;
}

const CODE_LABELS: Readonly<Record<WorkflowDiagnosticCode, string>> = Object.freeze({
  "bad-model": "Bad model spec",
  "missing-var": "Missing variable",
  "unknown-module": "Unknown module",
  "schema-mismatch": "Schema mismatch",
  "import-collision": "Import collision",
  "intra-scope-collision": "Intra-scope collision",
  "malformed-frontmatter": "Malformed frontmatter",
});

export function codeLabel(code: WorkflowDiagnosticCode): string {
  return CODE_LABELS[code];
}

const HINTS: Readonly<Record<WorkflowDiagnosticCode, string>> = Object.freeze({
  "bad-model":
    "Pick from the agent's allowed-models list, or open the recovery dialog to patch the workflow.",
  "missing-var":
    "Declare a default in the module's `vars:` block, or supply a value at the next-higher precedence scope.",
  "unknown-module":
    "Check the spelling, or create the module file at `Projects/_op-modules/<id>.md`.",
  "schema-mismatch":
    "Update the module to the current schema version. See docs/schema.md for the migration.",
  "import-collision":
    "Two modules contribute the same variable name at the same scope. Rename one, or move it to a higher scope so it shadows the other.",
  "intra-scope-collision":
    "Multiple modules declare the same scope key. Make the scope strings distinct, or merge the modules.",
  "malformed-frontmatter":
    "Open the module file and fix the highlighted field — the existing value is the wrong type.",
});

/**
 * Format one diagnostic. Pure: input → output, no side effects. Exhaustive
 * over `WorkflowDiagnosticCode` via `assertNeverCode` in the default branch
 * so adding a new code raises a TypeScript error here until handled.
 */
export function formatDiagnostic(d: WorkflowDiagnostic): FormattedDiagnostic {
  const code = d.code;
  // Compile-time exhaustiveness fence: keep the switch even though every
  // current branch returns the same shape — when a new code lands, this
  // forces a deliberate decision per code rather than a generic fallthrough.
  switch (code) {
    case "bad-model":
    case "missing-var":
    case "unknown-module":
    case "schema-mismatch":
    case "import-collision":
    case "intra-scope-collision":
    case "malformed-frontmatter":
      return buildFormatted(d);
    default:
      return assertNeverCode(code);
  }
}

export function formatDiagnostics(ds: readonly WorkflowDiagnostic[]): FormattedDiagnostic[] {
  return ds.map(formatDiagnostic);
}

function buildFormatted(d: WorkflowDiagnostic): FormattedDiagnostic {
  const out: FormattedDiagnostic = {
    code: d.code,
    codeLabel: codeLabel(d.code),
    severity: d.severity,
    severityBadge: severityBadge(d.severity),
    message: d.message,
    location: buildLocation(d),
    hint: HINTS[d.code],
  };
  const scope = readPrecedenceScope(d);
  if (scope) {
    out.scopeLabel = precedenceScopeLabel(scope);
    out.scopeAbbrev = precedenceScopeAbbrev(scope);
  }
  return out;
}

function buildLocation(d: WorkflowDiagnostic): string {
  const parts: string[] = [];
  if (d.moduleId) parts.push(`module ${d.moduleId}`);
  if (d.stepId) parts.push(`step ${d.stepId}`);
  if (d.varName) parts.push(`var ${d.varName}`);
  const path = d.extra && typeof d.extra.path === "string" ? d.extra.path : undefined;
  if (path) parts.push(path);
  return parts.join(" · ");
}

function readPrecedenceScope(d: WorkflowDiagnostic): PrecedenceScope | undefined {
  const raw = d.extra?.precedenceScope;
  return isPrecedenceScope(raw) ? raw : undefined;
}

/**
 * One-line plain-text rendering for CLI / log surfaces.
 *
 * Shape: `[E] <Code label> — <message>` with optional ` (in <location>)` and
 * ` [<scope label>]` suffixes. Primary-copy rule: full scope name, never the
 * abbreviation.
 */
export function diagnosticToLine(d: WorkflowDiagnostic): string {
  const f = formatDiagnostic(d);
  let line = `[${f.severityBadge}] ${f.codeLabel} — ${f.message}`;
  if (f.location) line += ` (in ${f.location})`;
  if (f.scopeLabel) line += ` [${f.scopeLabel}]`;
  return line;
}

/**
 * Multi-line rendering for in-modal / in-panel display. One diagnostic per
 * call; callers join the array of blocks with a blank line between for
 * scannability.
 *
 * Shape:
 *   <Code label>  (severity word)
 *   <location>             ← omitted when empty
 *   <scope label>          ← omitted when no scope
 *   <message>
 *   Hint: <hint>           ← omitted when no hint
 */
export function diagnosticToBlock(d: WorkflowDiagnostic): string {
  const f = formatDiagnostic(d);
  const lines: string[] = [];
  lines.push(`${f.codeLabel}  (${f.severity})`);
  if (f.location) lines.push(f.location);
  if (f.scopeLabel) lines.push(f.scopeLabel);
  lines.push(f.message);
  if (f.hint) lines.push(`Hint: ${f.hint}`);
  return lines.join("\n");
}
