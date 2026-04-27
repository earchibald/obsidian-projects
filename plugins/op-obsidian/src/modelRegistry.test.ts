import { describe, it, expect } from "vitest";
import {
  MODEL_REGISTRY,
  contextWindowFor,
  isKnownAgent,
  knownAgents,
  validateModelName,
  validateRegistryShape,
} from "./modelRegistry";

describe("MODEL_REGISTRY shape", () => {
  it("every alias resolves to a known versioned id for the same agent", () => {
    expect(validateRegistryShape()).toEqual([]);
  });

  it("knows about claude, gemini, copilot at minimum", () => {
    const ids = knownAgents();
    expect(ids).toContain("claude");
    expect(ids).toContain("gemini");
    expect(ids).toContain("copilot");
  });

  it("returns sorted agent ids", () => {
    const ids = knownAgents();
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it("isKnownAgent returns true for registered agents", () => {
    expect(isKnownAgent("claude")).toBe(true);
    expect(isKnownAgent("gemini")).toBe(true);
    expect(isKnownAgent("copilot")).toBe(true);
  });

  it("isKnownAgent returns false for unknown agents", () => {
    expect(isKnownAgent("bard")).toBe(false);
    expect(isKnownAgent("")).toBe(false);
    expect(isKnownAgent("CLAUDE")).toBe(false); // case-sensitive
  });

  it("isKnownAgent trims input", () => {
    expect(isKnownAgent("  claude  ")).toBe(true);
  });
});

describe("validateModelName — claude aliases", () => {
  it("resolves opus to canonical id", () => {
    const r = validateModelName("claude", "opus", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "claude-opus-4-7" });
  });

  it("resolves sonnet to canonical id", () => {
    const r = validateModelName("claude", "sonnet", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "claude-sonnet-4-6" });
  });

  it("resolves haiku to canonical id", () => {
    const r = validateModelName("claude", "haiku", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "claude-haiku-4-5-20251001" });
  });
});

describe("validateModelName — claude versioned ids", () => {
  it("accepts claude-opus-4-7 as-is", () => {
    const r = validateModelName("claude", "claude-opus-4-7", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "claude-opus-4-7" });
  });

  it("accepts claude-sonnet-4-6 as-is", () => {
    const r = validateModelName("claude", "claude-sonnet-4-6", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "claude-sonnet-4-6" });
  });

  it("accepts older pinned versions for users who pin", () => {
    const r = validateModelName("claude", "claude-opus-4-6", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "claude-opus-4-6" });
  });
});

describe("validateModelName — gemini and copilot", () => {
  it("resolves gemini pro alias", () => {
    const r = validateModelName("gemini", "pro", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "gemini-2.5-pro" });
  });

  it("accepts gemini versioned id", () => {
    const r = validateModelName("gemini", "gemini-2.5-flash", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "gemini-2.5-flash" });
  });

  it("resolves copilot default alias", () => {
    const r = validateModelName("copilot", "default", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "gpt-5" });
  });

  it("accepts copilot versioned id", () => {
    const r = validateModelName("copilot", "gpt-4.1", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "gpt-4.1" });
  });
});

describe("validateModelName — bad names", () => {
  it("rejects unknown alias for known agent with sorted allowed-arrays", () => {
    const r = validateModelName("claude", "ultra", "step-1");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.bad.stepId).toBe("step-1");
    expect(r.bad.badName).toBe("ultra");
    expect(r.bad.agent).toBe("claude");
    expect(r.bad.allowedAliases).toEqual(["haiku", "opus", "sonnet"]);
    // Versioned list sorted lexicographically.
    expect(r.bad.allowedVersioned).toEqual([...r.bad.allowedVersioned].sort());
    expect(r.bad.allowedVersioned).toContain("claude-opus-4-7");
  });

  it("rejects gemini alias used against claude", () => {
    const r = validateModelName("claude", "pro", "step-1");
    expect(r.ok).toBe(false);
  });

  it("rejects unknown versioned id", () => {
    const r = validateModelName("claude", "claude-opus-9-9", "step-1");
    expect(r.ok).toBe(false);
  });

  it("rejects empty model name", () => {
    const r = validateModelName("claude", "", "step-1");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.bad.badName).toBe("");
    expect(r.bad.allowedAliases.length).toBeGreaterThan(0);
  });
});

