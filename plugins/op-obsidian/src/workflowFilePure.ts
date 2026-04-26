import type { WorkflowDiagnostic } from "./workflowDiagnostic";
import type { BadModelSpec } from "./modelRegistry";
import { validateModelName } from "./modelRegistry";

// Workflow-file schema, types, and pure parsers. OP-196 (1c) of the OP-184
// umbrella. No I/O, no Obsidian imports — every input flows in via arguments.
//
// A workflow file lives at `Projects/<slug>/WORKFLOW.md` (per-project) or at
// `Projects/_op-workflow.md` (global default that per-project files reach via
// `extends:`). Frontmatter declares the schema version, project slug, default
// agent + model, optional `extends:`, and the list of step records. The
// markdown body is opaque prose for now — future v2 schema may grow body
// semantics (a step body that templates inline content, for instance), but
// today only the synthesised legacy-fallback path attaches body content.
//
// Frontmatter contract:
//
//   ---
//   type: workflow                      # required, exact literal
//   schema: 1                           # required integer; locks the contract
//   project: obsidian-projects          # required string
//   default_agent: claude               # list-or-scalar
//   default_model: opus                 # list-or-scalar-or-keyed-map
//   extends: Projects/_op-workflow.md   # optional, vault-relative
//   steps:                              # required (in modern shape)
//     - step: kickoff
//       modules: [orient, identify-issue]
//       agent: claude                   # optional override
//       model: opus                     # optional override
//   ---
//
// Composition (resolving modules into step bodies, applying user vars,
// merging with `extends:` parent step lists) is OP-197 (1d). This file ships
// load-and-validate primitives.

/**
 * Canonicalized agent specification — always a non-empty string array. A
 * scalar `default_agent: claude` becomes `["claude"]`; a list passes through.
 * Order is preserved, duplicates dropped (first wins).
 */
export type AgentSpec = string[];

/**
 * Canonicalized model specification.
 *
 * - `kind: "all"` — scalar or list. Applies to every agent in the surrounding
 *   `AgentSpec`. Composition (1d) iterates the agents and validates each.
 * - `kind: "perAgent"` — keyed map: `{ claude: "opus", gemini: ["pro", "flash"] }`.
 *   Each value is itself a list-or-scalar, normalised to a string array.
 *
 * The two kinds are kept distinct (rather than collapsed into a single
 * `Record<string, string[]>` with a magic `*` key) so the renderer can tell
 * "applies to every agent the user lists" from "explicit per-agent
 * assignment" without inspecting the agent list at the same time.
 */
export type ModelSpec =
  | { kind: "all"; values: string[] }
  | { kind: "perAgent"; perAgent: Record<string, string[]> };

/**
 * One step in a workflow. `agent` and `model` are optional overrides — when
 * absent, composition uses the workflow's defaults.
 *
 * `legacyKickoffBody` is populated only on the synthetic step that the
 * legacy-fallback ladder (shapes 1, 2, 3, 5) attaches the entire WORKFLOW.md
 * body to. Modern workflows leave it `undefined`.
 */
export interface WorkflowStep {
  step: string;
  modules: string[];
  agent?: AgentSpec;
  model?: ModelSpec;
  legacyKickoffBody?: string;
}

/**
 * Where a parsed workflow came from. Carried on `WorkflowFile` so diagnostics
 * and downstream surfaces can name the source path without re-deriving it.
 */
export interface WorkflowFileSource {
  /** Vault-relative path of the WORKFLOW.md the parser saw. */
  path: string;
  /** Project slug (the `<slug>` in `Projects/<slug>/WORKFLOW.md`). */
  project: string;
  /**
   * `true` if the file was synthesised via the legacy fallback ladder. The
   * legacy synthesiser still produces a valid `WorkflowFile`; this flag is a
   * hint to surfaces that want to display "running in legacy compatibility
   * mode" warnings.
   */
  isLegacy: boolean;
}

/**
 * Parsed and validated workflow. Composition (1d) consumes this shape; this
 * file produces it.
 */
