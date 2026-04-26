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
}));

import { openRecoveryDialog } from "./recoveryDialog";
import { BadModelSpecError, NoInstalledAgentError } from "./stepResolver";
import type { BadModelSpec } from "./modelRegistry";

beforeEach(() => {
  noticeCalls.length = 0;
});

const opened: string[] = [];
const opens: string[] = [];

function fakeApp() {
  opened.length = 0;
  opens.length = 0;
  return {
    setting: {
      open: () => opens.push("open"),
      openTabById: (id: string) => opened.push(id),
    },
  } as any;
}

function badSpec(name: string): BadModelSpec {
  return {
    stepId: "implement",
    badName: name,
    agent: "claude",
    allowedAliases: ["opus", "sonnet"],
    allowedVersioned: ["claude-opus-4-7", "claude-sonnet-4-6"],
  };
}

describe("openRecoveryDialog", () => {
  it("opens the op-obsidian Settings tab", () => {
    const app = fakeApp();
    const err = new BadModelSpecError(
      "implement",
      "claude",
      [{ name: "pro", classification: { kind: "cross-agent-overflow", otherAgent: "gemini" } }],
      "all-overflow",
      badSpec("pro"),
    );
    openRecoveryDialog({ app, issueId: "OP-200", error: err });
    expect(opens).toEqual(["open"]);
    expect(opened).toEqual(["op-obsidian"]);
  });

  it("surfaces a sticky Notice describing a cross-agent-overflow failure", () => {
    const app = fakeApp();
    const err = new BadModelSpecError(
      "implement",
      "claude",
      [{ name: "pro", classification: { kind: "cross-agent-overflow", otherAgent: "gemini" } }],
      "all-overflow",
      badSpec("pro"),
    );
    openRecoveryDialog({ app, issueId: "OP-200", error: err });
    expect(noticeCalls).toHaveLength(1);
    expect(noticeCalls[0].duration).toBe(0); // sticky
    const text = String(noticeCalls[0].msg);
    expect(text).toContain('Step "implement"');
    expect(text).toContain("agent \"claude\"");
    expect(text).toContain('"pro" belongs to a different agent');
    expect(text).toContain("Allowed aliases:");
  });

  it("surfaces a typo failure with the typo-specific phrasing", () => {
    const app = fakeApp();
    const err = new BadModelSpecError(
      "review",
      "claude",
      [{ name: "opuss", classification: { kind: "typo" } }],
      "typo",
      badSpec("opuss"),
    );
    openRecoveryDialog({ app, issueId: "OP-200", error: err });
    const text = String(noticeCalls[0].msg);
    expect(text).toContain("typo");
    expect(text).toContain("\"opuss\" is unknown to every registered agent");
  });

  it("surfaces NoInstalledAgentError with the attempted-agent list", () => {
    const app = fakeApp();
    const err = new NoInstalledAgentError("plan", ["gemini", "copilot"]);
    openRecoveryDialog({ app, issueId: "OP-200", error: err });
    const text = String(noticeCalls[0].msg);
    expect(text).toContain('Step "plan" has no installed agent');
    expect(text).toContain("gemini, copilot");
  });

  it("does not throw when app.setting is unavailable (defensive)", () => {
    expect(() =>
      openRecoveryDialog({
        app: {} as any,
        issueId: "OP-200",
        error: new NoInstalledAgentError("plan", ["claude"]),
      }),
    ).not.toThrow();
    // Notice still fires.
    expect(noticeCalls).toHaveLength(1);
  });
});
