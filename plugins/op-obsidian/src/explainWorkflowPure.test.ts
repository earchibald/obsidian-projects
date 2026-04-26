import { describe, it, expect } from "vitest";
import {
  buildExplainPayload,
  precedenceLadder,
  summarizeExplainPayload,
  type ExplainWorkflowPayload,
} from "./explainWorkflowPure";
import {
  composeWorkflow,
  type ComposeContext,
  type LoadedModule,
} from "./composeWorkflowPure";
import type { RenderContext } from "./pluginVarRegistry";
import type { WorkflowFile, WorkflowStep } from "./workflowFilePure";
import type { VarDecl, WorkflowModule } from "./workflowModulePure";

// Tests for the OP-203 (3c) explain-workflow payload builder. Two-layer:
//   - shape tests fed by hand-built `ComposedPrompt` fixtures (fast, focused)
//   - golden-snapshot tests fed by a representative module/workflow tuple
//     composed end-to-end through `composeWorkflow` (proves the payload's
//     `composed.text` is byte-identical to what the launcher would inject)

const CTX: RenderContext = {
  id: "OP-203",
  title: "diagnostic CLIs",
  project: "obsidian-projects",
  status: "in-progress",
  priority: "med",
  parent: null,
  pr_url: undefined,
  github_issue: undefined,
  repo_path: "/Users/me/Projects/obsidian-projects",
  vault_path: "/Users/me/work/Agent-Vault",
  vault_name: "Agent-Vault",
  branch: "worktree-op-203",
  today: "2026-04-26",
  agent: "claude",
  model: "claude-opus-4-7",
  mode: "implement",
};

function makeModule(args: {
  id: string;
  scope?: string;
  vars?: VarDecl[];
  pathPrefix?: "global" | "project";
}): WorkflowModule {
  const path =
    args.pathPrefix === "project"
      ? `Projects/obsidian-projects/MODULES/${args.id}.md`
      : `Projects/_op-modules/${args.id}.md`;
  const source =
    args.pathPrefix === "project"
      ? { kind: "project" as const, path, projectSlug: "obsidian-projects" }
      : { kind: "global" as const, path };
  return {
    id: args.id,
    title: args.id,
    scope: args.scope ?? "kickoff",
    order: 0,
    vars: args.vars ?? [],
    source,
  };
}

function makeWorkflow(steps: WorkflowStep[]): WorkflowFile {
  return {
    source: { path: "Projects/obsidian-projects/WORKFLOW.md", project: "obsidian-projects", isLegacy: false },
    type: "workflow",
    schema: 1,
    project: "obsidian-projects",
    defaultAgent: ["claude"],
    defaultModel: { kind: "all", values: ["sonnet"] },
    extendsPath: null,
    steps,
  };
}

describe("buildExplainPayload — shape", () => {
  it("mirrors composed.text byte-for-byte", () => {
    const m = makeModule({ id: "orient" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["orient"] }]);
    const composed = composeWorkflow({
      loadedModules: [{ module: m, body: "Orient yourself before touching code." }],
      workflow,
      step: "kickoff",
      ctx: { render: CTX } as ComposeContext,
    });

    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed,
    });

    expect(p.composed.text).toBe(composed.text);
    expect(p.composed.text).toBe("Orient yourself before touching code.");
    expect(p.composed.sizeChars).toBe(composed.sizeChars);
  });

  it("includes issueId / project / mode / agent / model from context", () => {
    const composed = composeWorkflow({
      loadedModules: [],
      workflow: makeWorkflow([{ step: "kickoff", modules: [] }]),
      step: "kickoff",
      ctx: { render: CTX },
    });
    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed,
    });
    expect(p.issueId).toBe("OP-203");
    expect(p.project).toBe("obsidian-projects");
    expect(p.mode).toBe("kickoff");
    expect(p.agent).toBe("claude");
    expect(p.model).toBe("claude-opus-4-7");
  });

  it("omits model when context.model is undefined", () => {
    const ctx: RenderContext = { ...CTX, model: undefined };
    const composed = composeWorkflow({
      loadedModules: [],
      workflow: makeWorkflow([{ step: "kickoff", modules: [] }]),
      step: "kickoff",
      ctx: { render: ctx },
    });
    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: ctx,
      composed,
    });
    expect("model" in p).toBe(false);
  });

  it("emits chunk rows in composed.orderedChunks order, without their text bodies", () => {
    const a = makeModule({ id: "alpha" });
    const b = makeModule({ id: "beta" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["alpha", "beta"] }]);
    const composed = composeWorkflow({
      loadedModules: [
        { module: a, body: "alpha-body" },
        { module: b, body: "beta-body" },
      ],
      workflow,
      step: "kickoff",
      ctx: { render: CTX },
    });
    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed,
    });
    expect(p.composed.chunks.map((c) => c.moduleId)).toEqual(["alpha", "beta"]);
    expect(p.composed.chunks[0].sizeChars).toBe("alpha-body".length);
    // No text body leaks onto chunks (callers use composed.text for the full string).
    expect(p.composed.chunks[0]).not.toHaveProperty("text");
  });
});

