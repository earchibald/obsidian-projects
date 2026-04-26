import { describe, it, expect } from "vitest";
import {
  parseWorkParams,
  parseAppendCommitParams,
  parseSetPrParams,
  parseSetScopeParams,
  parseSetSectionParams,
  parseSetEvaluationParams,
  parseSetFlowParams,
  parseNewParams,
  parseScaffoldParams,
  parseGetWorkflowParams,
  parseEditWorkflowParams,
  parseGetSkillParams,
} from "./cliHandlers";

describe("parseWorkParams", () => {
  it("rejects missing id", () => {
    const r = parseWorkParams({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--issue/);
  });
  it("issue beats id alias and both accepted", () => {
    const a = parseWorkParams({ issue: "OP-1" });
    const b = parseWorkParams({ id: "OP-2" });
    const c = parseWorkParams({ issue: "OP-3", id: "OP-4" });
    expect(a.ok && a.value.id).toBe("OP-1");
    expect(b.ok && b.value.id).toBe("OP-2");
    expect(c.ok && c.value.id).toBe("OP-3");
  });
  it("defaults force=false and omits agent fields when absent", () => {
    const r = parseWorkParams({ issue: "OP-1" });
    expect(r.ok && r.value).toEqual({ id: "OP-1", force: false });
  });
  it("accepts agent and agent_session and force=true", () => {
    const r = parseWorkParams({
      issue: "OP-1",
      agent: "claude",
      agent_session: "abc-123",
      force: "true",
    });
    expect(r.ok && r.value).toEqual({
      id: "OP-1",
      agent: "claude",
      agentSession: "abc-123",
      force: true,
    });
  });
  it("session alias works for agent_session", () => {
    const r = parseWorkParams({ issue: "OP-1", agent: "claude", session: "abc" });
    expect(r.ok && r.value.agentSession).toBe("abc");
  });
  it("force=1 also enables force", () => {
    const r = parseWorkParams({ issue: "OP-1", agent: "claude", force: "1" });
    expect(r.ok && r.value.force).toBe(true);
  });
  it("rejects whitespace-only agent", () => {
    const r = parseWorkParams({ issue: "OP-1", agent: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/non-empty/);
  });
  it("rejects agent containing whitespace", () => {
    const r = parseWorkParams({ issue: "OP-1", agent: "claude code" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/whitespace/);
  });
  it("trims agent and session values", () => {
    const r = parseWorkParams({ issue: "OP-1", agent: "  claude  ", agent_session: "  abc  " });
    expect(r.ok && r.value.agent).toBe("claude");
    expect(r.ok && r.value.agentSession).toBe("abc");
  });
});

describe("parseAppendCommitParams", () => {
  it("requires id, sha, subject", () => {
    expect(parseAppendCommitParams({}).ok).toBe(false);
    expect(parseAppendCommitParams({ id: "OP-1" }).ok).toBe(false);
    expect(parseAppendCommitParams({ id: "OP-1", sha: "a" }).ok).toBe(false);
  });
  it("happy path", () => {
    const r = parseAppendCommitParams({ id: "OP-1", sha: "abc", subject: "fix" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ id: "OP-1", sha: "abc", subject: "fix" });
  });
});

describe("parseSetPrParams", () => {
  it("requires id and url (pr alias works)", () => {
    expect(parseSetPrParams({}).ok).toBe(false);
    expect(parseSetPrParams({ id: "OP-1" }).ok).toBe(false);
    const r = parseSetPrParams({ id: "OP-1", pr: "https://x" });
    expect(r.ok && r.value.url).toBe("https://x");
  });
});

describe("parseSetScopeParams", () => {
  it("requires id and scope string", () => {
    expect(parseSetScopeParams({ id: "OP-1" }).ok).toBe(false);
    const r = parseSetScopeParams({ id: "OP-1", scope: "" });
    expect(r.ok && r.value.scope).toBe("");
    expect(r.ok && r.value.mode).toBe("scope");
  });
  it("accepts mode=body", () => {
    const r = parseSetScopeParams({ id: "OP-1", scope: "x", mode: "body" });
    expect(r.ok && r.value.mode).toBe("body");
  });
  it("rejects unknown mode", () => {
    const r = parseSetScopeParams({ id: "OP-1", scope: "x", mode: "wat" });
    expect(r.ok).toBe(false);
  });
});

describe("parseSetSectionParams", () => {
  it("requires id, name, content", () => {
    expect(parseSetSectionParams({}).ok).toBe(false);
    expect(parseSetSectionParams({ id: "OP-1" }).ok).toBe(false);
    expect(parseSetSectionParams({ id: "OP-1", name: "Plan" }).ok).toBe(false);
  });
  it("happy path defaults append=false", () => {
    const r = parseSetSectionParams({ id: "OP-1", name: "Plan", content: "body" });
    expect(r.ok && r.value).toEqual({ id: "OP-1", name: "Plan", content: "body", append: false });
  });
  it("accepts empty content (caller handles empty-payload rejection)", () => {
    const r = parseSetSectionParams({ id: "OP-1", name: "Notes", content: "" });
    expect(r.ok).toBe(true);
  });
  it("forwards append=true", () => {
    const r = parseSetSectionParams({ id: "OP-1", name: "Notes", content: "x", append: "true" });
    expect(r.ok && r.value.append).toBe(true);
  });
  it("rejects name outside Plan|Notes|Summary", () => {
    const r = parseSetSectionParams({ id: "OP-1", name: "Scope", content: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Plan\|Notes\|Summary/);
  });
});

describe("parseSetEvaluationParams", () => {
  it("requires id and evaluation", () => {
    expect(parseSetEvaluationParams({}).ok).toBe(false);
    expect(parseSetEvaluationParams({ id: "OP-1" }).ok).toBe(false);
    const r = parseSetEvaluationParams({ id: "OP-1", evaluation: "body" });
    expect(r.ok && r.value).toEqual({ id: "OP-1", evaluation: "body" });
  });
  it("accepts empty evaluation string (caller handles empty-payload rejection)", () => {
    const r = parseSetEvaluationParams({ id: "OP-1", evaluation: "" });
    expect(r.ok).toBe(true);
  });
});

describe("parseSetFlowParams", () => {
  it("requires id", () => {
    expect(parseSetFlowParams({}).ok).toBe(false);
  });
  it("requires at least one of flow or complexity", () => {
    const r = parseSetFlowParams({ id: "OP-1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/at least one/);
  });
  it("accepts valid flow and complexity", () => {
    const r = parseSetFlowParams({ id: "OP-1", flow: "planning", complexity: "complex" });
    expect(r.ok && r.value).toEqual({ id: "OP-1", flow: "planning", complexity: "complex" });
  });
  it("rejects invalid flow enum", () => {
    const r = parseSetFlowParams({ id: "OP-1", flow: "wat" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/invalid --flow/);
  });
  it("rejects invalid complexity enum", () => {
    const r = parseSetFlowParams({ id: "OP-1", complexity: "epic" });
    expect(r.ok).toBe(false);
  });
  it("maps 'null' string to null (clear)", () => {
    const r = parseSetFlowParams({ id: "OP-1", flow: "null" });
    expect(r.ok && r.value.flow).toBeNull();
  });
  it("maps empty string to null (clear)", () => {
    const r = parseSetFlowParams({ id: "OP-1", complexity: "" });
    expect(r.ok && r.value.complexity).toBeNull();
  });
});

describe("parseNewParams", () => {
  it("requires project (or slug alias) and title", () => {
    expect(parseNewParams({}).ok).toBe(false);
    expect(parseNewParams({ slug: "x" }).ok).toBe(false);
    const r = parseNewParams({ slug: "x", title: "t" });
    expect(r.ok && r.value).toEqual({ slug: "x", title: "t", priority: "med" });
  });
  it("accepts priority override", () => {
    const r = parseNewParams({ project: "x", title: "t", priority: "high" });
    expect(r.ok && r.value.priority).toBe("high");
  });
});

describe("parseScaffoldParams", () => {
  it("requires slug and prefix separately", () => {
    expect(parseScaffoldParams({}).ok).toBe(false);
    expect(parseScaffoldParams({ slug: "mp" }).ok).toBe(false);
    const r = parseScaffoldParams({ slug: "mp", prefix: "MP" });
    expect(r.ok && r.value).toEqual({ slug: "mp", prefix: "MP" });
  });
});

describe("parseGetWorkflowParams", () => {
  it("requires project (or slug alias)", () => {
    expect(parseGetWorkflowParams({}).ok).toBe(false);
    const a = parseGetWorkflowParams({ project: "obsidian-projects" });
    expect(a.ok && a.value.project).toBe("obsidian-projects");
    const b = parseGetWorkflowParams({ slug: "jira-bases" });
    expect(b.ok && b.value.project).toBe("jira-bases");
  });
  it("project beats slug when both present", () => {
    const r = parseGetWorkflowParams({ project: "a", slug: "b" });
    expect(r.ok && r.value.project).toBe("a");
  });
});

describe("parseEditWorkflowParams", () => {
  it("requires project (or slug alias)", () => {
    const r = parseEditWorkflowParams({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--project/);
  });
  it("accepts the slug alias", () => {
    const r = parseEditWorkflowParams({ slug: "obsidian-projects" });
    expect(r.ok && r.value.project).toBe("obsidian-projects");
  });
  it("project beats slug when both present", () => {
    const r = parseEditWorkflowParams({ project: "a", slug: "b" });
    expect(r.ok && r.value.project).toBe("a");
  });
});

describe("parseGetSkillParams", () => {
  it("always succeeds — name= is optional", () => {
    expect(parseGetSkillParams({}).ok).toBe(true);
    expect(parseGetSkillParams({ name: "" }).ok).toBe(true);
    expect(parseGetSkillParams({ name: "skill" }).ok).toBe(true);
  });
  it("trims whitespace from name", () => {
    const r = parseGetSkillParams({ name: "  skill  " });
    expect(r.ok && r.value.name).toBe("skill");
  });
  it("returns empty string when name is absent", () => {
    const r = parseGetSkillParams({});
    expect(r.ok && r.value.name).toBe("");
  });
  it("returns empty string when name is blank (URI: ?name=%20%20)", () => {
    const r = parseGetSkillParams({ name: "  " });
    expect(r.ok && r.value.name).toBe("");
  });
  it("preserves casing for downstream case-folding in getSkill", () => {
    const r = parseGetSkillParams({ name: "Skill" });
    expect(r.ok && r.value.name).toBe("Skill");
  });
});
