// Per-step agent + model resolver — OP-200 (2c) of OP-185. Pure: no IO, no
// Obsidian imports. Consumes a parsed `WorkflowStep` (or workflow defaults), a
// `DetectionMap` from `AgentDetector`, and the `MODEL_REGISTRY`. Returns the
// chosen agent + canonical model id, or throws a structured error the
// `recoveryDialog` seam can hand to the user.
//
// Authoring contract (re-stated from the issue spec):
//   step.agent: string[]              # walk in order, pick first installed
//   step.model: ModelSpec             # flat list, OR per-agent keyed map
//
// Resolution order:
//   1. agentList = step.agent ?? workflow.defaultAgent ?? []
//      - Non-empty: walk-with-safe-failure (skip uninstalled). Pick first
//        installed. If none installed → NoInstalledAgentError.
//      - Empty: fall back to `fallbackAgent` (the launch's default — typically
//        `settings.defaultAgent`).
//   2. modelSpec = step.model ?? workflow.defaultModel
//      - undefined or empty values → no override (canonicalModel: undefined).
//      - kind: "all"      → modelList = values
//      - kind: "perAgent" → modelList = perAgent[chosenAgent] ?? []
//   3. Typo-vs-cross-agent overflow:
//      - Each entry e is classified once:
//          • valid                — validateModelName(chosenAgent, e).ok
//          • cross-agent overflow — known to some OTHER agent
//          • typo                 — unknown to every agent in MODEL_REGISTRY
//      - If ANY entry is `typo` → throw BadModelSpecError immediately. A typo
//        is an authoring bug; surfacing it loudly forces the fix instead of
//        masking it behind a later-validating entry.
//      - Otherwise: walk in order, return the first `valid` entry's canonical
//        id. If none valid (all overflow) → throw BadModelSpecError with
//        overflow context.

import type { AgentId } from "./agentProfiles";
import { AGENT_IDS } from "./agentProfiles";
import type { DetectionMap } from "./agentDetect";
import type {
  AgentSpec,
  ModelSpec,
  WorkflowFile,
  WorkflowStep,
} from "./workflowFilePure";
import {
  MODEL_REGISTRY,
  validateModelName,
  type BadModelSpec,
} from "./modelRegistry";

/** Where a resolved value (agent or model) came from. */
export type ResolutionSource = "step" | "workflow-default" | "fallback" | "none";

export interface ResolveStepInput {
  /** The step record. May be `undefined` when no per-step record exists. */
  step?: WorkflowStep;
  /** The workflow file (used for defaults). May be `undefined`. */
  workflow?: WorkflowFile;
  /** AgentDetector snapshot — `detection[id].installed` is the seam. */
  detection: DetectionMap;
  /** Default to use when both `step.agent` and `workflow.defaultAgent` are empty. */
  fallbackAgent: AgentId;
}

export interface ResolveStepOutput {
  agent: AgentId;
  /** Canonical (versioned) model id, or `undefined` if no override was chosen. */
  canonicalModel: string | undefined;
  /** Where the chosen agent came from. Useful for diagnostics + recovery dialog. */
  agentSource: Exclude<ResolutionSource, "none">;
  /** Where the chosen model came from; `"none"` when no override applied. */
  modelSource: ResolutionSource;
}

export type EntryClassification =
  | { kind: "valid"; canonical: string }
  | { kind: "cross-agent-overflow"; otherAgent: string }
  | { kind: "typo" };

export interface ResolverAttempt {
  name: string;
  classification: EntryClassification;
}

/**
 * Thrown when the step's agent list is non-empty but no listed agent's binary
 * is installed on this machine. The `recoveryDialog` surface uses
 * `attemptedAgents` to render "tried claude, gemini — neither installed".
 */
export class NoInstalledAgentError extends Error {
  readonly attemptedAgents: string[];
  readonly stepId: string;

  constructor(stepId: string, attemptedAgents: string[]) {
    super(
      `No installed agent for step "${stepId}". Tried: ${attemptedAgents.join(
        ", ",
      )}.`,
    );
    this.name = "NoInstalledAgentError";
    this.stepId = stepId;
    this.attemptedAgents = [...attemptedAgents];
  }
}

/**
 * Thrown when the step's model spec contains a typo (unknown to every
 * registered agent) OR when every entry is cross-agent overflow (known to some
 * other agent but not the chosen one).
 *
 * The `attempts` array preserves per-entry classification so the recovery
 * dialog can render "you wrote 'opuss' (typo) and 'pro' (gemini's, not
 * claude's)". `bad` is the structured payload from `modelRegistry` for the
 * primary failing entry — the first typo if any, else the first overflow.
 */
export class BadModelSpecError extends Error {
  readonly stepId: string;
  readonly chosenAgent: AgentId;
  readonly attempts: ResolverAttempt[];
  readonly reason: "typo" | "all-overflow";
  readonly bad: BadModelSpec;

  constructor(
    stepId: string,
    chosenAgent: AgentId,
    attempts: ResolverAttempt[],
    reason: "typo" | "all-overflow",
    bad: BadModelSpec,
  ) {
    const summary = attempts
      .map((a) =>
        a.classification.kind === "valid"
          ? `${a.name} (valid)`
          : a.classification.kind === "typo"
            ? `${a.name} (typo)`
            : `${a.name} (belongs to ${a.classification.otherAgent})`,
      )
      .join(", ");
    super(
      `Step "${stepId}" model spec has no usable entry for agent "${chosenAgent}" (${reason}): ${summary}.`,
    );
    this.name = "BadModelSpecError";
    this.stepId = stepId;
    this.chosenAgent = chosenAgent;
    this.attempts = [...attempts];
    this.reason = reason;
    this.bad = bad;
  }
}