describe("buildExplainPayload — per-var precedence rows", () => {
  it("uses canonical names (Module/Global/Project/Launch default), not abbreviations", () => {
    // One var per layer to prove every label resolves to its full canonical name.
    const m = makeModule({
      id: "vars-fixture",
      vars: [
        { kind: "default", name: "module_var", value: "mod-default" },
        { kind: "bare", name: "global_var" },
        { kind: "bare", name: "project_var" },
        { kind: "bare", name: "launch_var" },
        { kind: "bare", name: "unset_var" },
      ],
    });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["vars-fixture"] }]);
    const composed = composeWorkflow({
      loadedModules: [
        {
          module: m,
          body: "{{vars.module_var}} {{vars.global_var}} {{vars.project_var}} {{vars.launch_var}} {{vars.unset_var}}",
        },
      ],
      workflow,
      step: "kickoff",
      ctx: {
        render: CTX,
        globalVars: { global_var: "g-val" },
        projectVars: { project_var: "p-val" },
        launchVars: { launch_var: "l-val" },
      },
    });
    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed,
    });

    const byName = Object.fromEntries(p.vars.map((v) => [v.name, v]));
    expect(byName.module_var).toMatchObject({
      value: "mod-default",
      scope: "module",
      scopeLabel: "Module default",
      scopeAbbrev: "M",
    });
    expect(byName.global_var).toMatchObject({
      value: "g-val",
      scope: "global",
      scopeLabel: "Global default",
      scopeAbbrev: "G",
    });
    expect(byName.project_var).toMatchObject({
      value: "p-val",
      scope: "project",
      scopeLabel: "Project default",
      scopeAbbrev: "P",
    });
    expect(byName.launch_var).toMatchObject({
      value: "l-val",
      scope: "launch",
      scopeLabel: "Launch override",
      scopeAbbrev: "L",
    });
    expect(byName.unset_var).toMatchObject({
      value: null,
      scope: null,
      scopeLabel: null,
      scopeAbbrev: null,
      source: "(unset)",
    });

    // Sorted by name for stable golden output.
    expect(p.vars.map((v) => v.name)).toEqual([
      "global_var",
      "launch_var",
      "module_var",
      "project_var",
      "unset_var",
    ]);
  });

  it("higher-precedence layer wins (launch > project > global > module)", () => {
    const m = makeModule({
      id: "shadow",
      vars: [{ kind: "default", name: "v", value: "from-module" }],
    });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["shadow"] }]);
    const composed = composeWorkflow({
      loadedModules: [{ module: m, body: "{{vars.v}}" }],
      workflow,
      step: "kickoff",
      ctx: {
        render: CTX,
        globalVars: { v: "from-global" },
        projectVars: { v: "from-project" },
        launchVars: { v: "from-launch" },
      },
    });
    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed,
    });
    expect(p.vars[0]).toMatchObject({
      name: "v",
      value: "from-launch",
      scope: "launch",
      scopeLabel: "Launch override",
    });
  });
});

