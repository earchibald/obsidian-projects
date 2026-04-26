// Unified diagnostic record for the workflow-modules engine. Every error and
// warning the system emits — bad model spec, missing var, unknown module id,
// schema-version mismatch, import collision, malformed frontmatter, intra-scope
// collision — is a `WorkflowDiagnostic`. One shape, every surface.
//
// OP-194 (1a) declares the full union here and only emits `missing-var`. 1b/1c
// add emit sites for the remaining codes; the type itself is stable from this
// point on so consumers can pattern-match without breakage.

export type WorkflowDiagnosticCode =
  | "bad-model"
  | "missing-var"
  | "unknown-module"
  | "schema-mismatch"
  | "import-collision"
  | "intra-scope-collision"
  | "malformed-frontmatter";

export type WorkflowDiagnosticSeverity = "error" | "warning" | "info";

export interface WorkflowDiagnostic {
  code: WorkflowDiagnosticCode;
  severity: WorkflowDiagnosticSeverity;
  /** Human-readable, prose, no jargon. Surfaces verbatim in the formatter. */
  message: string;
  stepId?: string;
  moduleId?: string;
  varName?: string;
  /**
   * Code-specific structured payload. Consumers MUST use these fields rather
   * than parsing `message` — the message is for human display only and may be
   * reformatted without notice.
   *
   * Guaranteed keys by code:
   *   - `malformed-frontmatter` (from `parseModule` / `parseVarDecls`):
   *       - `path` (string) — vault-relative source file path (always present)
   *       - `field` (string) — frontmatter field name (present when the error
   *         is a scalar-field violation; absent for id-mismatch and
   *         vars-list errors)
   *       - `expected` (string) — human description of the expected type/value
   *         (present when `field` is present; for id-mismatch: the expected id)
   *       - `actual` (string) — `describe(value)` of the bad value (same
   *         presence rule as `expected`)
   *   - `intra-scope-collision`:
   *       - `scope` (string) — the scope key where the collision occurred
   *       - `moduleIds` (string[]) — sorted ids of the colliding modules
   */
  extra?: Record<string, unknown>;
}

/**
 * Exhaustiveness helper for switch statements over `WorkflowDiagnosticCode`.
 * Place in the `default` branch so TypeScript raises a compile error when a
 * new code is added to the union but not handled by the switch.
 *
 * @example
 * function describeCode(code: WorkflowDiagnosticCode): string {
 *   switch (code) {
 *     case "missing-var": return "…";
 *     // …
 *     default: return assertNeverCode(code);
 *   }
 * }
 */
export function assertNeverCode(x: never): never {
  throw new Error(`Unhandled WorkflowDiagnosticCode: ${JSON.stringify(x)}`);
}
