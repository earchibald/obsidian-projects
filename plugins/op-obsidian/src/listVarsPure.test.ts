import { describe, it, expect } from "vitest";
import {
  buildListVarsPayload,
  summarizeListVarsPayload,
} from "./listVarsPure";
import { PARENT_NONE_SENTINEL, PLUGIN_VAR_REGISTRY } from "./pluginVarRegistry";
import type { RenderContext } from "./pluginVarRegistry";

const REGISTRY_NAMES = Object.keys(PLUGIN_VAR_REGISTRY);

const FULL_CTX: RenderContext = {
  id: "OP-203",
  title: "diagnostic CLIs",
  project: "obsidian-projects",
  status: "in-progress",
  priority: "med",
  parent: "OP-186",
  pr_url: "https://github.com/example/repo/pull/1",
  github_issue: "https://github.com/example/repo/issues/1",
  repo_path: "/Users/me/Projects/obsidian-projects",
  vault_path: "/Users/me/work/Agent-Vault",
  vault_name: "Agent-Vault",
  branch: "worktree-op-203",
  today: "2026-04-26",
  agent: "claude",
  model: "claude-opus-4-7",
  mode: "implement",
};

describe("buildListVarsPayload — registry-only mode", () => {
  it("returns one row per registry entry, all currentValue null, hasContext=false", () => {
    const p = buildListVarsPayload();
    expect(p.context.hasContext).toBe(false);
    expect(p.vars.map((v) => v.name)).toEqual(REGISTRY_NAMES);
    for (const v of p.vars) {
      expect(v.currentValue).toBeNull();
      expect(v.description.length).toBeGreaterThan(0);
      expect(v.example.length).toBeGreaterThan(0);
    }
  });

  it("treats explicit undefined as registry-only mode", () => {
    const p = buildListVarsPayload(undefined);
    expect(p.context.hasContext).toBe(false);
  });
});

describe("buildListVarsPayload — context-bound mode", () => {
  it("resolves every entry via PluginVar.compute against a full RenderContext", () => {
    const p = buildListVarsPayload(FULL_CTX);
    expect(p.context.hasContext).toBe(true);
    expect(p.context).toMatchObject({
      issueId: "OP-203",
      project: "obsidian-projects",
      agent: "claude",
      mode: "implement",
      model: "claude-opus-4-7",
    });
    const byName = Object.fromEntries(p.vars.map((v) => [v.name, v.currentValue]));
    expect(byName.id).toBe("OP-203");
    expect(byName.title).toBe("diagnostic CLIs");
    expect(byName.project).toBe("obsidian-projects");
    expect(byName.parent).toBe("OP-186");
    expect(byName.branch).toBe("worktree-op-203");
    expect(byName.agent).toBe("claude");
    expect(byName.mode).toBe("implement");
    expect(byName.today).toBe("2026-04-26");
  });

  it("substitutes the parent sentinel for null parent", () => {
    const p = buildListVarsPayload({ ...FULL_CTX, parent: null });
    const parentRow = p.vars.find((v) => v.name === "parent");
    expect(parentRow?.currentValue).toBe(PARENT_NONE_SENTINEL);
  });

  it("returns null for fields the context doesn't supply", () => {
    const partial: Partial<RenderContext> = { id: "OP-203", project: "obsidian-projects" };
    const p = buildListVarsPayload(partial);
    expect(p.context.hasContext).toBe(true);
    const byName = Object.fromEntries(p.vars.map((v) => [v.name, v.currentValue]));
    expect(byName.id).toBe("OP-203");
    expect(byName.project).toBe("obsidian-projects");
    // Unset fields surface as null, not "undefined" or empty string.
    expect(byName.title).toBeNull();
    expect(byName.branch).toBeNull();
    expect(byName.priority).toBeNull();
    expect(byName.repo_path).toBeNull();
  });

  it("does not leak context fields not actually present", () => {
    const p = buildListVarsPayload({ id: "OP-203" });
    expect(p.context.issueId).toBe("OP-203");
    expect(p.context.project).toBeUndefined();
    expect(p.context.agent).toBeUndefined();
    expect(p.context.mode).toBeUndefined();
    expect(p.context.model).toBeUndefined();
  });
});

describe("buildListVarsPayload — golden snapshot", () => {
  it("registry-only mode produces stable output", () => {
    const p = buildListVarsPayload();
    // Every entry name is present; the exact set is the contract with the
    // Settings reference panel + future doc generators. If this test fails
    // because PLUGIN_VAR_REGISTRY changed, update this list AND the rendered
    // settings panel snapshot in lockstep.
    expect(p.vars.map((v) => v.name)).toEqual([
      "id",
      "title",
      "project",
      "status",
      "priority",
      "parent",
      "pr_url",
      "github_issue",
      "repo_path",
      "vault_path",
      "vault_name",
      "branch",
      "today",
      "agent",
      "model",
      "mode",
    ]);
  });
});

describe("summarizeListVarsPayload", () => {
  it("registry-only summary names the count + (no context)", () => {
    const p = buildListVarsPayload();
    expect(summarizeListVarsPayload(p)).toBe(
      `op-list-vars: ${REGISTRY_NAMES.length} registry entries (no context)`,
    );
  });

  it("context-bound summary counts resolved vars and lists context fields", () => {
    const p = buildListVarsPayload(FULL_CTX);
    const resolved = p.vars.filter((v) => v.currentValue !== null).length;
    expect(summarizeListVarsPayload(p)).toBe(
      `op-list-vars: ${resolved}/${p.vars.length} resolved for issue=OP-203 project=obsidian-projects agent=claude mode=implement`,
    );
  });

  it("partial context — only present fields surface", () => {
    const p = buildListVarsPayload({ id: "OP-203", project: "obsidian-projects" });
    expect(summarizeListVarsPayload(p)).toMatch(
      /op-list-vars: \d+\/\d+ resolved for issue=OP-203 project=obsidian-projects$/,
    );
  });
});
