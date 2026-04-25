import { describe, it, expect } from "vitest";
import {
  flowAdvanceDecision,
  modeFromAgentLaunchMode,
} from "./flowOrchestrator";

describe("flowAdvanceDecision", () => {
  it("evaluate + simple → implementation/implement", () => {
    expect(
      flowAdvanceDecision({ flow: "evaluate", complexity: "simple", exitStatus: "clean" }),
    ).toEqual({ nextFlow: "implementation", nextMode: "implement" });
  });

  it("evaluate + complex → planning/plan", () => {
    expect(
      flowAdvanceDecision({ flow: "evaluate", complexity: "complex", exitStatus: "clean" }),
    ).toEqual({ nextFlow: "planning", nextMode: "plan" });
  });

  it("evaluate without complexity → null (await user decision)", () => {
    expect(flowAdvanceDecision({ flow: "evaluate", exitStatus: "clean" })).toBeNull();
    expect(
      flowAdvanceDecision({ flow: "evaluate", complexity: null, exitStatus: "clean" }),
    ).toBeNull();
  });

  it("planning → implementation/implement", () => {
    expect(flowAdvanceDecision({ flow: "planning", exitStatus: "clean" })).toEqual({
      nextFlow: "implementation",
      nextMode: "implement",
    });
  });

  it("implementation → review/review", () => {
    expect(flowAdvanceDecision({ flow: "implementation", exitStatus: "clean" })).toEqual({
      nextFlow: "review",
      nextMode: "review",
    });
  });

  it("review → finalization/finalize", () => {
    expect(flowAdvanceDecision({ flow: "review", exitStatus: "clean" })).toEqual({
      nextFlow: "finalization",
      nextMode: "finalize",
    });
  });

  it("finalization → null (terminal)", () => {
    expect(flowAdvanceDecision({ flow: "finalization", exitStatus: "clean" })).toBeNull();
  });

  it("done → null", () => {
    expect(flowAdvanceDecision({ flow: "done", exitStatus: "clean" })).toBeNull();
  });

  it("flow unset / null → null", () => {
    expect(flowAdvanceDecision({ exitStatus: "clean" })).toBeNull();
    expect(flowAdvanceDecision({ flow: null, exitStatus: "clean" })).toBeNull();
  });

  it("abnormal exit → null regardless of flow", () => {
    for (const flow of [
      "evaluate",
      "planning",
      "implementation",
      "review",
      "finalization",
      "done",
    ] as const) {
      expect(flowAdvanceDecision({ flow, exitStatus: "abnormal" })).toBeNull();
    }
    expect(
      flowAdvanceDecision({ flow: "evaluate", complexity: "simple", exitStatus: "abnormal" }),
    ).toBeNull();
  });

  it("ignores complexity outside the evaluate branch", () => {
    expect(
      flowAdvanceDecision({ flow: "planning", complexity: "complex", exitStatus: "clean" }),
    ).toEqual({ nextFlow: "implementation", nextMode: "implement" });
    expect(
      flowAdvanceDecision({ flow: "implementation", complexity: "simple", exitStatus: "clean" }),
    ).toEqual({ nextFlow: "review", nextMode: "review" });
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