export interface WorkflowFile {
  source: WorkflowFileSource;
  type: "workflow";
  schema: 1;
  project: string;
  defaultAgent: AgentSpec;
  defaultModel: ModelSpec;
  /** Resolved vault-relative path of the parent file, or `null` if no inheritance. */
  extendsPath: string | null;
  steps: WorkflowStep[];
}

/** Re-export for convenience — recovery dialog at 3e (OP-184) consumes this shape. */
export type { BadModelSpec };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function describe(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return "array";
  if (v instanceof Date) return "Date";
  return typeof v;
}

function invalidFieldDiag(
  path: string,
  field: string,
  expected: string,
  value: unknown,
): WorkflowDiagnostic {
  return {
    code: "malformed-frontmatter",
    severity: "error",
    message: `${path}: ${field} must be ${expected}, got ${describe(value)}.`,
    extra: { path, field, expected, actual: describe(value) },
  };
}

function dedupKeepingOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// list-or-scalar agent parser
// ---------------------------------------------------------------------------

export interface ParseAgentSpecResult {
  value: AgentSpec | null;
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Parse a list-or-scalar agent value.
 *
 * - String → `[trim(string)]`. Empty/whitespace-only string → diagnostic.
 * - Array of strings → trimmed, dropped-empty, dedup-preserving order. Empty
 *   array → diagnostic.
 * - Anything else → diagnostic.
 *
 * `field` and `path` are caller-supplied so diagnostics can name the source
 * file and the offending frontmatter field. `optional` skips the diagnostic
 * for `undefined` input (used for per-step `agent:` overrides).
 */
export function parseAgentSpec(
  raw: unknown,
  ctx: { path: string; field: string; optional?: boolean },
): ParseAgentSpecResult {
  if (raw === undefined || raw === null) {
    if (ctx.optional) return { value: null, diagnostics: [] };
    return {
      value: null,
      diagnostics: [invalidFieldDiag(ctx.path, ctx.field, "a string or list of strings", raw)],
    };
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return {
        value: null,
        diagnostics: [invalidFieldDiag(ctx.path, ctx.field, "a non-empty string", raw)],
      };
    }
    return { value: [trimmed], diagnostics: [] };
  }
  if (Array.isArray(raw)) {
    const out: string[] = [];
    const diagnostics: WorkflowDiagnostic[] = [];
    for (const entry of raw) {
      if (typeof entry !== "string") {
        diagnostics.push(
          invalidFieldDiag(ctx.path, ctx.field, "every entry to be a string", entry),
        );
        continue;
      }
      const trimmed = entry.trim();
      if (!trimmed) continue; // silently drop blank entries — author convenience
      out.push(trimmed);
    }
    if (diagnostics.length > 0) {
      return { value: null, diagnostics };
    }
    if (out.length === 0) {
      return {
        value: null,
        diagnostics: [invalidFieldDiag(ctx.path, ctx.field, "at least one non-empty string", raw)],
      };
    }
    return { value: dedupKeepingOrder(out), diagnostics: [] };
  }
  return {
    value: null,
    diagnostics: [invalidFieldDiag(ctx.path, ctx.field, "a string or list of strings", raw)],
  };
}

// ---------------------------------------------------------------------------
// list-or-scalar-or-keyed-map model parser
// ---------------------------------------------------------------------------

export interface ParseModelSpecResult {
  value: ModelSpec | null;
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Parse a list-or-scalar-or-keyed-map model value.
 *
 * - String → `{ kind: "all", values: [trim(string)] }`.
 * - Array of strings → `{ kind: "all", values: trimmed-dedup }`.
 * - Plain object (not Date, not Array) → `{ kind: "perAgent", perAgent }`
 *   where each value is itself parsed list-or-scalar.
 * - Anything else → diagnostic.
 *
 * Empty `kind: "all"` lists and empty `kind: "perAgent"` objects emit
 * diagnostics — there's no useful semantics for "this step accepts no model."
 */
export function parseModelSpec(
  raw: unknown,
  ctx: { path: string; field: string; optional?: boolean },
): ParseModelSpecResult {
  if (raw === undefined || raw === null) {
    if (ctx.optional) return { value: null, diagnostics: [] };
    return {
      value: null,
      diagnostics: [
        invalidFieldDiag(ctx.path, ctx.field, "a string, list of strings, or per-agent map", raw),
      ],
    };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return {
        value: null,
        diagnostics: [invalidFieldDiag(ctx.path, ctx.field, "a non-empty string", raw)],
      };
    }
    return { value: { kind: "all", values: [trimmed] }, diagnostics: [] };
  }

