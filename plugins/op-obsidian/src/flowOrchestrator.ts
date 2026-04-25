// Pure state machine that decides the next workflow stage when a delegated
// agent's SessionEnd hook fires. Inputs come from the issue's frontmatter
// (`flow`, `complexity`) plus the session's exit status; output is the
// next `{flow, mode}` pair to launch — or `null` when no automatic
// advancement is possible (terminal stage, missing complexity, abnormal
// exit). Intentionally Obsidian-free so the matrix is unit-testable.

import type { Flow, Complexity } from "./setFlow";
import type { AgentLaunchMode } from "./agentProfiles";

export type FlowExitStatus = "clean" | "abnormal";

export interface FlowAdvanceInput {
  flow?: Flow | null;
  complexity?: Complexity | null;
  exitStatus: FlowExitStatus;
}

// The agent launch modes reachable through automatic advancement. `"work"` is
// excluded — it's a deprecated alias for `"implement"` and the orchestrator
// always emits the canonical mode names.
export type FlowAdvanceMode = "evaluate" | "plan" | "implement" | "review" | "finalize";

export interface FlowAdvanceOutput {
  nextFlow: Flow;
  nextMode: FlowAdvanceMode;
}

export function flowAdvanceDecision(input: FlowAdvanceInput): FlowAdvanceOutput | null {
  if (input.exitStatus !== "clean") return null;
  const flow = input.flow ?? null;
  if (flow === null) return null;
  switch (flow) {
    case "evaluate":
      if (input.complexity === "simple") {
        return { nextFlow: "implementation", nextMode: "implement" };
      }
      if (input.complexity === "complex") {
        return { nextFlow: "planning", nextMode: "plan" };
      }
      return null;
    case "planning":
      return { nextFlow: "implementation", nextMode: "implement" };
    case "implementation":
      return { nextFlow: "review", nextMode: "review" };
    case "review":
      return { nextFlow: "finalization", nextMode: "finalize" };
    case "finalization":
      return null;
    case "done":
      return null;
    default: {
      const _exhaustive: never = flow;
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
