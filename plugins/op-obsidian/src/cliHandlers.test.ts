import { describe, it, expect } from "vitest";
import {
  parseWorkParams,
  parseAppendCommitParams,
  parseSetPrParams,
  parseSetScopeParams,
  parseSetEvaluationParams,
  parseSetFlowParams,
  parseNewParams,
  parseScaffoldParams,
  parseGetWorkflowParams,
  parseEditWorkflowParams,
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