  if (Array.isArray(raw)) {
    const out: string[] = [];
    const diagnostics: WorkflowDiagnostic[] = [];
    for (const entry of raw) {
      if (typeof entry !== "string") {
        diagnostics.push(
          invalidFieldDiag(ctx.path, ctx.field, "every entry to be a string", entry),
        );
        continue;
      }
      const trimmed = entry.trim();
      if (!trimmed) continue;
      out.push(trimmed);
    }
    if (diagnostics.length > 0) {
      return { value: null, diagnostics };
    }
    if (out.length === 0) {
      return {
        value: null,
        diagnostics: [invalidFieldDiag(ctx.path, ctx.field, "at least one non-empty string", raw)],
      };
    }
    return { value: { kind: "all", values: dedupKeepingOrder(out) }, diagnostics: [] };
  }

  // Plain object: per-agent map. Reject Date and other class instances.
  if (typeof raw === "object" && !(raw instanceof Date)) {
    const obj = raw as Record<string, unknown>;
    const perAgent: Record<string, string[]> = {};
    const diagnostics: WorkflowDiagnostic[] = [];
    for (const [agent, value] of Object.entries(obj)) {
      const trimmedAgent = agent.trim();
      if (!trimmedAgent) {
        diagnostics.push(
          invalidFieldDiag(ctx.path, `${ctx.field}.<key>`, "a non-empty agent id", agent),
        );
        continue;
      }
      // Re-use the list-or-scalar parser for the value, but in non-optional
      // mode and with a nested-field name for diagnostic clarity.
      const sub = parseAgentSpec(value, {
        path: ctx.path,
        field: `${ctx.field}.${trimmedAgent}`,
      });
      if (sub.value !== null) {
        perAgent[trimmedAgent] = sub.value;
      }
      diagnostics.push(...sub.diagnostics);
    }
    if (Object.keys(perAgent).length === 0) {
      // Either the input was `{}` or every entry was malformed. Emit a
      // standalone diagnostic so the caller sees "the field has no usable
      // entries" even when individual entries already produced diagnostics.
      diagnostics.push(
        invalidFieldDiag(ctx.path, ctx.field, "at least one agent -> model entry", raw),
      );
      return { value: null, diagnostics };
    }
    return { value: { kind: "perAgent", perAgent }, diagnostics };
  }

  return {
    value: null,
    diagnostics: [
      invalidFieldDiag(ctx.path, ctx.field, "a string, list of strings, or per-agent map", raw),
    ],
  };
}

// ---------------------------------------------------------------------------
// Step parser
// ---------------------------------------------------------------------------

interface ParseStepArgs {
  raw: unknown;
  index: number;
  path: string;
}

interface ParseStepResult {
  step: WorkflowStep | null;
  diagnostics: WorkflowDiagnostic[];
}

