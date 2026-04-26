import { describe, it, expect } from "vitest";
import {
  resolveStepAgentAndModel,
  BadModelSpecError,
  NoInstalledAgentError,
  type ResolveStepInput,
} from "./stepResolver";
import type { AgentId } from "./agentProfiles";
import type { DetectionMap } from "./agentDetect";
import type { WorkflowFile, WorkflowStep } from "./workflowFilePure";

function detection(installed: Partial<Record<AgentId, boolean>>): DetectionMap {
  return {
    claude: { id: "claude", installed: installed.claude ?? false, binary: "claude" },
    gemini: { id: "gemini", installed: installed.gemini ?? false, binary: "gemini" },
    copilot: { id: "copilot", installed: installed.copilot ?? false, binary: "copilot" },
  };
}

function workflow(overrides: Partial<WorkflowFile> = {}): WorkflowFile {
  return {
    source: { path: "Projects/x/WORKFLOW.md", project: "x", isLegacy: false },
    type: "workflow",
    schema: 1,
    project: "x",
    defaultAgent: [],
    defaultModel: { kind: "all", values: [] },
    extendsPath: null,
    steps: [],
    ...overrides,
  };
}

function step(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return { step: "evaluate", modules: [], ...overrides };
}

function input(over: Partial<ResolveStepInput> = {}): ResolveStepInput {
  return {
    detection: detection({ claude: true }),
    fallbackAgent: "claude" as AgentId,
    ...over,
  };
}

