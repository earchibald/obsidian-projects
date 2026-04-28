import { describe, it, expect } from "vitest";
import {
  AGENT_IDS,
  BASE_PROFILES,
  isAgentLaunchMode,
  launchFlagsFor,
  mergeProfile,
  normalizeMode,
  promptPreambleFor,
  type AgentLaunchMode,
} from "./agentProfiles";

const ALL_MODES: AgentLaunchMode[] = [
  "evaluate",
  "plan",
  "implement",
  "review",
  "finalize",
  "work",
];

describe("isAgentLaunchMode", () => {
  it("accepts every documented mode (including the legacy work alias)", () => {
    for (const m of ALL_MODES) expect(isAgentLaunchMode(m)).toBe(true);
  });
  it("rejects strings outside the enum", () => {
    expect(isAgentLaunchMode("")).toBe(false);
    expect(isAgentLaunchMode("Implement")).toBe(false);
    expect(isAgentLaunchMode("ship")).toBe(false);
  });
});

describe("normalizeMode", () => {
  it("rewrites the work alias to implement", () => {
    expect(normalizeMode("work")).toBe("implement");
  });
  it("leaves other modes untouched", () => {
    for (const m of ["evaluate", "plan", "implement", "review", "finalize"] as const) {
      expect(normalizeMode(m)).toBe(m);
    }
  });
});

describe("launchFlagsFor (claude base profile)", () => {
  const p = BASE_PROFILES.claude;

  it("implement returns the legacy launchFlags untouched", () => {
    expect(launchFlagsFor(p, "implement")).toEqual(p.launchFlags);
  });
  it("work returns the same flags as implement (alias)", () => {
    expect(launchFlagsFor(p, "work")).toEqual(launchFlagsFor(p, "implement"));
  });
  it("evaluate returns the evaluator agent flags (op-evaluate)", () => {
    const flags = launchFlagsFor(p, "evaluate");
    expect(flags).toContain("--agent");
    expect(flags).toContain("op-evaluate");
  });
  it("plan returns the planner agent flags (op-plan)", () => {
    expect(launchFlagsFor(p, "plan")).toContain("op-plan");
  });
  it("review returns the reviewer agent flags (op-review)", () => {
    expect(launchFlagsFor(p, "review")).toContain("op-review");
  });
  it("finalize returns the finalizer agent flags (op-finalize)", () => {
    expect(launchFlagsFor(p, "finalize")).toContain("op-finalize");
  });
  it("returns a fresh array each call (no shared mutable state)", () => {
    const a = launchFlagsFor(p, "plan");
    const b = launchFlagsFor(p, "plan");
    expect(a).not.toBe(b);
    a.push("MUTATED");
    expect(b).not.toContain("MUTATED");
  });
});

describe("launchFlagsFor (copilot base profile)", () => {
  const p = BASE_PROFILES.copilot;

  it("uses autopilot + allow-all for implement and work launches", () => {
    expect(launchFlagsFor(p, "implement")).toEqual(["--autopilot", "--allow-all"]);
    expect(launchFlagsFor(p, "work")).toEqual(["--autopilot", "--allow-all"]);
  });

  it("keeps autopilot + allow-all on mode-specific launches too", () => {
    for (const mode of ["evaluate", "plan", "review", "finalize"] as const) {
      expect(launchFlagsFor(p, mode)).toEqual(["--autopilot", "--allow-all"]);
    }
  });
});

describe("promptPreambleFor (claude base profile)", () => {
  const p = BASE_PROFILES.claude;

  it("returns a distinct, non-empty preamble per mode", () => {
    const seen = new Map<string, string>();
    for (const m of ["evaluate", "plan", "implement", "review", "finalize"] as const) {
      const preamble = promptPreambleFor(p, m);
      expect(preamble.length).toBeGreaterThan(0);
      seen.set(m, preamble);
    }
    expect(new Set(seen.values()).size).toBe(seen.size);
  });
  it("work and implement return the same preamble (alias)", () => {
    expect(promptPreambleFor(p, "work")).toBe(promptPreambleFor(p, "implement"));
  });
  it("evaluate preamble mentions Initial Evaluation", () => {
    expect(promptPreambleFor(p, "evaluate")).toContain("Initial Evaluation");
  });
  it("review preamble forbids modification", () => {
    expect(promptPreambleFor(p, "review")).toMatch(/do not modify/i);
  });
  it("finalize preamble references op-resolve", () => {
    expect(promptPreambleFor(p, "finalize")).toContain("op-resolve");
  });
});

describe("mergeProfile", () => {
  it("returns base flags/preambles when no overlay supplied", () => {
    for (const id of AGENT_IDS) {
      const merged = mergeProfile(id);
      const base = BASE_PROFILES[id];
      expect(merged.launchFlags).toEqual(base.launchFlags);
      expect(merged.evaluateLaunchFlags).toEqual(base.evaluateLaunchFlags);
      expect(merged.planLaunchFlags).toEqual(base.planLaunchFlags);
      expect(merged.reviewLaunchFlags).toEqual(base.reviewLaunchFlags);
      expect(merged.finalizeLaunchFlags).toEqual(base.finalizeLaunchFlags);
      expect(merged.evaluatePromptPreamble).toBe(base.evaluatePromptPreamble);
      expect(merged.reviewPromptPreamble).toBe(base.reviewPromptPreamble);
      expect(merged.finalizePromptPreamble).toBe(base.finalizePromptPreamble);
    }
  });
  it("partial overlay only replaces the specified fields", () => {
    const merged = mergeProfile("claude", {
      evaluatePromptPreamble: "CUSTOM_EVAL",
    });
    expect(merged.evaluatePromptPreamble).toBe("CUSTOM_EVAL");
    expect(merged.reviewPromptPreamble).toBe(BASE_PROFILES.claude.reviewPromptPreamble);
    expect(merged.launchFlags).toEqual(BASE_PROFILES.claude.launchFlags);
  });
  it("overlay flag arrays are copied (not aliased)", () => {
    const overlay = { evaluateLaunchFlags: ["--custom"] };
    const merged = mergeProfile("claude", overlay);
    overlay.evaluateLaunchFlags.push("MUTATED");
    expect(merged.evaluateLaunchFlags).toEqual(["--custom"]);
  });
});

describe("BASE_PROFILES sanity", () => {
  it("every agent has all five mode preambles populated", () => {
    for (const id of AGENT_IDS) {
      const p = BASE_PROFILES[id];
      expect(p.promptPreamble.length).toBeGreaterThan(0);
      expect(p.evaluatePromptPreamble.length).toBeGreaterThan(0);
      expect(p.planPromptPreamble.length).toBeGreaterThan(0);
      expect(p.reviewPromptPreamble.length).toBeGreaterThan(0);
      expect(p.finalizePromptPreamble.length).toBeGreaterThan(0);
    }
  });
  it("only claude ships custom-agent launch flags out of the box", () => {
    expect(BASE_PROFILES.claude.evaluateLaunchFlags.length).toBeGreaterThan(0);
    expect(BASE_PROFILES.gemini.evaluateLaunchFlags).toEqual([]);
    expect(BASE_PROFILES.copilot.evaluateLaunchFlags).toEqual(["--autopilot", "--allow-all"]);
  });
});