function parseStep({ raw, index, path }: ParseStepArgs): ParseStepResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw instanceof Date) {
    return {
      step: null,
      diagnostics: [
        invalidFieldDiag(path, `steps[${index}]`, "a step record (mapping)", raw),
      ],
    };
  }
  const obj = raw as Record<string, unknown>;
  const diagnostics: WorkflowDiagnostic[] = [];

  const stepIdRaw = obj.step;
  if (typeof stepIdRaw !== "string" || !stepIdRaw.trim()) {
    diagnostics.push(
      invalidFieldDiag(path, `steps[${index}].step`, "a non-empty string", stepIdRaw),
    );
    return { step: null, diagnostics };
  }
  const stepId = stepIdRaw.trim();

  const modulesRaw = obj.modules;
  let modules: string[] = [];
  if (modulesRaw === undefined || modulesRaw === null) {
    modules = [];
  } else if (Array.isArray(modulesRaw)) {
    const accumulated: string[] = [];
    for (const m of modulesRaw) {
      if (typeof m !== "string") {
        diagnostics.push(
          invalidFieldDiag(
            path,
            `steps[${index}].modules`,
            "every entry to be a module id string",
            m,
          ),
        );
        continue;
      }
      const trimmed = m.trim();
      if (trimmed) accumulated.push(trimmed);
    }
    modules = dedupKeepingOrder(accumulated);
  } else {
    diagnostics.push(
      invalidFieldDiag(path, `steps[${index}].modules`, "a list of module ids", modulesRaw),
    );
    return { step: null, diagnostics };
  }

  const agentRes = parseAgentSpec(obj.agent, {
    path,
    field: `steps[${index}].agent`,
    optional: true,
  });
  diagnostics.push(...agentRes.diagnostics);

  const modelRes = parseModelSpec(obj.model, {
    path,
    field: `steps[${index}].model`,
    optional: true,
  });
  diagnostics.push(...modelRes.diagnostics);

  const step: WorkflowStep = {
    step: stepId,
    modules,
  };
  if (agentRes.value !== null) step.agent = agentRes.value;
  if (modelRes.value !== null) step.model = modelRes.value;

  return { step, diagnostics };
}

// ---------------------------------------------------------------------------
// Top-level parseWorkflowFile
// ---------------------------------------------------------------------------

export interface ParseWorkflowArgs {
  /** Vault-relative path of the source file, used in diagnostics. */
  path: string;
  /** Project slug — caller derives this from the file path. */
  project: string;
  /** Frontmatter object (may be `null` to indicate "no frontmatter at all"). */
  frontmatter: Record<string, unknown> | null;
  /** Whether the synthesizer marked this as legacy. */
  isLegacy?: boolean;
}

export interface ParseWorkflowResult {
  workflow: WorkflowFile | null;
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Parse a modern workflow frontmatter into a `WorkflowFile`. Caller is
 * responsible for handling legacy fallback (see `classifyLegacy` /
 * `synthesizeLegacyWorkflow`) — this function assumes a modern shape and
 * emits diagnostics for any required-field violation.
 *
 * Pure: no IO, no Obsidian imports. Returns `workflow: null` when the file
 * cannot be salvaged (missing required fields, wrong type, schema mismatch);
 * `extends:` resolution is the IO layer's job — this function captures the
 * raw value into `extendsPath` after string validation.
 */
export function parseWorkflowFile(args: ParseWorkflowArgs): ParseWorkflowResult {
  const { path, project, frontmatter, isLegacy = false } = args;
  const diagnostics: WorkflowDiagnostic[] = [];

  if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
    diagnostics.push({
      code: "malformed-frontmatter",
      severity: "error",
      message: `${path}: frontmatter is missing or malformed.`,
      extra: { path },
    });
    return { workflow: null, diagnostics };
  }

  // type
  if (frontmatter.type !== "workflow") {
    diagnostics.push({
      code: "schema-mismatch",
      severity: "error",
      message: `${path}: type must be "workflow", got ${describe(frontmatter.type)}.`,
      extra: { path, field: "type", expected: "workflow", actual: describe(frontmatter.type) },
    });
    return { workflow: null, diagnostics };
  }

  // schema
  const schemaRaw = frontmatter.schema;
  if (schemaRaw !== 1) {
    diagnostics.push({
      code: "schema-mismatch",
      severity: "error",
      message: `${path}: schema must be 1, got ${describe(schemaRaw)} (${String(schemaRaw)}). This loader supports schema=1 only; future versions will be added with explicit migration.`,
      extra: { path, field: "schema", expected: "1", actual: String(schemaRaw) },
    });
    return { workflow: null, diagnostics };
  }

