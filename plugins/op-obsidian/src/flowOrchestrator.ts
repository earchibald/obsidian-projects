// Workflow-aware state machine that decides the next workflow stage when a
// delegated agent's SessionEnd hook fires. Inputs come from the issue's
// frontmatter (`flow`, `complexity`), the session's exit status, and the
// project's loaded `WorkflowFile` (parsed via `loadWorkflowFile` /
// `parseWorkflowFile`). Output is the next `{step, mode}` pair to launch — or
// `null` when no automatic advancement is possible (terminal stage, missing
// complexity, abnormal exit, or the issue's current step is no longer in the
// workflow).
//
// Intentionally Obsidian-free so the matrix is unit-testable. The IO seam
// (loading the workflow file) lives in `main.ts:advanceFlowAndLaunch`.
//
// OP-188: replaced the hardcoded transition matrix with a walker over
// `WorkflowFile.steps`. Pre-modules projects (synthesised legacy workflow, or
// no workflow file at all) fall back to the historical matrix via
// `legacyFlowAdvanceDecision` so already-running issues keep auto-advancing
// until OP-189 migrates per-project workflows to the modules schema.

import type { Flow, Complexity } from "./setFlow";
import type { AgentLaunchMode } from "./agentProfiles";
import type { WorkflowFile, WorkflowStep } from "./workflowFilePure";

export type FlowExitStatus = "clean" | "abnormal";

export interface FlowAdvanceInput {
  /** Loaded workflow for the issue's project, or `null` when none could be
   *  parsed. `null` (and `source.isLegacy === true`) trigger the legacy
   *  hardcoded-matrix fallback. */
  workflow?: WorkflowFile | null;
  flow?: Flow | null;
  complexity?: Complexity | null;
  exitStatus: FlowExitStatus;
}

// The agent launch modes reachable through automatic advancement. `"work"` is
// excluded — it's a deprecated alias for `"implement"` and the orchestrator
// always emits the canonical mode names.
export type FlowAdvanceMode = "evaluate" | "plan" | "implement" | "review" | "finalize";

export interface FlowAdvanceOutput {
  /** Canonical step id chosen for the next launch. New writes always use the
   *  alias-resolved canonical name, even when the input `flow` was a legacy
   *  enum value. */
  nextStep: FlowAdvanceMode;
  /** Same value as `nextStep`. Carried as a separate field so the launch
   *  surface can branch on the launch mode without re-deriving it. */
  nextMode: FlowAdvanceMode;
  /** Backwards-compatible alias for `nextStep`. Pre-OP-188 callers in
   *  `main.ts` and the URI/CLI response payloads referenced `nextFlow`; the
   *  field stays so the wire format and existing log strings don't shift. */
  nextFlow: FlowAdvanceMode;
}

/**
 * Permanent legacy → canonical alias map for the `flow:` enum. Pre-OP-188
 * issues had `flow: planning | implementation | finalization`; canonical step
 * ids in the workflow-modules schema are `plan | implement | finalize`.
 *
 * The map is applied in two places: when reading the issue's current `flow:`
 * value and when reading step ids from a workflow file (so workflows that
 * still use legacy ids walk cleanly). New writes always emit the canonical
 * id — this map is one-way decoder, never an encoder.
 *
 * `evaluate`, `review`, and `done` are passthrough — they're already
 * canonical or terminal sentinels.
 */
export const LEGACY_FLOW_ALIAS: Readonly<Record<string, FlowAdvanceMode | "done">> = Object.freeze(
  {
    evaluate: "evaluate",
    planning: "plan",
    plan: "plan",
    implementation: "implement",
    implement: "implement",
    review: "review",
    finalization: "finalize",
    finalize: "finalize",
    done: "done",
  },
);

/** Returns the canonical name for a legacy or canonical step id, or `null`
 *  when the id is unrecognized (custom step ids on user-authored workflows). */
function aliasResolve(stepId: string | null): FlowAdvanceMode | "done" | null {
  if (stepId === null) return null;
  return Object.prototype.hasOwnProperty.call(LEGACY_FLOW_ALIAS, stepId)
    ? LEGACY_FLOW_ALIAS[stepId]
    : null;
}

const CANONICAL_MODES: ReadonlySet<FlowAdvanceMode> = new Set([
  "evaluate",
  "plan",
  "implement",
  "review",
  "finalize",
]);

function isCanonicalMode(s: string | null): s is FlowAdvanceMode {
  return s !== null && CANONICAL_MODES.has(s as FlowAdvanceMode);
}

