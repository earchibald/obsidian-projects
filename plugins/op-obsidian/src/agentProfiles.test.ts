import { describe, it, expect } from "vitest";
import {
  AGENT_IDS,
  BASE_PROFILES,
  asAgentId,
  isAgentLaunchMode,
  launchFlagsFor,
  mergeProfile,
  normalizeMode,
  preferredLaunchAgentOverride,
  postLaunchCommandsFor,
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

describe("asAgentId", () => {
  it("returns a known agent id unchanged", () => {
    expect(asAgentId("claude")).toBe("claude");
    expect(asAgentId("gemini")).toBe("gemini");
    expect(asAgentId("copilot")).toBe("copilot");
  });

  it("returns undefined for unknown or missing values", () => {
    expect(asAgentId("bogus")).toBeUndefined();
    expect(asAgentId("")).toBeUndefined();
    expect(asAgentId(undefined)).toBeUndefined();
    expect(asAgentId(null)).toBeUndefined();
  });
});

describe("preferredLaunchAgentOverride", () => {
  it("keeps an explicit override ahead of any stored issue agent", () => {
    expect(
      preferredLaunchAgentOverride({
        agentOverride: "gemini",
        issueAgent: "copilot",
      }),
    ).toBe("gemini");
  });

  it("explicit override beats Settings default too", () => {
    expect(
      preferredLaunchAgentOverride({
        agentOverride: "gemini",
        defaultAgent: "copilot",
        interactive: true,
      }),
    ).toBe("gemini");
  });

  it("reuses the stored issue agent for normal launches", () => {
    expect(preferredLaunchAgentOverride({ issueAgent: "copilot" })).toBe("copilot");
  });

  it("stored issue agent beats Settings default (option B: stored > defaults)", () => {
    expect(
      preferredLaunchAgentOverride({
        issueAgent: "claude",
        defaultAgent: "copilot",
        interactive: true,
      }),
    ).toBe("claude");
  });

  it("seeds Settings default for interactive launches with no stored agent (option B)", () => {
    expect(
      preferredLaunchAgentOverride({
        defaultAgent: "copilot",
        interactive: true,
      }),
    ).toBe("copilot");
  });

  it("treats undefined interactive as interactive (chip/palette/sidebar default)", () => {
    expect(
      preferredLaunchAgentOverride({
        defaultAgent: "copilot",
      }),
    ).toBe("copilot");
  });

  it("does NOT seed Settings default for auto-advance launches (interactive: false)", () => {
    expect(
      preferredLaunchAgentOverride({
        defaultAgent: "copilot",
        interactive: false,
      }),
    ).toBeUndefined();
  });

  it("auto-advance still honours stored issue agent over the workflow file", () => {
    expect(
      preferredLaunchAgentOverride({
        issueAgent: "claude",
        defaultAgent: "copilot",
        interactive: false,
      }),
    ).toBe("claude");
  });

  it("suppresses stored issue agents when force-pick is requested", () => {
    expect(
      preferredLaunchAgentOverride({
        issueAgent: "copilot",
        forcePick: true,
      }),
    ).toBeUndefined();
  });

  it("force-pick suppresses Settings default seed too", () => {
    expect(
      preferredLaunchAgentOverride({
        defaultAgent: "copilot",
        forcePick: true,
        interactive: true,
      }),
    ).toBeUndefined();
  });

  it("ignores unknown stored agent values", () => {
    expect(preferredLaunchAgentOverride({ issueAgent: "bogus" })).toBeUndefined();
  });

  it("falls through to undefined when nothing fires (workflow resolver wins)", () => {
    expect(preferredLaunchAgentOverride({})).toBeUndefined();
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
      expect(merged.postLaunchCommands).toEqual(base.postLaunchCommands);
      expect(merged.postLaunchReadinessRegex).toBe(base.postLaunchReadinessRegex);
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
  it("overlay post-launch command arrays are copied and readiness regex can be overridden", () => {
    const overlay = {
      postLaunchCommands: ["/rename {{name}}"],
      postLaunchReadinessRegex: "ready",
    };
    const merged = mergeProfile("claude", overlay);
    overlay.postLaunchCommands.push("MUTATED");
    expect(merged.postLaunchCommands).toEqual(["/rename {{name}}"]);
    expect(merged.postLaunchReadinessRegex).toBe("ready");
  });
  it("empty overlay arrays clear the built-in defaults", () => {
    const merged = mergeProfile("claude", { postLaunchCommands: [] });
    expect(merged.postLaunchCommands).toEqual([]);
  });
});

describe("postLaunchCommandsFor", () => {
  it("returns the mode-specific command list", () => {
    expect(postLaunchCommandsFor(BASE_PROFILES.claude, "plan")).toEqual(
      BASE_PROFILES.claude.planPostLaunchCommands,
    );
  });
  it("work and implement share the base command list", () => {
    expect(postLaunchCommandsFor(BASE_PROFILES.claude, "work")).toEqual(
      postLaunchCommandsFor(BASE_PROFILES.claude, "implement"),
    );
  });
  it("copilot uses the same rename command in plan and implement modes", () => {
    expect(postLaunchCommandsFor(BASE_PROFILES.copilot, "plan")).toEqual(
      BASE_PROFILES.copilot.planPostLaunchCommands,
    );
    expect(postLaunchCommandsFor(BASE_PROFILES.copilot, "implement")).toEqual(
      ["/rename {{id}} {{title}}"],
    );
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
  it("the claude family ships custom-agent launch flags out of the box", () => {
    expect(BASE_PROFILES.claude.evaluateLaunchFlags.length).toBeGreaterThan(0);
    expect(BASE_PROFILES["claude-ds"].evaluateLaunchFlags.length).toBeGreaterThan(0);
    expect(BASE_PROFILES.gemini.evaluateLaunchFlags).toEqual([]);
    expect(BASE_PROFILES.copilot.evaluateLaunchFlags).toEqual(["--autopilot", "--allow-all"]);
  });
  it("claude / claude-ds / copilot ship post-launch commands out of the box", () => {
    expect(BASE_PROFILES.claude.postLaunchCommands.length).toBeGreaterThan(0);
    expect(BASE_PROFILES["claude-ds"].postLaunchCommands).toEqual(BASE_PROFILES.claude.postLaunchCommands);
    expect(BASE_PROFILES.gemini.postLaunchCommands).toEqual([]);
    expect(BASE_PROFILES.copilot.postLaunchCommands).toEqual(["/rename {{id}} {{title}}"]);
    expect(BASE_PROFILES.copilot.postLaunchReadinessRegex).toBe("/ commands\\s+·\\s+\\? help");
  });
});

describe("BASE_PROFILES['claude-ds']", () => {
  const claude = BASE_PROFILES.claude;
  const claudeDs = BASE_PROFILES["claude-ds"];

  it("is registered as its own agent id and binary", () => {
    expect(claudeDs.id).toBe("claude-ds");
    expect(claudeDs.binary).toBe("claude-ds");
    expect(claudeDs.label).not.toBe(claude.label);
    expect(AGENT_IDS).toContain("claude-ds");
    expect(asAgentId("claude-ds")).toBe("claude-ds");
  });

  it("inherits every behaviour-bearing field from the claude profile", () => {
    expect(claudeDs.launchFlags).toEqual(claude.launchFlags);
    expect(claudeDs.evaluateLaunchFlags).toEqual(claude.evaluateLaunchFlags);
    expect(claudeDs.planLaunchFlags).toEqual(claude.planLaunchFlags);
    expect(claudeDs.reviewLaunchFlags).toEqual(claude.reviewLaunchFlags);
    expect(claudeDs.finalizeLaunchFlags).toEqual(claude.finalizeLaunchFlags);
    expect(claudeDs.promptPreamble).toBe(claude.promptPreamble);
    expect(claudeDs.evaluatePromptPreamble).toBe(claude.evaluatePromptPreamble);
    expect(claudeDs.planPromptPreamble).toBe(claude.planPromptPreamble);
    expect(claudeDs.reviewPromptPreamble).toBe(claude.reviewPromptPreamble);
    expect(claudeDs.finalizePromptPreamble).toBe(claude.finalizePromptPreamble);
    expect(claudeDs.postLaunchCommands).toEqual(claude.postLaunchCommands);
    expect(claudeDs.postLaunchReadinessRegex).toBe(claude.postLaunchReadinessRegex);
    expect(claudeDs.skillTrigger).toBe(claude.skillTrigger);
  });
});