/**
 * Resolve the per-step agent + model overrides. See module header for the full
 * contract.
 *
 * Pure and synchronous; throws `NoInstalledAgentError` or `BadModelSpecError`
 * on failure. Callers (openAgent, advanceFlowAndLaunch) catch these and route
 * to the actionable Notice + recovery-dialog seam — they MUST NOT silently
 * substitute a default model when the spec is bad.
 */
export function resolveStepAgentAndModel(
  input: ResolveStepInput,
): ResolveStepOutput {
  const stepId = input.step?.step ?? "<defaults>";

  // 1. Agent resolution.
  const stepAgents = input.step?.agent;
  const workflowAgents = input.workflow?.defaultAgent;
  const agentList: AgentSpec =
    stepAgents && stepAgents.length > 0
      ? stepAgents
      : workflowAgents && workflowAgents.length > 0
        ? workflowAgents
        : [];

  let chosenAgent: AgentId;
  let agentSource: Exclude<ResolutionSource, "none">;

  if (agentList.length === 0) {
    chosenAgent = input.fallbackAgent;
    agentSource = "fallback";
  } else {
    const installed = agentList.find((id) =>
      isInstalledAgent(id, input.detection),
    );
    if (!installed) {
      throw new NoInstalledAgentError(stepId, agentList);
    }
    chosenAgent = installed as AgentId;
    agentSource =
      stepAgents && stepAgents.length > 0 ? "step" : "workflow-default";
  }

  // 2. Model spec.
  const stepModel = input.step?.model;
  const workflowModel = input.workflow?.defaultModel;
  const modelSpec: ModelSpec | undefined = stepModel ?? workflowModel;
  const modelOrigin: Exclude<ResolutionSource, "fallback" | "none"> | "none" =
    stepModel !== undefined
      ? "step"
      : workflowModel !== undefined
        ? "workflow-default"
        : "none";

  const modelList = collectModelList(modelSpec, chosenAgent);
  if (modelList.length === 0) {
    return {
      agent: chosenAgent,
      canonicalModel: undefined,
      agentSource,
      modelSource: "none",
    };
  }

  // 3. Typo-vs-overflow classification.
  const attempts: ResolverAttempt[] = modelList.map((name) => ({
    name,
    classification: classifyEntry(chosenAgent, name),
  }));

  const firstTypo = attempts.find((a) => a.classification.kind === "typo");
  if (firstTypo) {
    throw new BadModelSpecError(
      stepId,
      chosenAgent,
      attempts,
      "typo",
      makeBad(stepId, chosenAgent, firstTypo.name),
    );
  }

  for (const attempt of attempts) {
    if (attempt.classification.kind === "valid") {
      return {
        agent: chosenAgent,
        canonicalModel: attempt.classification.canonical,
        agentSource,
        modelSource: modelOrigin,
      };
    }
  }

  // All entries classified as cross-agent overflow.
  const firstOverflow = attempts[0];
  throw new BadModelSpecError(
    stepId,
    chosenAgent,
    attempts,
    "all-overflow",
    makeBad(stepId, chosenAgent, firstOverflow.name),
  );
}

function isInstalledAgent(id: string, detection: DetectionMap): boolean {
  if (!AGENT_IDS.includes(id as AgentId)) return false;
  const det = detection[id as AgentId];
  return det?.installed === true;
}

/**
 * Flatten a `ModelSpec` to the list of names that should be tried for
 * `chosenAgent`. `kind: "all"` returns all values verbatim; `kind: "perAgent"`
 * looks up the chosen agent's key (returns `[]` when the map has no entry —
 * NOT an error: a per-agent map listing only `claude` is valid for a claude
 * resolution, and silent for any other chosen agent).
 */
function collectModelList(
  modelSpec: ModelSpec | undefined,
  chosenAgent: AgentId,
): string[] {
  if (!modelSpec) return [];
  if (modelSpec.kind === "all") return [...modelSpec.values];
  return [...(modelSpec.perAgent[chosenAgent] ?? [])];
}

function classifyEntry(chosenAgent: AgentId, name: string): EntryClassification {
  const r = validateModelName(chosenAgent, name, "<resolve>");
  if (r.ok) return { kind: "valid", canonical: r.canonicalId };

  // Look across every other agent's registry. An entry that's known to ANY
  // other agent (alias OR versioned) is overflow; otherwise typo.
  const trimmed = (name ?? "").trim();
  for (const otherAgent of Object.keys(MODEL_REGISTRY)) {
    if (otherAgent === chosenAgent) continue;
    const reg = MODEL_REGISTRY[otherAgent];
    if (
      Object.prototype.hasOwnProperty.call(reg.aliases, trimmed) ||
      reg.versioned.has(trimmed)
    ) {
      return { kind: "cross-agent-overflow", otherAgent };
    }
  }
  return { kind: "typo" };
}

function makeBad(stepId: string, agent: AgentId, name: string): BadModelSpec {
  // Reuse `validateModelName` to get the canonical allowed-arrays for the
  // chosen agent. The `ok: false` path always populates them.
  const r = validateModelName(agent, name, stepId);
  if (r.ok) {
    // Shouldn't happen — we only call `makeBad` with names that already failed
    // validation. Defensive: synthesise a minimal payload so downstream code
    // doesn't crash.
    return {
      stepId,
      badName: (name ?? "").trim(),
      agent,
      allowedAliases: [],
      allowedVersioned: [],
    };
  }
  return r.bad;
}