export function flowAdvanceDecision(input: FlowAdvanceInput): FlowAdvanceOutput | null {
  if (input.exitStatus !== "clean") return null;
  const flow = input.flow ?? null;
  if (flow === null) return null;

  // Workflow missing or synthesised from a legacy WORKFLOW.md — fall back to
  // the historical hardcoded matrix. Pre-modules projects keep auto-advancing
  // until their per-project WORKFLOW.md is migrated (OP-189).
  const workflow = input.workflow ?? null;
  if (workflow === null || workflow.source.isLegacy) {
    return legacyFlowAdvanceDecision({
      flow,
      complexity: input.complexity ?? null,
      exitStatus: input.exitStatus,
    });
  }

  // Walk the workflow file's step list. Resolve aliases on both sides so a
  // legacy `flow:` value still locates its slot in a canonical workflow, and
  // a legacy step id baked into the workflow file still matches a canonical
  // `flow:` value.
  const currentCanonical = aliasResolve(flow);
  if (currentCanonical === null || currentCanonical === "done") return null;

  const stepIndex = findStepIndex(workflow.steps, currentCanonical);
  if (stepIndex === -1) return null; // current step missing from the workflow

  // Evaluate-step branching: complexity decides whether to skip `plan`.
  if (currentCanonical === "evaluate") {
    const complexity = input.complexity ?? null;
    if (complexity === null) return null; // await user decision
    if (complexity === "simple") {
      // Skip the next step iff it aliases to `plan`. Concretely: scan
      // forward from `stepIndex+1` and pick the first step whose canonical
      // id is not `plan`. This keeps the historical evaluate→implement
      // fast-path even when the workflow file has extra steps inserted
      // between evaluate and plan.
      for (let i = stepIndex + 1; i < workflow.steps.length; i++) {
        const canon = aliasResolve(workflow.steps[i].step);
        if (canon === "plan") continue;
        return outputFor(canon);
      }
      return null;
    }
    // complex → advance by one (canonical evaluate → plan, but the workflow
    // file's actual ordering is what governs).
    return outputFor(aliasResolve(stepFor(workflow.steps, stepIndex + 1)));
  }

  // All other steps → advance by one slot in the workflow.
  return outputFor(aliasResolve(stepFor(workflow.steps, stepIndex + 1)));
}

function findStepIndex(steps: ReadonlyArray<WorkflowStep>, canonical: FlowAdvanceMode): number {
  for (let i = 0; i < steps.length; i++) {
    if (aliasResolve(steps[i].step) === canonical) return i;
  }
  return -1;
}

function stepFor(steps: ReadonlyArray<WorkflowStep>, index: number): string | null {
  return index < steps.length ? steps[index].step : null;
}

function outputFor(canonical: FlowAdvanceMode | "done" | null): FlowAdvanceOutput | null {
  if (!isCanonicalMode(canonical)) return null;
  return { nextStep: canonical, nextMode: canonical, nextFlow: canonical };
}

/**
 * Historical hardcoded transition matrix. Used as a fallback when the
 * project's `WORKFLOW.md` is missing or synthesised from a legacy shape (no
 * `steps:` list) — without this fallback every pre-modules project's
 * auto-advance would break the moment OP-188 ships.
 *
 * Output uses canonical step ids (`plan`, `implement`, `finalize`) regardless
 * of whether the input `flow:` arrived as a legacy enum value, matching the
 * "new writes use canonical ids" rule.
 */
export function legacyFlowAdvanceDecision(input: {
  flow: Flow | null;
  complexity: Complexity | null;
  exitStatus: FlowExitStatus;
}): FlowAdvanceOutput | null {
  if (input.exitStatus !== "clean") return null;
  if (input.flow === null) return null;
  const canonical = aliasResolve(input.flow);
  switch (canonical) {
    case "evaluate":
      if (input.complexity === "simple") return outputFor("implement");
      if (input.complexity === "complex") return outputFor("plan");
      return null;
    case "plan":
      return outputFor("implement");
    case "implement":
      return outputFor("review");
    case "review":
      return outputFor("finalize");
    case "finalize":
    case "done":
    case null:
      return null;
    default: {
      const _exhaustive: never = canonical;
      void _exhaustive;
      return null;
    }
  }
}

// Map the AgentLaunchMode union (which still carries the deprecated `"work"`
// alias) onto a FlowAdvanceMode for callers that already have a mode in hand.
export function modeFromAgentLaunchMode(mode: AgentLaunchMode): FlowAdvanceMode {
  return mode === "work" ? "implement" : mode;
}