describe("resolveStepAgentAndModel — agent walking", () => {
  it("picks the first installed agent from the step's list", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: ["gemini", "claude"] }),
        detection: detection({ claude: true }), // gemini uninstalled
      }),
    );
    expect(out.agent).toBe("claude");
    expect(out.agentSource).toBe("step");
    expect(out.canonicalModel).toBeUndefined();
    expect(out.modelSource).toBe("none");
  });

  it("picks the first listed agent when multiple are installed (order matters)", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: ["gemini", "claude"] }),
        detection: detection({ claude: true, gemini: true }),
      }),
    );
    expect(out.agent).toBe("gemini");
  });

  it("falls back to workflow.defaultAgent when step.agent is undefined", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step(),
        workflow: workflow({ defaultAgent: ["claude"] }),
      }),
    );
    expect(out.agent).toBe("claude");
    expect(out.agentSource).toBe("workflow-default");
  });

  it("falls back to workflow.defaultAgent when step.agent is the empty array", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: [] }),
        workflow: workflow({ defaultAgent: ["claude"] }),
      }),
    );
    expect(out.agent).toBe("claude");
    expect(out.agentSource).toBe("workflow-default");
  });

  it("falls back to fallbackAgent when both step and workflow lists are empty", () => {
    const out = resolveStepAgentAndModel(input({}));
    expect(out.agent).toBe("claude");
    expect(out.agentSource).toBe("fallback");
  });

  it("throws NoInstalledAgentError when no listed agent's binary is installed", () => {
    expect(() =>
      resolveStepAgentAndModel(
        input({
          step: step({ agent: ["gemini", "copilot"] }),
          detection: detection({}), // none installed
        }),
      ),
    ).toThrow(NoInstalledAgentError);
  });

  it("NoInstalledAgentError carries the attempted-agent list", () => {
    try {
      resolveStepAgentAndModel(
        input({
          step: step({ step: "review", agent: ["gemini", "copilot"] }),
          detection: detection({}),
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      const err = e as NoInstalledAgentError;
      expect(err.name).toBe("NoInstalledAgentError");
      expect(err.stepId).toBe("review");
      expect(err.attemptedAgents).toEqual(["gemini", "copilot"]);
    }
  });

  it("treats unknown agent ids as not-installed (defensive)", () => {
    expect(() =>
      resolveStepAgentAndModel(
        input({
          step: step({ agent: ["bogus" as AgentId] }),
          detection: detection({ claude: true }),
        }),
      ),
    ).toThrow(NoInstalledAgentError);
  });
});

describe("resolveStepAgentAndModel — typo vs cross-agent overflow", () => {
  it("returns canonical id for a valid bare alias", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: ["claude"], model: { kind: "all", values: ["opus"] } }),
      }),
    );
    expect(out.canonicalModel).toBe("claude-opus-4-7");
    expect(out.modelSource).toBe("step");
  });

  it("returns canonical id for a versioned id (passes through)", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: ["claude"], model: { kind: "all", values: ["claude-opus-4-7"] } }),
      }),
    );
    expect(out.canonicalModel).toBe("claude-opus-4-7");
  });

  it("walks the list and returns the first valid entry", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: ["claude"], model: { kind: "all", values: ["sonnet", "opus"] } }),
      }),
    );
    // Both valid — first wins.
    expect(out.canonicalModel).toBe("claude-sonnet-4-6");
  });

  it("throws BadModelSpecError(reason='all-overflow') for cross-agent-only entries", () => {
    let err: BadModelSpecError | undefined;
    try {
      resolveStepAgentAndModel(
        input({
          step: step({ agent: ["claude"], model: { kind: "all", values: ["pro"] } }),
        }),
      );
    } catch (e) {
      err = e as BadModelSpecError;
    }
    expect(err).toBeInstanceOf(BadModelSpecError);
    expect(err!.reason).toBe("all-overflow");
    expect(err!.attempts[0].classification).toEqual({
      kind: "cross-agent-overflow",
      otherAgent: "gemini",
    });
    expect(err!.bad.badName).toBe("pro");
    expect(err!.bad.agent).toBe("claude");
    expect(err!.bad.allowedAliases).toContain("opus");
  });

  it("throws BadModelSpecError(reason='typo') for an unknown name", () => {
    let err: BadModelSpecError | undefined;
    try {
      resolveStepAgentAndModel(
        input({
          step: step({ agent: ["claude"], model: { kind: "all", values: ["opuss"] } }),
        }),
      );
    } catch (e) {
      err = e as BadModelSpecError;
    }
    expect(err).toBeInstanceOf(BadModelSpecError);
    expect(err!.reason).toBe("typo");
    expect(err!.attempts[0].classification.kind).toBe("typo");
  });

  it("typo precedence: throws even when a later entry would have validated", () => {
    let err: BadModelSpecError | undefined;
    try {
      resolveStepAgentAndModel(
        input({
          step: step({
            agent: ["claude"],
            model: { kind: "all", values: ["opuss", "opus"] },
          }),
        }),
      );
    } catch (e) {
      err = e as BadModelSpecError;
    }
    expect(err).toBeInstanceOf(BadModelSpecError);
    expect(err!.reason).toBe("typo");
    // Both attempts captured for diagnostics — the recovery dialog needs the
    // full per-entry classification.
    expect(err!.attempts).toHaveLength(2);
    expect(err!.attempts[0].classification.kind).toBe("typo");
    expect(err!.attempts[1].classification.kind).toBe("valid");
  });

  it("typo precedence holds even with overflow + valid entries present", () => {
    let err: BadModelSpecError | undefined;
    try {
      resolveStepAgentAndModel(
        input({
          step: step({
            agent: ["claude"],
            model: { kind: "all", values: ["pro", "opuss", "opus"] },
          }),
        }),
      );
    } catch (e) {
      err = e as BadModelSpecError;
    }
    expect(err!.reason).toBe("typo");
    expect(err!.attempts.map((a) => a.classification.kind)).toEqual([
      "cross-agent-overflow",
      "typo",
      "valid",
    ]);
  });

  it("neither typo nor overflow: walks past overflow entries to the valid one", () => {
    // gemini's "pro" is overflow for claude; claude's "opus" wins.
    const out = resolveStepAgentAndModel(
      input({
        step: step({
          agent: ["claude"],
          model: { kind: "all", values: ["pro", "opus"] },
        }),
      }),
    );
    expect(out.canonicalModel).toBe("claude-opus-4-7");
  });
});

