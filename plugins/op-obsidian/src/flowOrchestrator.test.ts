import { describe, it, expect } from "vitest";
import {
  flowAdvanceDecision,
  legacyFlowAdvanceDecision,
  modeFromAgentLaunchMode,
  LEGACY_FLOW_ALIAS,
} from "./flowOrchestrator";
import type { WorkflowFile, WorkflowStep } from "./workflowFilePure";

// ---------------------------------------------------------------------------
// Workflow fixture builders
// ---------------------------------------------------------------------------

function makeWorkflow(stepIds: string[], opts: { isLegacy?: boolean } = {}): WorkflowFile {
  const steps: WorkflowStep[] = stepIds.map((id) => ({ step: id, modules: [] }));
  return {
    source: {
      path: "Projects/x/WORKFLOW.md",
      project: "x",
      isLegacy: opts.isLegacy ?? false,
    },
    type: "workflow",
    schema: 1,
    project: "x",
    defaultAgent: ["claude"],
    defaultModel: { kind: "all", values: ["opus"] },
    extendsPath: null,
    steps,
  };
}

const CANONICAL = makeWorkflow(["evaluate", "plan", "implement", "review", "finalize"]);

describe("flowAdvanceDecision (workflow-file walker)", () => {
  describe("canonical step ids in workflow + canonical input flow", () => {
    it("evaluate + simple → implement (skips plan)", () => {
      expect(
        flowAdvanceDecision({
          workflow: CANONICAL,
          flow: "evaluate",
          complexity: "simple",
          exitStatus: "clean",
        }),
      ).toEqual({ nextStep: "implement", nextMode: "implement", nextFlow: "implement" });
    });

    it("evaluate + complex → plan", () => {
      expect(
        flowAdvanceDecision({
          workflow: CANONICAL,
          flow: "evaluate",
          complexity: "complex",
          exitStatus: "clean",
        }),
      ).toEqual({ nextStep: "plan", nextMode: "plan", nextFlow: "plan" });
    });

    it("evaluate without complexity → null (await user)", () => {
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: "evaluate", exitStatus: "clean" }),
      ).toBeNull();
      expect(
        flowAdvanceDecision({
          workflow: CANONICAL,
          flow: "evaluate",
          complexity: null,
          exitStatus: "clean",
        }),
      ).toBeNull();
    });

    it("plan → implement", () => {
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: "plan", exitStatus: "clean" }),
      ).toEqual({ nextStep: "implement", nextMode: "implement", nextFlow: "implement" });
    });

    it("implement → review", () => {
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: "implement", exitStatus: "clean" }),
      ).toEqual({ nextStep: "review", nextMode: "review", nextFlow: "review" });
    });

    it("review → finalize", () => {
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: "review", exitStatus: "clean" }),
      ).toEqual({ nextStep: "finalize", nextMode: "finalize", nextFlow: "finalize" });
    });

    it("finalize → null (terminal — last step in workflow)", () => {
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: "finalize", exitStatus: "clean" }),
      ).toBeNull();
    });
  });

  describe("legacy enum input on a canonical workflow (alias map)", () => {
    it("planning → implement", () => {
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: "planning", exitStatus: "clean" }),
      ).toEqual({ nextStep: "implement", nextMode: "implement", nextFlow: "implement" });
    });

    it("implementation → review", () => {
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: "implementation", exitStatus: "clean" }),
      ).toEqual({ nextStep: "review", nextMode: "review", nextFlow: "review" });
    });

    it("finalization → null (terminal under canonical workflow)", () => {
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: "finalization", exitStatus: "clean" }),
      ).toBeNull();
    });

    it("done → null", () => {
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: "done", exitStatus: "clean" }),
      ).toBeNull();
    });
  });

  describe("legacy step ids in the workflow file (alias map applied to file)", () => {
    const LEGACY_FILE = makeWorkflow([
      "evaluate",
      "planning",
      "implementation",
      "review",
      "finalization",
    ]);

    it("legacy input + legacy file → canonical output", () => {
      expect(
        flowAdvanceDecision({
          workflow: LEGACY_FILE,
          flow: "planning",
          exitStatus: "clean",
        }),
      ).toEqual({ nextStep: "implement", nextMode: "implement", nextFlow: "implement" });
    });

    it("canonical input + legacy file → canonical output", () => {
      expect(
        flowAdvanceDecision({
          workflow: LEGACY_FILE,
          flow: "implement",
          exitStatus: "clean",
        }),
      ).toEqual({ nextStep: "review", nextMode: "review", nextFlow: "review" });
    });
  });

  describe("custom step ids and missing-step handling", () => {
    it("step missing from workflow → null", () => {
      // Issue's frontmatter says it's at `plan`, but the workflow only has
      // [evaluate, implement, review] (no plan step). Walker returns null
      // rather than guessing.
      const SKIPS_PLAN = makeWorkflow(["evaluate", "implement", "review"]);
      expect(
        flowAdvanceDecision({
          workflow: SKIPS_PLAN,
          flow: "plan",
          exitStatus: "clean",
        }),
      ).toBeNull();
    });

    it("non-canonical input flow id → null (kickoff doesn't alias-resolve)", () => {
      const CUSTOM = makeWorkflow(["kickoff", "evaluate", "plan", "implement", "review", "finalize"]);
      expect(
        flowAdvanceDecision({ workflow: CUSTOM, flow: "kickoff", exitStatus: "clean" }),
      ).toBeNull();
    });

    it("workflow with extra leading step still walks canonical chain from a canonical input", () => {
      const CUSTOM = makeWorkflow(["kickoff", "evaluate", "plan", "implement", "review", "finalize"]);
      expect(
        flowAdvanceDecision({ workflow: CUSTOM, flow: "implement", exitStatus: "clean" }),
      ).toEqual({ nextStep: "review", nextMode: "review", nextFlow: "review" });
    });
  });

  describe("evaluate complexity skip behavior with extra steps between evaluate and plan", () => {
    const WITH_LINT = makeWorkflow([
      "evaluate",
      "lint-pass",
      "plan",
      "implement",
      "review",
      "finalize",
    ]);

    it("evaluate + complex → next step (lint-pass non-canonical → null)", () => {
      // `complex` advances by exactly one slot — the next slot is
      // `lint-pass`, which doesn't alias to a canonical mode → null.
      expect(
        flowAdvanceDecision({
          workflow: WITH_LINT,
          flow: "evaluate",
          complexity: "complex",
          exitStatus: "clean",
        }),
      ).toBeNull();
    });

    it("evaluate + simple → first non-plan step (lint-pass; non-canonical → null)", () => {
      // The simple branch scans forward for the first non-`plan` step. The
      // first non-plan slot is `lint-pass` (non-canonical) → null. The
      // walker doesn't keep scanning past a non-canonical id.
      expect(
        flowAdvanceDecision({
          workflow: WITH_LINT,
          flow: "evaluate",
          complexity: "simple",
          exitStatus: "clean",
        }),
      ).toBeNull();
    });
  });

  describe("abnormal exit", () => {
    it("never advances regardless of flow", () => {
      for (const flow of ["evaluate", "plan", "implement", "review", "finalize", "done"]) {
        expect(
          flowAdvanceDecision({ workflow: CANONICAL, flow, exitStatus: "abnormal" }),
        ).toBeNull();
      }
      expect(
        flowAdvanceDecision({
          workflow: CANONICAL,
          flow: "evaluate",
          complexity: "simple",
          exitStatus: "abnormal",
        }),
      ).toBeNull();
    });
  });

  describe("flow unset / null", () => {
    it("returns null", () => {
      expect(flowAdvanceDecision({ workflow: CANONICAL, exitStatus: "clean" })).toBeNull();
      expect(
        flowAdvanceDecision({ workflow: CANONICAL, flow: null, exitStatus: "clean" }),
      ).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Legacy fallback path
// ---------------------------------------------------------------------------

describe("legacy fallback (workflow null or isLegacy)", () => {
  it("workflow=null → uses hardcoded matrix; planning → implement", () => {
    expect(
      flowAdvanceDecision({ workflow: null, flow: "planning", exitStatus: "clean" }),
    ).toEqual({ nextStep: "implement", nextMode: "implement", nextFlow: "implement" });
  });

  it("workflow=null + canonical input → canonical output", () => {
    expect(
      flowAdvanceDecision({ workflow: null, flow: "plan", exitStatus: "clean" }),
    ).toEqual({ nextStep: "implement", nextMode: "implement", nextFlow: "implement" });
  });

  it("workflow.source.isLegacy=true → routes through legacy matrix even though steps exist", () => {
    // Synthesized legacy workflow: one synthetic kickoff step. The walker
    // would return null for any canonical input (currentStep not in steps),
    // but the legacy fallback bypasses that and uses the hardcoded matrix.
    const SYNTH = makeWorkflow(["kickoff"], { isLegacy: true });
    expect(
      flowAdvanceDecision({ workflow: SYNTH, flow: "implementation", exitStatus: "clean" }),
    ).toEqual({ nextStep: "review", nextMode: "review", nextFlow: "review" });
  });

  it("legacy fallback handles evaluate+complexity branching", () => {
    expect(
      flowAdvanceDecision({
        workflow: null,
        flow: "evaluate",
        complexity: "simple",
        exitStatus: "clean",
      }),
    ).toEqual({ nextStep: "implement", nextMode: "implement", nextFlow: "implement" });
    expect(
      flowAdvanceDecision({
        workflow: null,
        flow: "evaluate",
        complexity: "complex",
        exitStatus: "clean",
      }),
    ).toEqual({ nextStep: "plan", nextMode: "plan", nextFlow: "plan" });
    expect(
      flowAdvanceDecision({ workflow: null, flow: "evaluate", exitStatus: "clean" }),
    ).toBeNull();
  });

  it("legacy fallback finalize/finalization/done → null", () => {
    expect(
      flowAdvanceDecision({ workflow: null, flow: "finalization", exitStatus: "clean" }),
    ).toBeNull();
    expect(
      flowAdvanceDecision({ workflow: null, flow: "finalize", exitStatus: "clean" }),
    ).toBeNull();
    expect(flowAdvanceDecision({ workflow: null, flow: "done", exitStatus: "clean" })).toBeNull();
  });

  it("legacy fallback abnormal-exit always null", () => {
    expect(
      flowAdvanceDecision({ workflow: null, flow: "planning", exitStatus: "abnormal" }),
    ).toBeNull();
  });

  it("legacyFlowAdvanceDecision is the same on the public API surface", () => {
    expect(
      legacyFlowAdvanceDecision({ flow: "planning", complexity: null, exitStatus: "clean" }),
    ).toEqual({ nextStep: "implement", nextMode: "implement", nextFlow: "implement" });
    expect(
      legacyFlowAdvanceDecision({
        flow: "evaluate",
        complexity: "complex",
        exitStatus: "clean",
      }),
    ).toEqual({ nextStep: "plan", nextMode: "plan", nextFlow: "plan" });
  });

  it("legacyFlowAdvanceDecision normalizes legacy enum to canonical output", () => {
    // The legacy matrix accepts both forms on input but always emits
    // canonical step ids on output (matching "new writes use canonical ids
    // only").
    expect(
      legacyFlowAdvanceDecision({ flow: "implementation", complexity: null, exitStatus: "clean" }),
    ).toEqual({ nextStep: "review", nextMode: "review", nextFlow: "review" });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe("LEGACY_FLOW_ALIAS", () => {
  it("maps every legacy enum value to its canonical form (or terminal)", () => {
    expect(LEGACY_FLOW_ALIAS.evaluate).toBe("evaluate");
    expect(LEGACY_FLOW_ALIAS.planning).toBe("plan");
    expect(LEGACY_FLOW_ALIAS.plan).toBe("plan");
    expect(LEGACY_FLOW_ALIAS.implementation).toBe("implement");
    expect(LEGACY_FLOW_ALIAS.implement).toBe("implement");
    expect(LEGACY_FLOW_ALIAS.review).toBe("review");
    expect(LEGACY_FLOW_ALIAS.finalization).toBe("finalize");
    expect(LEGACY_FLOW_ALIAS.finalize).toBe("finalize");
    expect(LEGACY_FLOW_ALIAS.done).toBe("done");
  });
});

describe("modeFromAgentLaunchMode", () => {
  it("normalizes the deprecated work alias to implement", () => {
    expect(modeFromAgentLaunchMode("work")).toBe("implement");
  });

  it("passes through canonical modes", () => {
    expect(modeFromAgentLaunchMode("evaluate")).toBe("evaluate");
    expect(modeFromAgentLaunchMode("plan")).toBe("plan");
    expect(modeFromAgentLaunchMode("implement")).toBe("implement");
    expect(modeFromAgentLaunchMode("review")).toBe("review");
    expect(modeFromAgentLaunchMode("finalize")).toBe("finalize");
  });
});
