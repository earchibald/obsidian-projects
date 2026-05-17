import { describe, it, expect } from "vitest";
import {
  parseWorkParams,
  parseAppendCommitParams,
  parseSetPrParams,
  parseSetScopeParams,
  parseSetSectionParams,
  parseAppendNoteParams,
  parseSetEvaluationParams,
  parseSetFlowParams,
  parseNewParams,
  parseScaffoldParams,
  parseGetWorkflowParams,
  parseEditWorkflowParams,
  parseEditModuleParams,
  parseGetSkillParams,
  parseExplainWorkflowParams,
  parseListVarsParams,
  parseExportModuleParams,
  parseImportModuleParams,
  parseEmitLazySkillsParams,
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

describe("parseAppendNoteParams", () => {
  it("requires issue/id and body", () => {
    expect(parseAppendNoteParams({}).ok).toBe(false);
    expect(parseAppendNoteParams({ issue: "OP-1" }).ok).toBe(false);
    expect(parseAppendNoteParams({ body: "x" }).ok).toBe(false);
  });
  it("happy path with issue= and body=", () => {
    const r = parseAppendNoteParams({ issue: "OP-1", body: "### OP-1.1 — done" });
    expect(r.ok && r.value).toEqual({ id: "OP-1", body: "### OP-1.1 — done" });
  });
  it("accepts id= and content= aliases", () => {
    const r = parseAppendNoteParams({ id: "OP-2", content: "note" });
    expect(r.ok && r.value).toEqual({ id: "OP-2", body: "note" });
  });
  it("accepts empty body (caller handles empty-payload semantics)", () => {
    const r = parseAppendNoteParams({ issue: "OP-1", body: "" });
    expect(r.ok).toBe(true);
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
  it("accepts free-form flow values (workflow walker enforces at advance time)", () => {
    // OP-188: post-modules, parseSetFlowParams accepts any non-empty step id
    // — the orchestrator's workflow-file walker decides what's valid for the
    // project's actual workflow. Values not in the workflow simply produce
    // a no-op auto-advance.
    const r = parseSetFlowParams({ id: "OP-1", flow: "kickoff" });
    expect(r.ok && r.value).toEqual({ id: "OP-1", flow: "kickoff" });
  });
  it("rejects whitespace-only flow value", () => {
    const r = parseSetFlowParams({ id: "OP-1", flow: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/invalid --flow/);
  });
  it("rejects flow value containing embedded newlines", () => {
    // URI-encoded newlines (%0A) in CLI params must be caught at parse time.
    const r = parseSetFlowParams({ id: "OP-1", flow: "plan\nevil_key: value" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/invalid --flow.*newlines/);
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

describe("parseEditModuleParams", () => {
  it("requires --module (id alias)", () => {
    expect(parseEditModuleParams({}).ok).toBe(false);
    const r = parseEditModuleParams({ id: "orient" });
    expect(r.ok && r.value.moduleId).toBe("orient");
  });
  it("defaults scope=global without --project", () => {
    const r = parseEditModuleParams({ module: "orient" });
    expect(r.ok && r.value.scopeKind).toBe("global");
  });
  it("defaults scope=project when --project is supplied", () => {
    const r = parseEditModuleParams({ module: "house", project: "demo" });
    expect(r.ok && r.value.scopeKind).toBe("project");
    expect(r.ok && r.value.project).toBe("demo");
  });
  it("rejects scope=project without --project", () => {
    const r = parseEditModuleParams({ module: "house", scope: "project" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--project is required/);
  });
  it("rejects an unknown scope value", () => {
    const r = parseEditModuleParams({ module: "house", scope: "weird" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/scope/);
  });
  it("accepts scope=global with an explicit --project (project used only as working-dir hint)", () => {
    // When scope=global is supplied explicitly alongside project=demo, the
    // module path is still the global path. `project` is forwarded as a
    // working-directory hint so the agent gets repo context.
    const r = parseEditModuleParams({ module: "foo", project: "demo", scope: "global" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.scopeKind).toBe("global");
      expect(r.value.project).toBe("demo");
    }
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

describe("parseExplainWorkflowParams", () => {
  it("requires issue and mode", () => {
    expect(parseExplainWorkflowParams({}).ok).toBe(false);
    expect(parseExplainWorkflowParams({ issue: "OP-1" }).ok).toBe(false);
    expect(parseExplainWorkflowParams({ mode: "kickoff" }).ok).toBe(false);
  });
  it("issue alias id is accepted", () => {
    const r = parseExplainWorkflowParams({ id: "OP-1", mode: "kickoff" });
    expect(r.ok && r.value).toEqual({ id: "OP-1", mode: "kickoff" });
  });
  it("issue beats id alias", () => {
    const r = parseExplainWorkflowParams({ issue: "OP-1", id: "OP-2", mode: "kickoff" });
    expect(r.ok && r.value.id).toBe("OP-1");
  });
  it("trims agent and rejects whitespace-only and embedded whitespace", () => {
    const ok = parseExplainWorkflowParams({ issue: "OP-1", mode: "kickoff", agent: "  claude  " });
    expect(ok.ok && ok.value.agent).toBe("claude");
    const bad1 = parseExplainWorkflowParams({ issue: "OP-1", mode: "kickoff", agent: "   " });
    expect(bad1.ok).toBe(false);
    const bad2 = parseExplainWorkflowParams({ issue: "OP-1", mode: "kickoff", agent: "claude code" });
    expect(bad2.ok).toBe(false);
  });
  it("rejects empty mode", () => {
    const r = parseExplainWorkflowParams({ issue: "OP-1", mode: "  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--mode/);
  });
  it("happy path with all fields", () => {
    const r = parseExplainWorkflowParams({ issue: "OP-1", mode: "kickoff", agent: "claude" });
    expect(r.ok && r.value).toEqual({ id: "OP-1", mode: "kickoff", agent: "claude" });
  });
});

describe("parseListVarsParams", () => {
  it("accepts no args (registry-only mode)", () => {
    const r = parseListVarsParams({});
    expect(r.ok && r.value).toEqual({});
  });
  it("project alias slug works", () => {
    const a = parseListVarsParams({ project: "obsidian-projects" });
    const b = parseListVarsParams({ slug: "obsidian-projects" });
    expect(a.ok && a.value.project).toBe("obsidian-projects");
    expect(b.ok && b.value.project).toBe("obsidian-projects");
  });
  it("project beats slug alias", () => {
    const r = parseListVarsParams({ project: "a", slug: "b" });
    expect(r.ok && r.value.project).toBe("a");
  });
  it("issue alias id works", () => {
    const a = parseListVarsParams({ issue: "OP-1" });
    const b = parseListVarsParams({ id: "OP-2" });
    expect(a.ok && a.value.issue).toBe("OP-1");
    expect(b.ok && b.value.issue).toBe("OP-2");
  });
  it("trims project and issue, drops whitespace-only", () => {
    const r = parseListVarsParams({ project: "  obsidian-projects  ", issue: "  OP-1  " });
    expect(r.ok && r.value).toEqual({ project: "obsidian-projects", issue: "OP-1" });
    const blank = parseListVarsParams({ project: "   ", issue: "   " });
    expect(blank.ok && blank.value).toEqual({});
  });
});

describe("parseExportModuleParams", () => {
  it("requires id or project", () => {
    const r = parseExportModuleParams({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--id or --project/);
  });
  it("accepts id mode", () => {
    const r = parseExportModuleParams({ id: "orient" });
    expect(r.ok && r.value).toEqual({ mode: "id", moduleId: "orient" });
  });
  it("accepts project mode", () => {
    const r = parseExportModuleParams({ project: "foo" });
    expect(r.ok && r.value).toEqual({ mode: "project", projectSlug: "foo" });
  });
  it("rejects both id and project", () => {
    const r = parseExportModuleParams({ id: "orient", project: "foo" });
    expect(r.ok).toBe(false);
  });
});

describe("parseImportModuleParams", () => {
  it("requires path", () => {
    const r = parseImportModuleParams({});
    expect(r.ok).toBe(false);
  });
  it("accepts a bare path with no scope (caller resolves)", () => {
    const r = parseImportModuleParams({ path: "Projects/_op-export/x.md" });
    expect(r.ok && r.value).toEqual({
      sourcePath: "Projects/_op-export/x.md",
      varAnswers: {},
    });
  });
  it("requires project when scope=project", () => {
    const r = parseImportModuleParams({ path: "x.md", scope: "project" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--project is required/);
  });
  it("rejects an invalid scope", () => {
    const r = parseImportModuleParams({ path: "x.md", scope: "weird" });
    expect(r.ok).toBe(false);
  });
  it("collects per-var prefix-keyed answers", () => {
    const r = parseImportModuleParams({
      path: "x.md",
      "var.tone": "loud",
      "var.lang": "fr",
    });
    expect(r.ok && r.value.varAnswers).toEqual({ tone: "loud", lang: "fr" });
  });
  it("collects packed vars=", () => {
    const r = parseImportModuleParams({
      path: "x.md",
      vars: "tone=loud\nlang=fr",
    });
    expect(r.ok && r.value.varAnswers).toEqual({ tone: "loud", lang: "fr" });
  });
  it("packed vars beat per-var keys (last-wins)", () => {
    const r = parseImportModuleParams({
      path: "x.md",
      "var.tone": "loud",
      vars: "tone=quiet",
    });
    expect(r.ok && r.value.varAnswers.tone).toBe("quiet");
  });
});

describe("parseEmitLazySkillsParams (OP-192)", () => {
  it("requires issue", () => {
    const r = parseEmitLazySkillsParams({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--issue/);
  });
  it("accepts issue and optional dir, trimming dir", () => {
    const r = parseEmitLazySkillsParams({ issue: "OP-1", dir: "  /wt  " });
    expect(r).toEqual({ ok: true, value: { issueId: "OP-1", destDir: "/wt" } });
  });
  it("accepts id as an alias and omits destDir when dir absent", () => {
    const r = parseEmitLazySkillsParams({ id: "OP-2" });
    expect(r).toEqual({ ok: true, value: { issueId: "OP-2" } });
  });
  it("rejects a relative dir (must be absolute)", () => {
    const r = parseEmitLazySkillsParams({ issue: "OP-1", dir: "relative/path" });
    expect(r.ok).toBe(false);
  });
  it("rejects a '.' dir", () => {
    const r = parseEmitLazySkillsParams({ issue: "OP-1", dir: "." });
    expect(r.ok).toBe(false);
  });
  it("accepts an absolute dir", () => {
    const r = parseEmitLazySkillsParams({ issue: "OP-1", dir: "/Users/x/wt" });
    expect(r).toEqual({ ok: true, value: { issueId: "OP-1", destDir: "/Users/x/wt" } });
  });
  it("rejects a tilde dir with a tilde-specific message", () => {
    const r = parseEmitLazySkillsParams({ issue: "OP-1", dir: "~/wt" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/tilde/);
  });
  it("still rejects a plain relative dir", () => {
    const r = parseEmitLazySkillsParams({ issue: "OP-1", dir: "rel/path" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/absolute path/);
  });
});