describe("resolveStepAgentAndModel — keyed-map (perAgent) form", () => {
  it("looks up the chosen agent's key", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({
          agent: ["claude"],
          model: { kind: "perAgent", perAgent: { claude: ["opus"], gemini: ["pro"] } },
        }),
      }),
    );
    expect(out.agent).toBe("claude");
    expect(out.canonicalModel).toBe("claude-opus-4-7");
  });

  it("walks the chosen agent's value list when keyed entry has multiple models", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({
          agent: ["claude"],
          model: { kind: "perAgent", perAgent: { claude: ["sonnet", "opus"] } },
        }),
      }),
    );
    expect(out.canonicalModel).toBe("claude-sonnet-4-6");
  });

  it("returns canonicalModel: undefined when the chosen agent has no key (silent — not an error)", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({
          agent: ["claude"],
          model: { kind: "perAgent", perAgent: { gemini: ["pro"] } },
        }),
      }),
    );
    expect(out.canonicalModel).toBeUndefined();
    expect(out.modelSource).toBe("none");
  });

  it("throws BadModelSpecError when the chosen agent's keyed value contains a typo", () => {
    expect(() =>
      resolveStepAgentAndModel(
        input({
          step: step({
            agent: ["claude"],
            model: { kind: "perAgent", perAgent: { claude: ["opuss"] } },
          }),
        }),
      ),
    ).toThrow(BadModelSpecError);
  });

  it("typo check is scoped to the chosen agent — sibling entries for other agents are ignored", () => {
    // gemini's value is bogus, but we resolve to claude — gemini's list is
    // never inspected, so no typo is surfaced.
    const out = resolveStepAgentAndModel(
      input({
        step: step({
          agent: ["claude"],
          model: {
            kind: "perAgent",
            perAgent: { claude: ["opus"], gemini: ["bogus"] },
          },
        }),
      }),
    );
    expect(out.canonicalModel).toBe("claude-opus-4-7");
  });
});

describe("resolveStepAgentAndModel — defaults inheritance", () => {
  it("inherits workflow.defaultModel when step has none", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: ["claude"] }),
        workflow: workflow({
          defaultAgent: ["claude"],
          defaultModel: { kind: "all", values: ["opus"] },
        }),
      }),
    );
    expect(out.canonicalModel).toBe("claude-opus-4-7");
    expect(out.modelSource).toBe("workflow-default");
  });

  it("step.model overrides workflow.defaultModel", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: ["claude"], model: { kind: "all", values: ["sonnet"] } }),
        workflow: workflow({
          defaultAgent: ["claude"],
          defaultModel: { kind: "all", values: ["opus"] },
        }),
      }),
    );
    expect(out.canonicalModel).toBe("claude-sonnet-4-6");
    expect(out.modelSource).toBe("step");
  });

  it("returns canonicalModel: undefined when no model spec exists anywhere", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: ["claude"] }),
      }),
    );
    expect(out.canonicalModel).toBeUndefined();
    expect(out.modelSource).toBe("none");
  });

  it("treats workflow defaultModel kind:'all' with empty values as no override", () => {
    const out = resolveStepAgentAndModel(
      input({
        step: step({ agent: ["claude"] }),
        workflow: workflow({
          defaultAgent: ["claude"],
          defaultModel: { kind: "all", values: [] },
        }),
      }),
    );
    expect(out.canonicalModel).toBeUndefined();
  });
});

describe("BadModelSpecError — diagnostic payload", () => {
  it("carries the structured BadModelSpec for the recovery dialog", () => {
    let err: BadModelSpecError | undefined;
    try {
      resolveStepAgentAndModel(
        input({
          step: step({ step: "implement", agent: ["claude"], model: { kind: "all", values: ["pro"] } }),
        }),
      );
    } catch (e) {
      err = e as BadModelSpecError;
    }
    expect(err!.bad.stepId).toBe("implement");
    expect(err!.bad.agent).toBe("claude");
    expect(err!.bad.badName).toBe("pro");
    expect(err!.bad.allowedAliases.length).toBeGreaterThan(0);
    expect(err!.bad.allowedVersioned.length).toBeGreaterThan(0);
  });

  it("uses '<defaults>' as stepId when no step record was passed", () => {
    let err: BadModelSpecError | undefined;
    try {
      resolveStepAgentAndModel(
        input({
          workflow: workflow({
            defaultAgent: ["claude"],
            defaultModel: { kind: "all", values: ["opuss"] },
          }),
        }),
      );
    } catch (e) {
      err = e as BadModelSpecError;
    }
    expect(err!.stepId).toBe("<defaults>");
    expect(err!.bad.stepId).toBe("<defaults>");
  });
});