describe("buildExplainPayload — diagnostics", () => {
  it("renders every composer diagnostic through the unified formatter", () => {
    // Force one of each: missing-var (declared but unset) + unknown-module.
    const declared = makeModule({
      id: "decl",
      vars: [{ kind: "bare", name: "no_value" }],
    });
    const referencer = makeModule({ id: "ref" });
    const workflow = makeWorkflow([
      { step: "kickoff", modules: ["ref", "missing-id"] },
    ]);
    const composed = composeWorkflow({
      loadedModules: [
        { module: declared, body: "Declared module — body without {{vars.no_value}} ref" },
        { module: referencer, body: "{{vars.no_value}}" },
      ],
      workflow,
      step: "kickoff",
      ctx: { render: CTX },
    });
    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed,
    });

    const codes = p.diagnostics.map((d) => d.code).sort();
    expect(codes).toContain("missing-var");
    expect(codes).toContain("unknown-module");
    // diagnosticLines is in source order, one per source diagnostic
    expect(p.diagnosticLines).toHaveLength(p.diagnostics.length);
    // Lines start with the severity badge.
    for (const line of p.diagnosticLines) {
      expect(line).toMatch(/^\[[EWI]\] /);
    }
    // Block rendering joins with blank lines.
    expect(p.diagnosticBlocks.split("\n\n")).toHaveLength(p.diagnostics.length);
  });

  it("emits empty diagnostic strings when composer ran clean", () => {
    const m = makeModule({ id: "clean" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["clean"] }]);
    const composed = composeWorkflow({
      loadedModules: [{ module: m, body: "All good." }],
      workflow,
      step: "kickoff",
      ctx: { render: CTX },
    });
    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed,
    });
    expect(p.diagnostics).toEqual([]);
    expect(p.diagnosticLines).toEqual([]);
    expect(p.diagnosticBlocks).toBe("");
  });
});

describe("buildExplainPayload — golden snapshot", () => {
  it("representative two-module fixture renders stably", () => {
    const m1 = makeModule({
      id: "orient",
      vars: [{ kind: "default", name: "preflight_check", value: "git status" }],
    });
    const m2 = makeModule({
      id: "issue-context",
      vars: [{ kind: "bare", name: "tracker_url" }],
    });
    const workflow = makeWorkflow([
      { step: "kickoff", modules: ["orient", "issue-context"] },
    ]);
    const composed = composeWorkflow({
      loadedModules: [
        {
          module: m1,
          body: "Orient: run {{vars.preflight_check}} before editing.",
        },
        {
          module: m2,
          body: "Issue {{id}} — see {{vars.tracker_url}}.",
        },
      ],
      workflow,
      step: "kickoff",
      ctx: {
        render: CTX,
        projectVars: { tracker_url: "https://example.test/op-203" },
      },
    });

    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed,
    });

    // Composed text — exact string the launcher would inject.
    expect(p.composed.text).toBe(
      "Orient: run git status before editing.\n\nIssue OP-203 — see https://example.test/op-203.",
    );
    expect(p.composed.chunks).toEqual([
      { moduleId: "orient", scope: "kickoff", sizeChars: 38 },
      { moduleId: "issue-context", scope: "kickoff", sizeChars: 47 },
    ]);

    // Per-var rows — stably sorted by name.
    expect(p.vars).toEqual([
      {
        name: "preflight_check",
        value: "git status",
        scope: "module",
        scopeLabel: "Module default",
        scopeAbbrev: "M",
        source: "orient",
      },
      {
        name: "tracker_url",
        value: "https://example.test/op-203",
        scope: "project",
        scopeLabel: "Project default",
        scopeAbbrev: "P",
        source: "project",
      },
    ]);

    // No diagnostics in the happy path.
    expect(p.diagnostics).toEqual([]);
    expect(p.diagnosticLines).toEqual([]);
    expect(p.diagnosticBlocks).toBe("");
  });
});

