import { describe, expect, it } from "vitest";
import { renderTemplate } from "./renderTemplate";
import { PARENT_NONE_SENTINEL, type RenderContext } from "./pluginVarRegistry";
import { BASE_PROFILES, renderSkillTrigger } from "./agentProfiles";

const FULL_CTX: RenderContext = {
  id: "OP-194",
  title: "Generic var renderer",
  project: "obsidian-projects",
  status: "in-progress",
  priority: "high",
  parent: "OP-184",
  pr_url: "https://example.test/pr/1",
  github_issue: "https://example.test/issue/1",
  repo_path: "/repo",
  vault_path: "/vault",
  vault_name: "Vault",
  branch: "worktree-OP-194",
  today: "2026-04-26",
  agent: "claude",
  model: "claude-opus-4-7",
  mode: "implement",
};

describe("renderTemplate", () => {
  describe("basic substitution", () => {
    it("substitutes a single token", () => {
      const r = renderTemplate("Issue {{id}}", FULL_CTX);
      expect(r.text).toBe("Issue OP-194");
      expect(r.diagnostics).toEqual([]);
    });

    it("substitutes multiple tokens in one pass", () => {
      const r = renderTemplate("{{id}} on branch {{branch}} for project {{project}}", FULL_CTX);
      expect(r.text).toBe("OP-194 on branch worktree-OP-194 for project obsidian-projects");
      expect(r.diagnostics).toEqual([]);
    });

    it("substitutes the same token multiple times", () => {
      const r = renderTemplate("{{id}}/{{id}}/{{id}}", FULL_CTX);
      expect(r.text).toBe("OP-194/OP-194/OP-194");
      expect(r.diagnostics).toEqual([]);
    });

    it("tolerates whitespace inside braces", () => {
      const r = renderTemplate("{{ id }} and {{   branch   }}", FULL_CTX);
      expect(r.text).toBe("OP-194 and worktree-OP-194");
      expect(r.diagnostics).toEqual([]);
    });

    it("passes literal text through untouched", () => {
      const r = renderTemplate("no tokens here, just prose.", FULL_CTX);
      expect(r.text).toBe("no tokens here, just prose.");
      expect(r.diagnostics).toEqual([]);
    });

    it("does not touch single-brace expressions", () => {
      const r = renderTemplate("{ not a token } and {also not}", FULL_CTX);
      expect(r.text).toBe("{ not a token } and {also not}");
      expect(r.diagnostics).toEqual([]);
    });
  });

  describe("missing-var diagnostics", () => {
    it("leaves an unknown-name token verbatim and emits one missing-var diagnostic", () => {
      const r = renderTemplate("Hello {{notavar}}!", FULL_CTX);
      expect(r.text).toBe("Hello {{notavar}}!");
      expect(r.diagnostics).toHaveLength(1);
      expect(r.diagnostics[0]).toMatchObject({
        code: "missing-var",
        severity: "warning",
        varName: "notavar",
      });
    });

    it("leaves a known-but-undefined-in-ctx token verbatim and emits a missing-var diagnostic", () => {
      const r = renderTemplate("Branch: {{branch}}", { id: "OP-1" });
      expect(r.text).toBe("Branch: {{branch}}");
      expect(r.diagnostics).toHaveLength(1);
      expect(r.diagnostics[0]).toMatchObject({
        code: "missing-var",
        severity: "warning",
        varName: "branch",
      });
    });

    it("emits one diagnostic per token occurrence (not per unique name)", () => {
      const r = renderTemplate("{{notavar}} and {{notavar}} again", FULL_CTX);
      expect(r.text).toBe("{{notavar}} and {{notavar}} again");
      expect(r.diagnostics).toHaveLength(2);
      for (const d of r.diagnostics) {
        expect(d.code).toBe("missing-var");
        expect(d.varName).toBe("notavar");
      }
    });

    it("mixes resolved and missing in one pass", () => {
      const r = renderTemplate("{{id}} - {{nope}} - {{branch}}", FULL_CTX);
      expect(r.text).toBe("OP-194 - {{nope}} - worktree-OP-194");
      expect(r.diagnostics).toHaveLength(1);
      expect(r.diagnostics[0].varName).toBe("nope");
    });

    it("ignores tokens whose name doesn't match the conservative shape (e.g., dotted vars.x)", () => {
      // 1b/1c handle the `vars.<name>` namespace separately. The 1a renderer
      // treats it as non-matching text — no substitution, no diagnostic.
      const r = renderTemplate("custom: {{vars.x}}", FULL_CTX);
      expect(r.text).toBe("custom: {{vars.x}}");
      expect(r.diagnostics).toEqual([]);
    });
  });

  describe("idempotency", () => {
    it("feeding the renderer's output back produces the same text and diagnostics", () => {
      const first = renderTemplate("{{id}} - {{nope}} - {{branch}}", FULL_CTX);
      const second = renderTemplate(first.text, FULL_CTX);
      expect(second.text).toBe(first.text);
      // The missing-var token is still in the text and re-emits the same warning.
      expect(second.diagnostics).toHaveLength(1);
      expect(second.diagnostics[0].varName).toBe("nope");
    });

    it("a fully resolved string is a fixed point of the renderer", () => {
      const first = renderTemplate("Issue {{id}} on {{branch}}", FULL_CTX);
      const second = renderTemplate(first.text, FULL_CTX);
      expect(second.text).toBe(first.text);
      expect(second.diagnostics).toEqual([]);
    });
  });

  describe("parent sentinel propagation", () => {
    it("renders the sentinel string into the output when ctx.parent is null", () => {
      const r = renderTemplate("Parent: {{parent}}", { ...FULL_CTX, parent: null });
      expect(r.text).toBe(`Parent: ${PARENT_NONE_SENTINEL}`);
      expect(r.diagnostics).toEqual([]);
    });

    it("renders the literal parent id when ctx.parent is a string", () => {
      const r = renderTemplate("Parent: {{parent}}", { ...FULL_CTX, parent: "OP-184" });
      expect(r.text).toBe("Parent: OP-184");
      expect(r.diagnostics).toEqual([]);
    });
  });
});

describe("renderSkillTrigger (refactored to delegate to renderTemplate)", () => {
  it("renders {{id}} for the claude base profile (byte-identical to legacy regex output)", () => {
    expect(renderSkillTrigger(BASE_PROFILES.claude, "OP-194")).toBe("/op:issue OP-194");
  });

  it("renders {{id}} for the gemini base profile", () => {
    expect(renderSkillTrigger(BASE_PROFILES.gemini, "OP-7")).toBe(
      'Please call activate_skill for the "op" skill, then resume work on OP-7.',
    );
  });

  it("renders {{id}} for the copilot base profile", () => {
    expect(renderSkillTrigger(BASE_PROFILES.copilot, "OP-42")).toBe(
      "Use the `op` skill to resume work on OP-42.",
    );
  });

  it("substitutes every occurrence of {{id}} (matches legacy /\\{\\{id\\}\\}/g semantics)", () => {
    const profile = { ...BASE_PROFILES.claude, skillTrigger: "{{id}} {{id}} {{id}}" };
    expect(renderSkillTrigger(profile, "X-1")).toBe("X-1 X-1 X-1");
  });
});