describe("validateModelName — unknown agent", () => {
  it("returns bad-model with empty allowed-arrays", () => {
    const r = validateModelName("bard", "ultra", "step-1");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.bad.agent).toBe("bard");
    expect(r.bad.badName).toBe("ultra");
    expect(r.bad.allowedAliases).toEqual([]);
    expect(r.bad.allowedVersioned).toEqual([]);
  });

  it("empty agent id is treated as unknown", () => {
    const r = validateModelName("", "opus", "step-1");
    expect(r.ok).toBe(false);
  });
});

describe("validateModelName — input hygiene", () => {
  it("trims whitespace around the model name", () => {
    const r = validateModelName("claude", "  opus  ", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "claude-opus-4-7" });
  });

  it("trims whitespace around the agent id", () => {
    const r = validateModelName("  claude  ", "opus", "step-1");
    expect(r).toEqual({ ok: true, canonicalId: "claude-opus-4-7" });
  });

  it("preserves stepId verbatim (caller-controlled)", () => {
    const r = validateModelName("claude", "ultra", "kickoff");
    if (r.ok) throw new Error("expected failure");
    expect(r.bad.stepId).toBe("kickoff");
  });

  it("uses '<defaults>' convention for top-level default_model", () => {
    const r = validateModelName("claude", "ultra", "<defaults>");
    if (r.ok) throw new Error("expected failure");
    expect(r.bad.stepId).toBe("<defaults>");
  });
});

describe("contextWindowFor", () => {
  it("returns 200K for Claude 4.x family canonical ids", () => {
    expect(contextWindowFor("claude-opus-4-7")).toBe(200_000);
    expect(contextWindowFor("claude-sonnet-4-6")).toBe(200_000);
    expect(contextWindowFor("claude-haiku-4-5-20251001")).toBe(200_000);
  });

  it("returns 1M for Gemini 2.x", () => {
    expect(contextWindowFor("gemini-2.5-pro")).toBe(1_000_000);
    expect(contextWindowFor("gemini-2.5-flash")).toBe(1_000_000);
  });

  it("returns the documented budget for OpenAI/Copilot models", () => {
    expect(contextWindowFor("gpt-5")).toBe(400_000);
    expect(contextWindowFor("gpt-4.1")).toBe(1_000_000);
  });

  it("returns undefined for unknown ids and empty input", () => {
    expect(contextWindowFor("claude-opus-9-9")).toBeUndefined();
    expect(contextWindowFor(undefined)).toBeUndefined();
    expect(contextWindowFor("")).toBeUndefined();
  });

  it("does NOT resolve aliases — caller must pass canonical ids", () => {
    // The orchestrator hands `resolved.canonicalModel` here; bare aliases
    // like "opus" are a contract violation and return undefined rather than
    // silently resolving. validateModelName is the alias-aware entry point.
    expect(contextWindowFor("opus")).toBeUndefined();
    expect(contextWindowFor("sonnet")).toBeUndefined();
  });
});

describe("MODEL_REGISTRY — alias-vs-versioned contract", () => {
  it("aliases and versioned can share a value but not a key", () => {
    // It would be a bug if a bare alias also appeared in `versioned` —
    // the registry treats `versioned` as canonical-id-shaped names. None of
    // the seeded aliases (opus, sonnet, haiku, pro, flash, default) collide.
    for (const reg of Object.values(MODEL_REGISTRY)) {
      for (const alias of Object.keys(reg.aliases)) {
        expect(reg.versioned.has(alias)).toBe(false);
      }
    }
  });
});