describe("buildExplainPayload — empty composed with loader diagnostics", () => {
  it("surfaces loader diagnostics even when composed text is empty (no WORKFLOW.md path)", () => {
    // Simulates what explainWorkflow does when loadAndComposeWorkflow returns
    // composed=null — it now calls buildExplainPayload with bundle.diagnostics
    // instead of silently returning an empty diagnostics array.
    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed: {
        text: "",
        orderedChunks: [],
        perVarSourceMap: {},
        sizeChars: 0,
        diagnostics: [
          {
            code: "schema-mismatch",
            severity: "error",
            message: "WORKFLOW.md not found for project obsidian-projects.",
            extra: { project: "obsidian-projects" },
          },
        ],
      },
    });

    expect(p.composed.text).toBe("");
    expect(p.vars).toEqual([]);
    expect(p.diagnostics).toHaveLength(1);
    expect(p.diagnostics[0].code).toBe("schema-mismatch");
    expect(p.diagnostics[0].severity).toBe("error");
    expect(p.diagnosticLines).toHaveLength(1);
    expect(p.diagnosticLines[0]).toMatch(/^\[E\] /);
    expect(p.diagnosticBlocks).not.toBe("");
  });

  it("surfaces agent-unrecognized warning when prepended to composed diagnostics", () => {
    // Simulates what explainWorkflow does when agent= is an unknown value —
    // it prepends a schema-mismatch warning before calling buildExplainPayload.
    const m = makeModule({ id: "orient" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["orient"] }]);
    const composed = composeWorkflow({
      loadedModules: [{ module: m, body: "All good." }],
      workflow,
      step: "kickoff",
      ctx: { render: CTX },
    });
    const agentWarning = {
      code: "schema-mismatch" as const,
      severity: "warning" as const,
      message: `op-explain-workflow: agent "badagent" is not a known agent id (claude, gemini, copilot); using default "claude".`,
      extra: { requestedAgent: "badagent", resolvedAgent: "claude" },
    };
    const p = buildExplainPayload({
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      context: CTX,
      composed: {
        ...composed,
        diagnostics: [agentWarning, ...composed.diagnostics],
      },
    });

    // Agent warning is first diagnostic; normal composition still succeeds.
    expect(p.diagnostics[0].code).toBe("schema-mismatch");
    expect(p.diagnostics[0].severity).toBe("warning");
    expect(p.composed.text).toBe("All good.");
    expect(p.diagnosticLines[0]).toMatch(/^\[W\] .*badagent/);
  });
});

describe("summarizeExplainPayload", () => {
  it("counts severities + var refs in one line", () => {
    const fake: ExplainWorkflowPayload = {
      issueId: "OP-203",
      project: "obsidian-projects",
      mode: "kickoff",
      agent: "claude",
      composed: { text: "x", sizeChars: 1, chunks: [] },
      vars: [
        // dummy
        {
          name: "a",
          value: "1",
          scope: "module",
          scopeLabel: "Module default",
          scopeAbbrev: "M",
          source: "m",
        },
      ],
      diagnostics: [
        {
          code: "missing-var",
          codeLabel: "Missing variable",
          severity: "warning",
          severityBadge: "W",
          message: "x",
          location: "",
        },
        {
          code: "size-budget",
          codeLabel: "Workflow size notice",
          severity: "info",
          severityBadge: "I",
          message: "x",
          location: "",
        },
      ],
      diagnosticLines: [],
      diagnosticBlocks: "",
    };
    expect(summarizeExplainPayload(fake)).toBe(
      "op-explain-workflow: OP-203 mode=kickoff agent=claude → 1 chars, 1 var, 0E/1W/1I diagnostics",
    );
  });
});

describe("precedenceLadder", () => {
  it("returns the four canonical scopes lowest-to-highest", () => {
    expect(precedenceLadder()).toEqual([
      { scope: "module", label: "Module default", abbrev: "M" },
      { scope: "global", label: "Global default", abbrev: "G" },
      { scope: "project", label: "Project default", abbrev: "P" },
      { scope: "launch", label: "Launch override", abbrev: "L" },
    ]);
  });
});
