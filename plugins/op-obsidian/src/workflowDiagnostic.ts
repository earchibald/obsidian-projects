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
  /** Code-specific extras (e.g., `bad-model` carries `{ allowedAliases, … }`). */
  extra?: Record<string, unknown>;
}