  // project (string, must match caller-derived project if both present)
  const projectField = frontmatter.project;
  if (typeof projectField !== "string" || !projectField.trim()) {
    diagnostics.push(invalidFieldDiag(path, "project", "a non-empty string", projectField));
    return { workflow: null, diagnostics };
  }
  if (projectField.trim() !== project) {
    diagnostics.push({
      code: "malformed-frontmatter",
      severity: "warning",
      message: `${path}: project field "${projectField.trim()}" does not match the file's project slug "${project}". Using the file's slug.`,
      extra: { path, field: "project", expected: project, actual: projectField.trim() },
    });
  }

  // default_agent
  const agentRes = parseAgentSpec(frontmatter.default_agent, {
    path,
    field: "default_agent",
  });
  diagnostics.push(...agentRes.diagnostics);
  if (agentRes.value === null) {
    return { workflow: null, diagnostics };
  }

  // default_model
  const modelRes = parseModelSpec(frontmatter.default_model, {
    path,
    field: "default_model",
  });
  diagnostics.push(...modelRes.diagnostics);
  if (modelRes.value === null) {
    return { workflow: null, diagnostics };
  }

  // extends (optional)
  let extendsPath: string | null = null;
  if (frontmatter.extends !== undefined && frontmatter.extends !== null) {
    if (typeof frontmatter.extends !== "string" || !frontmatter.extends.trim()) {
      diagnostics.push(
        invalidFieldDiag(path, "extends", "a vault-relative path string", frontmatter.extends),
      );
      return { workflow: null, diagnostics };
    }
    extendsPath = frontmatter.extends.trim();
  }

  // steps
  const stepsRaw = frontmatter.steps;
  if (!Array.isArray(stepsRaw)) {
    diagnostics.push(invalidFieldDiag(path, "steps", "a list of step records", stepsRaw));
    return { workflow: null, diagnostics };
  }
  const steps: WorkflowStep[] = [];
  const seenStepIds = new Set<string>();
  for (let i = 0; i < stepsRaw.length; i++) {
    const r = parseStep({ raw: stepsRaw[i], index: i, path });
    diagnostics.push(...r.diagnostics);
    if (!r.step) continue;
    if (seenStepIds.has(r.step.step)) {
      diagnostics.push({
        code: "malformed-frontmatter",
        severity: "error",
        message: `${path}: duplicate step id "${r.step.step}" at steps[${i}]. First occurrence wins.`,
        extra: { path, field: `steps[${i}].step`, expected: "unique step id", actual: r.step.step },
        stepId: r.step.step,
      });
      continue;
    }
    seenStepIds.add(r.step.step);
    steps.push(r.step);
  }

  const workflow: WorkflowFile = {
    source: { path, project, isLegacy },
    type: "workflow",
    schema: 1,
    project,
    defaultAgent: agentRes.value,
    defaultModel: modelRes.value,
    extendsPath,
    steps,
  };
  return { workflow, diagnostics };
}

// ---------------------------------------------------------------------------
// Legacy fallback ladder
// ---------------------------------------------------------------------------

/**
 * Classification of a raw WORKFLOW.md file's frontmatter shape. Drives the
 * legacy-fallback ladder. The pure layer reports the shape; the caller
 * (synthesizer) decides what to do.
 *
 * Six shapes (per OP-196 scope):
 *   1. No frontmatter at all                        -> legacy-1
 *   2. Frontmatter present, no `type:` field        -> legacy-2
 *   3. `type: workflow`, no `steps:` field           -> legacy-3
 *   4. `type: <not workflow>`                        -> legacy-4 (drop file)
 *   5. Frontmatter parses to `null`                  -> legacy-5
 *   6. Body starts with `---` after fence            -> "modern" — the fence
 *      detector already handles this; the test fixture locks the regression.
 *
 * Modern files (frontmatter has `type: workflow` and `steps`) classify as
 * `modern`.
 */
export type LegacyShape =
  | "modern"
  | "legacy-1"
  | "legacy-2"
  | "legacy-3"
  | "legacy-4"
  | "legacy-5";

