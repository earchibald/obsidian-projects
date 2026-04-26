import { App, TFile, normalizePath } from "obsidian";
import {
  classifyLegacy,
  parseWorkflowFile,
  synthesizeLegacyWorkflow,
  validateWorkflowModels,
  type WorkflowFile,
  type WorkflowStep,
} from "./workflowFilePure";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

export type {
  AgentSpec,
  BadModelSpec,
  LegacyClassification,
  LegacyShape,
  ModelSpec,
  ParseAgentSpecResult,
  ParseModelSpecResult,
  ParseWorkflowArgs,
  ParseWorkflowResult,
  WorkflowFile,
  WorkflowFileSource,
  WorkflowStep,
} from "./workflowFilePure";
export {
  classifyLegacy,
  parseAgentSpec,
  parseModelSpec,
  parseWorkflowFile,
  stripWorkflowFrontmatter,
  synthesizeLegacyWorkflow,
  validateWorkflowModels,
} from "./workflowFilePure";

const PROJECTS_ROOT = "Projects/";

export interface LoadWorkflowResult {
  /** Resolved + merged workflow, or `null` if the file couldn't be salvaged. */
  workflow: WorkflowFile | null;
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Load a project's `WORKFLOW.md`, applying:
 *   - Legacy fallback ladder (six shapes — see `classifyLegacy`).
 *   - One level of `extends:` inheritance against another workflow file
 *     (typically `Projects/_op-workflow.md`). Transitive chains are NOT
 *     followed — a parent's own `extends:` is ignored with a `schema-mismatch`
 *     diagnostic.
 *   - Model-name validation against `modelRegistry`.
 *
 * Pure logic (parsing, classification, merging) lives in `workflowFilePure.ts`.
 * This function is the IO seam:
 *
 *   1. Read the file's raw content + frontmatter (via metadataCache).
 *   2. Classify shape → modern or legacy-1..5.
 *   3. Modern → `parseWorkflowFile`. Legacy 1/2/3/5 → `synthesizeLegacyWorkflow`.
 *      Legacy 4 → emit `schema-mismatch` and return null.
 *   4. If the modern workflow declared `extends:`, recursively load the parent
 *      (one level only) and merge.
 *   5. Run `validateWorkflowModels` on the final merged workflow.
 *
 * Caller responsibility: invoke after `workspace.onLayoutReady` so
 * `metadataCache` has resolved frontmatter for the project's files. Earlier
 * calls may surface spurious `malformed-frontmatter` diagnostics.
 */
export async function loadWorkflowFile(
  app: App,
  project: string,
): Promise<LoadWorkflowResult> {
  const slug = project.trim();
  if (!slug) {
    return {
      workflow: null,
      diagnostics: [
        {
          code: "malformed-frontmatter",
          severity: "error",
          message: "loadWorkflowFile: project slug is required.",
          extra: { field: "project" },
        },
      ],
    };
  }
  const path = normalizePath(`${PROJECTS_ROOT}${slug}/WORKFLOW.md`);
  return loadAtPath(app, { path, project: slug, allowExtends: true });
}

interface LoadAtPathArgs {
  path: string;
  project: string;
  /**
   * When `false`, the loader rejects an `extends:` field on the loaded file
   * with a `schema-mismatch` diagnostic. Used for the recursive call so we
   * enforce the "one level only" v1 rule.
   */
  allowExtends: boolean;
}

async function loadAtPath(app: App, args: LoadAtPathArgs): Promise<LoadWorkflowResult> {
  const file = app.vault.getAbstractFileByPath(args.path);
  if (!(file instanceof TFile)) {
    return {
      workflow: null,
      diagnostics: [
        {
          code: "schema-mismatch",
          severity: "error",
          message: `Workflow file not found: ${args.path}.`,
          extra: { path: args.path, expected: "existing TFile", actual: "missing" },
        },
      ],
    };
  }
  const raw = await app.vault.read(file);
  // metadataCache.getFileCache(file)?.frontmatter:
  //   - `undefined` when the frontmatter fence is absent OR when the fence's
  //     YAML content is empty / parses to a scalar (e.g. `---\n---`).
  //     Obsidian's YAML engine yields `undefined` in both cases.
  //   - A FrontMatterCache object (extends Record<string, any>, includes a
  //     `position` key) when the fence contains parseable key-value YAML.
  //
  // We disambiguate "no fence at all" (shape 1) from "fence with empty/null
  // YAML" (shape 5) using the raw content's leading `---`, mapping Obsidian's
  // `undefined` → `null` so `classifyLegacy` can tell shape 1 from shape 5
  // without inspecting the raw string a second time.
  const fmCached = app.metadataCache.getFileCache(file)?.frontmatter;
  const fmInput: Record<string, unknown> | null | undefined = raw.startsWith("---")
    ? fmCached === undefined
      ? null
      : fmCached
    : undefined;

  const classification = classifyLegacy(raw, fmInput);

  // Legacy 1/2/3/5 — synthesize a workflow from the body.
  if (
    classification.shape === "legacy-1" ||
    classification.shape === "legacy-2" ||
    classification.shape === "legacy-3" ||
    classification.shape === "legacy-5"
  ) {
    const workflow = synthesizeLegacyWorkflow({
      path: args.path,
      project: args.project,
      body: classification.body,
      shape: classification.shape,
    });
    return { workflow, diagnostics: [legacyShapeDiagnostic(args.path, classification.shape)] };
  }

  // Legacy 4 — type field is set but isn't "workflow". Pre-OP-198 users may
  // have `type: <other>` (e.g. `type: note`) in their WORKFLOW.md from another
  // Obsidian plugin's metadata system. Post-OP-208 there is no legacy inline
  // blob to fall back to, so dropping the file silently would cause these users
  // to lose all workflow content after the cutover. Synthesise from the body
  // (same as shapes 1/2/3/5) and emit a warning so they know to fix the type
  // field, without breaking their kickoff prompt in the meantime.
  if (classification.shape === "legacy-4") {
    const actualType = (fmInput && typeof fmInput === "object" && !Array.isArray(fmInput))
      ? (fmInput as Record<string, unknown>).type
      : undefined;
    const workflow = synthesizeLegacyWorkflow({
      path: args.path,
      project: args.project,
      body: classification.body,
      shape: classification.shape,
    });
    return {
      workflow,
      diagnostics: [
        {
          code: "schema-mismatch",
          severity: "warning",
          message:
            `${args.path}: type must be "workflow", got "${String(actualType)}". ` +
            `Body wrapped into a synthetic kickoff step (legacy compatibility — OP-208 cutover). ` +
            `Set \`type: workflow\` (and add \`steps:\`) to silence this warning.`,
          extra: { path: args.path, field: "type", expected: "workflow", actual: String(actualType) },
        },
      ],
    };
  }

  // Modern — hand off to the pure parser.
  const parsed = parseWorkflowFile({
    path: args.path,
    project: args.project,
    frontmatter: fmInput as Record<string, unknown>,
  });
  if (!parsed.workflow) {
    return { workflow: null, diagnostics: parsed.diagnostics };
  }

  let workflow = parsed.workflow;
  const diagnostics = [...parsed.diagnostics];

  // extends: one level only. The recursive load forbids further extension.
  if (workflow.extendsPath !== null) {
    if (!args.allowExtends) {
      diagnostics.push({
        code: "schema-mismatch",
        severity: "warning",
        message: `${args.path}: nested extends is not supported (v1 allows one level only). Ignoring grandparent.`,
        extra: { path: args.path, field: "extends", expected: "absent for parent files", actual: workflow.extendsPath },
      });
    } else if (normalizePath(workflow.extendsPath) === args.path) {
      // Self-reference: the file's `extends:` points at itself. Without this
      // guard the recursive load would re-read the same file (with
      // `allowExtends: false`), surface a misleading "nested extends" warning,
      // and then merge the workflow with itself (an idempotent but confusing
      // no-op). Emit a clear error and skip the merge.
      diagnostics.push({
        code: "schema-mismatch",
        severity: "error",
        message: `${args.path}: extends points at the same file (self-reference is not permitted). Ignoring.`,
        extra: { path: args.path, field: "extends", expected: "a different file path", actual: workflow.extendsPath },
      });
    } else {
      const parentLoad = await loadAtPath(app, {
        path: normalizePath(workflow.extendsPath),
        project: args.project,
        allowExtends: false,
      });
      diagnostics.push(...parentLoad.diagnostics);
      if (parentLoad.workflow) {
        workflow = mergeWorkflows(parentLoad.workflow, workflow);
      }
    }
  }

  // Validate models on the post-merge workflow.
  diagnostics.push(...validateWorkflowModels(workflow));

  return { workflow, diagnostics };
}

function legacyShapeDiagnostic(path: string, shape: string): WorkflowDiagnostic {
  return {
    code: "schema-mismatch",
    severity: "warning",
    message:
      `${path}: parsed via legacy fallback (${shape}). Body wrapped into a synthetic kickoff step. ` +
      `Migrate to the modern schema (\`type: workflow\`, \`schema: 1\`, \`steps: [...]\`) — see ` +
      `docs/specs/workflow-file-schema.md.`,
    extra: { path, field: "<file>", expected: "modern schema", actual: shape },
  };
}

/**
 * Shallow-merge a parent workflow with a child. Child wins on top-level
 * collisions (`defaultAgent`, `defaultModel`, `extendsPath`). Steps are
 * concatenated parent-first, child-second; a child step that repeats a
 * parent's `step:` id replaces the parent entry by id (the merged step list
 * preserves parent order for inherited steps and child order for new steps).
 *
 * `source` and `project` come from the child — the merged workflow identifies
 * as the child file. `isLegacy` is OR'd: any legacy ancestor taints the chain.
 *
 * Pure: no IO, exposed for testability.
 */
export function mergeWorkflows(parent: WorkflowFile, child: WorkflowFile): WorkflowFile {
  // Map child step ids for fast override lookup.
  const childById = new Map<string, WorkflowStep>();
  for (const s of child.steps) childById.set(s.step, s);

  const mergedSteps: WorkflowStep[] = [];
  const consumedChildIds = new Set<string>();

  // Walk parent steps first; substitute child override when present.
  for (const ps of parent.steps) {
    const override = childById.get(ps.step);
    if (override) {
      mergedSteps.push(override);
      consumedChildIds.add(ps.step);
    } else {
      mergedSteps.push(ps);
    }
  }
  // Append remaining child-only steps in their original order.
  for (const cs of child.steps) {
    if (!consumedChildIds.has(cs.step)) mergedSteps.push(cs);
  }

  return {
    source: child.source,
    type: "workflow",
    schema: 1,
    project: child.project,
    defaultAgent: child.defaultAgent.length > 0 ? child.defaultAgent : parent.defaultAgent,
    defaultModel: defaultModelFallback(parent.defaultModel, child.defaultModel),
    extendsPath: child.extendsPath, // child's `extends:` describes how it got here; preserved for surfacing
    steps: mergedSteps,
  };
}

function defaultModelFallback(
  parent: WorkflowFile["defaultModel"],
  child: WorkflowFile["defaultModel"],
): WorkflowFile["defaultModel"] {
  // Treat an empty `kind: "all"` list on the child as "child didn't supply
  // a default" and fall through to the parent.
  if (child.kind === "all" && child.values.length === 0) return parent;
  if (child.kind === "perAgent" && Object.keys(child.perAgent).length === 0) return parent;
  return child;
}
