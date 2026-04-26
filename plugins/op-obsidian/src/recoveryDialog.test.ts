import { describe, it, expect, vi, beforeEach } from "vitest";

const { noticeCalls } = vi.hoisted(() => {
  return { noticeCalls: [] as Array<{ msg: any; duration: number }> };
});

vi.mock("obsidian", () => ({
  Notice: class {
    constructor(msg: any, duration: number) {
      noticeCalls.push({ msg, duration });
    }
    hide() {}
  },
  Modal: class {
    contentEl: any = { empty() {}, createEl() {}, createDiv() {}, addClass() {} };
    constructor(_app: any) {}
    open() {}
    close() {}
    onOpen() {}
    onClose() {}
  },
  Setting: class {
    constructor(_el: any) {}
    setName() { return this; }
    setDesc() { return this; }
    addText() { return this; }
    addButton() { return this; }
  },
  TFile: class {
    constructor(public path: string) {}
  },
}));

import {
  describeFailure,
  openRecoveryDialog,
  synthesizeBadModelErrorFromDiagnostic,
} from "./recoveryDialog";
import { BadModelSpecError, NoInstalledAgentError } from "./stepResolver";
import type { BadModelSpec } from "./modelRegistry";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

beforeEach(() => {
  noticeCalls.length = 0;
});

function badSpec(name: string): BadModelSpec {
  return {
    stepId: "implement",
    badName: name,
    agent: "claude",
    allowedAliases: ["opus", "sonnet"],
    allowedVersioned: ["claude-opus-4-7", "claude-sonnet-4-6"],
  };
}

describe("describeFailure", () => {
  it("renders cross-agent-overflow phrasing for an all-overflow BadModelSpecError", () => {
    const err = new BadModelSpecError(
      "implement",
      "claude",
      [{ name: "pro", classification: { kind: "cross-agent-overflow", otherAgent: "gemini" } }],
      "all-overflow",
      badSpec("pro"),
    );
    const text = describeFailure(err);
    expect(text).toContain('Step "implement"');
    expect(text).toContain('agent "claude"');
    expect(text).toContain('"pro" belongs to a different agent');
    expect(text).toContain("Allowed aliases:");
  });

  it("renders typo phrasing for a typo BadModelSpecError", () => {
    const err = new BadModelSpecError(
      "review",
      "claude",
      [{ name: "opuss", classification: { kind: "typo" } }],
      "typo",
      badSpec("opuss"),
    );
    const text = describeFailure(err);
    expect(text).toContain("typo");
    expect(text).toContain('"opuss" is unknown to every registered agent');
  });

  it("renders attempted-agent list for NoInstalledAgentError", () => {
    const err = new NoInstalledAgentError("plan", ["gemini", "copilot"]);
    const text = describeFailure(err);
    expect(text).toContain('Step "plan" has no installed agent');
    expect(text).toContain("gemini, copilot");
  });
});

describe("openRecoveryDialog", () => {
  it("falls back to a sticky Notice when app has no workspace (defensive)", () => {
    openRecoveryDialog({
      app: {} as any, // no workspace -> Notice fallback path
      issueId: "OP-200",
      project: "demo",
      mode: "launch",
      error: new NoInstalledAgentError("plan", ["claude"]),
      onResolved: () => {},
    });
    expect(noticeCalls).toHaveLength(1);
    expect(noticeCalls[0].duration).toBe(0);
    expect(String(noticeCalls[0].msg)).toContain('Step "plan" has no installed agent');
  });
});

describe("synthesizeBadModelErrorFromDiagnostic", () => {
  it("rebuilds a BadModelSpecError from a structured bad-model diagnostic (typo branch)", () => {
    const d: WorkflowDiagnostic = {
      code: "bad-model",
      severity: "error",
      message: "x",
      stepId: "implement",
      extra: badSpec("opuss"),
    };
    const err = synthesizeBadModelErrorFromDiagnostic(d);
    expect(err).not.toBeNull();
    expect(err!.reason).toBe("typo");
    expect(err!.bad.badName).toBe("opuss");
    expect(err!.chosenAgent).toBe("claude");
    expect(err!.attempts).toHaveLength(1);
    expect(err!.attempts[0].classification.kind).toBe("typo");
  });

  it("classifies overflow when the bad name is a known model for another agent", () => {
    const d: WorkflowDiagnostic = {
      code: "bad-model",
      severity: "error",
      message: "x",
      stepId: "implement",
      extra: { ...badSpec("pro") },
    };
    const err = synthesizeBadModelErrorFromDiagnostic(d);
    expect(err).not.toBeNull();
    expect(err!.reason).toBe("all-overflow");
    expect(err!.attempts[0].classification.kind).toBe("cross-agent-overflow");
  });

  it("returns null for diagnostics that aren't bad-model", () => {
    const d: WorkflowDiagnostic = {
      code: "schema-mismatch",
      severity: "error",
      message: "x",
    };
    expect(synthesizeBadModelErrorFromDiagnostic(d)).toBeNull();
  });

  it("returns null for malformed bad-model diagnostics (missing extra)", () => {
    const d: WorkflowDiagnostic = {
      code: "bad-model",
      severity: "error",
      message: "x",
    };
    expect(synthesizeBadModelErrorFromDiagnostic(d)).toBeNull();
  });
});