export interface LegacyClassification {
  shape: LegacyShape;
  /** The full body content (post-frontmatter) — populated for shapes 1, 2, 3, 5. */
  body: string;
}

/**
 * Strip frontmatter the same way `promptBuild.ts:stripFrontmatter` does:
 * find the first `\n---` after position 3 (the opening fence's last char).
 * If no closing fence, the whole file is body. The fence-detection runs
 * against the FIRST `---` only, so HR-style `---` lines in the body don't
 * confuse the parser.
 *
 * Exported so the legacy synthesizer can re-use it without depending on
 * `promptBuild.ts`. Behaviour MUST stay byte-for-byte compatible.
 */
export function stripWorkflowFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  const afterFence = raw.indexOf("\n", end + 4);
  return afterFence === -1 ? "" : raw.slice(afterFence + 1);
}

/**
 * Classify a raw WORKFLOW.md file's shape from its file content + the parsed
 * frontmatter. The frontmatter argument comes from the IO layer (which uses
 * Obsidian's `metadataCache` or a YAML library).
 *
 * Inputs:
 *   - `raw`: full file content as string. Used to extract the body for
 *     legacy synthesis and to detect "no frontmatter at all" by looking for
 *     the opening fence.
 *   - `frontmatter`: parsed YAML object, or `null` if YAML parsed to null,
 *     or `undefined` if no frontmatter fence was present.
 *
 * Returns the classified shape and (for legacy shapes 1, 2, 3, 5) the body
 * content the caller can splice into a synthetic kickoff step.
 */
export function classifyLegacy(
  raw: string,
  frontmatter: Record<string, unknown> | null | undefined,
): LegacyClassification {
  const body = stripWorkflowFrontmatter(raw);

  // Shape 1: no frontmatter fence at all.
  if (!raw.startsWith("---")) {
    return { shape: "legacy-1", body };
  }

  // Shape 5: frontmatter fence present but YAML parses to null. Either an
  // empty fence (`---\n---`) or a fence whose content is `null` / `~` / etc.
  if (frontmatter === null) {
    return { shape: "legacy-5", body };
  }

  // Shape 2: frontmatter present but no `type:` key.
  if (frontmatter === undefined || !("type" in frontmatter)) {
    return { shape: "legacy-2", body };
  }

  // Shape 4: type is set but isn't "workflow".
  if (frontmatter.type !== "workflow") {
    return { shape: "legacy-4", body };
  }

  // Shape 3: type is workflow but no `steps:` field.
  if (!("steps" in frontmatter)) {
    return { shape: "legacy-3", body };
  }

  // Shape 6 / modern: fence detection has already run; the body's HR `---`
  // lines have no effect on classification.
  return { shape: "modern", body };
}

/**
 * Synthesise a `WorkflowFile` for legacy shapes 1, 2, 3, 5. The synthesised
 * workflow has one step (`step: "kickoff", modules: []`) carrying the
 * entire body verbatim in `legacyKickoffBody`. Defaults are empty arrays /
 * `kind: "all"` with no values — the launch overrides will fill them.
 *
 * Caller (IO layer) must guarantee `shape` is one of `legacy-1`, `legacy-2`,
 * `legacy-3`, `legacy-5` — `legacy-4` (wrong type) should produce a
 * `schema-mismatch` diagnostic and `null` workflow instead.
 */
export function synthesizeLegacyWorkflow(args: {
  path: string;
  project: string;
  body: string;
  shape: LegacyShape;
}): WorkflowFile {
  const { path, project, body, shape } = args;
  if (shape === "modern" || shape === "legacy-4") {
    // Defensive: callers should never reach this path with a non-synthesisable
    // shape. Surface the misuse loudly rather than silently producing a
    // workflow that hides the underlying schema problem.
    throw new Error(
      `synthesizeLegacyWorkflow: shape ${shape} is not synthesisable — ` +
        `callers must route modern through parseWorkflowFile and legacy-4 through schema-mismatch.`,
    );
  }
  const step: WorkflowStep = {
    step: "kickoff",
    modules: [],
    legacyKickoffBody: body,
  };
  return {
    source: { path, project, isLegacy: true },
    type: "workflow",
    schema: 1,
    project,
    defaultAgent: [],
    defaultModel: { kind: "all", values: [] },
    extendsPath: null,
    steps: [step],
  };
}

// ---------------------------------------------------------------------------
// Model validation
// ---------------------------------------------------------------------------

/**
 * Walk a parsed workflow and validate every model name against the per-agent
 * registry. Emits one `bad-model` `WorkflowDiagnostic` per failure, carrying
 * the full `BadModelSpec` payload in `extra`.
 *
 * This is a separate pass from `parseWorkflowFile` because:
 *   1. The workflow's schema is independent of the registry — a workflow can
 *      be schema-valid yet reference a mistyped model name. Keeping the
 *      passes separate means a registry update doesn't invalidate cached
 *      parse results.
 *   2. The registry import is the only reason this file would otherwise need
 *      to depend on `modelRegistry.ts`.
 *
 * Algorithm:
 *   - For each step (modern only — legacy synthetic steps have no `agent`/
 *     `model` overrides), resolve the effective `(agents, model)` pair:
 *       agents = step.agent ?? workflow.defaultAgent
 *       model  = step.model ?? workflow.defaultModel
 *   - For `kind: "all"`, validate every (agent, modelName) cross-product.
 *   - For `kind: "perAgent"`, validate only the explicit pairings.
 *   - The same logic runs once for the workflow's defaults (stepId=
 *     "<defaults>") so a typo in `default_model:` surfaces even when no
 *     step references it.
 */
export function validateWorkflowModels(workflow: WorkflowFile): WorkflowDiagnostic[] {
  const diagnostics: WorkflowDiagnostic[] = [];

  const validatePair = (
    agents: AgentSpec,
    model: ModelSpec,
    stepId: string,
  ): void => {
    if (model.kind === "all") {
      for (const agent of agents) {
        for (const name of model.values) {
          const r = validateModelName(agent, name, stepId);
          if (!r.ok) diagnostics.push(badModelDiagnostic(r.bad));
        }
      }
      return;
    }
    // perAgent — validate the explicit pairings, plus surface any agent in
    // the perAgent map that isn't in the surrounding agents list (warning).
    for (const [agent, names] of Object.entries(model.perAgent)) {
      if (!agents.includes(agent)) {
        diagnostics.push({
          code: "malformed-frontmatter",
          severity: "warning",
          message: `${workflow.source.path}: model declares a per-agent entry for "${agent}" but the surrounding agents list doesn't include it.`,
          extra: { path: workflow.source.path, field: "model", agent },
          stepId,
        });
      }
      for (const name of names) {
        const r = validateModelName(agent, name, stepId);
        if (!r.ok) diagnostics.push(badModelDiagnostic(r.bad));
      }
    }
  };

  validatePair(workflow.defaultAgent, workflow.defaultModel, "<defaults>");

  for (const step of workflow.steps) {
    if (step.legacyKickoffBody !== undefined) continue; // synthetic — skip
    // If the step inherits both agent and model from the workflow's defaults,
    // the `<defaults>` pass already validated the pair — don't double-emit.
    if (step.agent === undefined && step.model === undefined) continue;
    const agents = step.agent ?? workflow.defaultAgent;
    const model = step.model ?? workflow.defaultModel;
    validatePair(agents, model, step.step);
  }

  return diagnostics;
}

function badModelDiagnostic(bad: BadModelSpec): WorkflowDiagnostic {
  return {
    code: "bad-model",
    severity: "error",
    message:
      `Unknown model "${bad.badName}" for agent "${bad.agent}" at ${bad.stepId}. ` +
      `Allowed aliases: ${bad.allowedAliases.length ? bad.allowedAliases.join(", ") : "(none — agent unknown)"}. ` +
      `Allowed versioned ids: ${bad.allowedVersioned.length ? bad.allowedVersioned.join(", ") : "(none — agent unknown)"}.`,
    stepId: bad.stepId,
    extra: { ...bad },
  };
}
