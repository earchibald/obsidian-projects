import { describe, it, expect } from "vitest";
import {
  composeWorkflow,
  DEFAULT_MAX_WORKFLOW_CHARS,
  type ComposeContext,
  type LoadedModule,
} from "./composeWorkflowPure";
import type { RenderContext } from "./pluginVarRegistry";
import type { WorkflowFile, WorkflowStep } from "./workflowFilePure";
import type { WorkflowModule, VarDecl } from "./workflowModulePure";

// Pure composer tests. No fake `App`, no metadataCache — every input is built
// inline as plain data. The IO seam (`composeWorkflow.ts`) has its own tests.

const RENDER_CTX: RenderContext = {
  id: "OP-197",
  title: "1d composeWorkflow split",
  project: "obsidian-projects",
  status: "in-progress",
  priority: "high",
  parent: "OP-184",
  pr_url: undefined,
  github_issue: undefined,
  repo_path: "/Users/me/Projects/obsidian-projects",
  vault_path: "/Users/me/work/Agent-Vault",
  vault_name: "Agent-Vault",
  branch: "worktree-op-197",
  today: "2026-04-26",
  agent: "claude",
  model: "claude-opus-4-7",
  mode: "implement",
};

function makeModule(args: {
  id: string;
  scope: string;
  vars?: VarDecl[];
  project?: string;
  agent?: string;
  order?: number;
  lazy?: boolean;
  title?: string;
  description?: string;
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
    title: args.title ?? args.id,
    scope: args.scope,
    project: args.project,
    agent: args.agent,
    order: args.order ?? 0,
    lazy: args.lazy ?? false,
    description: args.description,
    vars: args.vars ?? [],
    source,
  };
}

/** Build a LoadedModule (module + body) for use in composeWorkflow tests. */
function loaded(args: Parameters<typeof makeModule>[0] & { body?: string }): LoadedModule {
  const { body, ...moduleArgs } = args;
  return { module: makeModule(moduleArgs), body: body ?? "" };
}

/** Build a single-step WorkflowFile from a step id and module id list. */
function workflowWith(step: string, modules: string[]) {
  return makeWorkflow([{ step, modules }]);
}

/** Build a RenderContext by merging overrides into RENDER_CTX. */
function renderCtx(overrides: Partial<RenderContext>): RenderContext {
  return { ...RENDER_CTX, ...overrides };
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

const baseCtx: ComposeContext = { render: RENDER_CTX };

// ---------------------------------------------------------------------------
// Step lookup + module ordering
// ---------------------------------------------------------------------------

describe("step lookup", () => {
  it("returns a schema-mismatch error when the step doesn't exist in the workflow", () => {
    const workflow = makeWorkflow([{ step: "kickoff", modules: [] }]);
    const r = composeWorkflow({ loadedModules: [], workflow, step: "nonexistent", ctx: baseCtx });
    expect(r.text).toBe("");
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]).toMatchObject({
      code: "schema-mismatch",
      severity: "error",
      stepId: "nonexistent",
    });
    expect(r.diagnostics[0].message).toContain("no step");
  });

  it("composes modules in the order the step lists them, ignoring file discovery order", () => {
    const m1 = makeModule({ id: "branching", scope: "kickoff" });
    const m2 = makeModule({ id: "tmux-safety", scope: "kickoff" });
    const m3 = makeModule({ id: "version-cadence", scope: "kickoff" });
    const workflow = makeWorkflow([
      { step: "kickoff", modules: ["branching", "tmux-safety", "version-cadence"] },
    ]);
    // Loader returns modules in arbitrary order — composer must respect the step's order.
    const loaded: LoadedModule[] = [
      { module: m3, body: "version-body" },
      { module: m1, body: "branching-body" },
      { module: m2, body: "tmux-body" },
    ];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    expect(r.orderedChunks.map((c) => c.moduleId)).toEqual([
      "branching",
      "tmux-safety",
      "version-cadence",
    ]);
    expect(r.text).toBe("branching-body\n\ntmux-body\n\nversion-body");
  });

  it("emits unknown-module for a step.modules entry with no matching loaded module", () => {
    const m = makeModule({ id: "branching", scope: "kickoff" });
    const workflow = makeWorkflow([
      { step: "kickoff", modules: ["branching", "missing-module"] },
    ]);
    const r = composeWorkflow({
      loadedModules: [{ module: m, body: "branching" }],
      workflow,
      step: "kickoff",
      ctx: baseCtx,
    });
    expect(r.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unknown-module",
        severity: "error",
        moduleId: "missing-module",
        stepId: "kickoff",
      }),
    );
    expect(r.orderedChunks.map((c) => c.moduleId)).toEqual(["branching"]);
  });

  it("returns an empty composed prompt for a step with no modules", () => {
    const workflow = makeWorkflow([{ step: "kickoff", modules: [] }]);
    const r = composeWorkflow({ loadedModules: [], workflow, step: "kickoff", ctx: baseCtx });
    expect(r.text).toBe("");
    expect(r.orderedChunks).toEqual([]);
    expect(r.diagnostics).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// User-var precedence
// ---------------------------------------------------------------------------

describe("user-var precedence (Module → Global → Project → Launch)", () => {
  function variantWith(overrides: Partial<ComposeContext>): ComposeContext {
    return { ...baseCtx, ...overrides };
  }

  const m = makeModule({
    id: "review-and-merge",
    scope: "review",
    vars: [{ kind: "default", name: "reviewer_handle", value: "@module-default" }],
  });
  const workflow = makeWorkflow([
    { step: "review", modules: ["review-and-merge"] },
  ]);
  const loaded: LoadedModule[] = [
    { module: m, body: "Reviewer: {{vars.reviewer_handle}}" },
  ];

  it("Module-default wins when no other layer supplies a value", () => {
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "review", ctx: baseCtx });
    expect(r.text).toBe("Reviewer: @module-default");
    expect(r.perVarSourceMap.reviewer_handle).toMatchObject({
      value: "@module-default",
      scope: "module",
      source: "review-and-merge",
    });
  });

  it("Global default overrides Module default", () => {
    const r = composeWorkflow({
      loadedModules: loaded,
      workflow,
      step: "review",
      ctx: variantWith({ globalVars: { reviewer_handle: "@global" } }),
    });
    expect(r.text).toBe("Reviewer: @global");
    expect(r.perVarSourceMap.reviewer_handle.scope).toBe("global");
  });

  it("Project default overrides Global", () => {
    const r = composeWorkflow({
      loadedModules: loaded,
      workflow,
      step: "review",
      ctx: variantWith({
        globalVars: { reviewer_handle: "@global" },
        projectVars: { reviewer_handle: "@project" },
      }),
    });
    expect(r.text).toBe("Reviewer: @project");
    expect(r.perVarSourceMap.reviewer_handle.scope).toBe("project");
  });

  it("Launch override wins over everything", () => {
    const r = composeWorkflow({
      loadedModules: loaded,
      workflow,
      step: "review",
      ctx: variantWith({
        globalVars: { reviewer_handle: "@global" },
        projectVars: { reviewer_handle: "@project" },
        launchVars: { reviewer_handle: "@launch" },
      }),
    });
    expect(r.text).toBe("Reviewer: @launch");
    expect(r.perVarSourceMap.reviewer_handle).toMatchObject({
      value: "@launch",
      scope: "launch",
      source: "launch",
    });
  });

  it("an empty-string Launch override wins (distinct from absent)", () => {
    const r = composeWorkflow({
      loadedModules: loaded,
      workflow,
      step: "review",
      ctx: variantWith({ launchVars: { reviewer_handle: "" } }),
    });
    expect(r.text).toBe("Reviewer: ");
    expect(r.perVarSourceMap.reviewer_handle).toMatchObject({ value: "", scope: "launch" });
  });
});

// ---------------------------------------------------------------------------
// Plugin-var fallthrough (OP-194 renderTemplate)
// ---------------------------------------------------------------------------

describe("plugin-var fallthrough", () => {
  it("renders {{id}} via PLUGIN_VAR_REGISTRY without a vars: declaration", () => {
    const m = makeModule({ id: "intro", scope: "kickoff" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["intro"] }]);
    const loaded: LoadedModule[] = [
      { module: m, body: "Working on {{id}} for {{project}} on {{branch}}." },
    ];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    expect(r.text).toBe(
      "Working on OP-197 for obsidian-projects on worktree-op-197.",
    );
  });

  it("user-var and plugin-var namespaces are disjoint by token shape", () => {
    const m = makeModule({
      id: "intro",
      scope: "kickoff",
      vars: [{ kind: "default", name: "id", value: "user-id" }],
    });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["intro"] }]);
    const loaded: LoadedModule[] = [
      { module: m, body: "plugin: {{id}} | user: {{vars.id}}" },
    ];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    // {{id}} → plugin var; {{vars.id}} → user var with the module's default.
    expect(r.text).toBe("plugin: OP-197 | user: user-id");
  });
});

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

describe("diagnostics", () => {
  it("missing-var (warning) when a declared user var resolves to no value at any layer", () => {
    const m = makeModule({
      id: "intro",
      scope: "kickoff",
      vars: [{ kind: "bare", name: "reviewer" }], // declared, no default
    });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["intro"] }]);
    const loaded: LoadedModule[] = [{ module: m, body: "Reviewer: {{vars.reviewer}}" }];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    expect(r.text).toBe("Reviewer: {{vars.reviewer}}");
    expect(r.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "missing-var",
        severity: "warning",
        moduleId: "intro",
        varName: "reviewer",
      }),
    );
  });

  it("malformed-frontmatter (warning, undeclared-but-referenced) when a body references {{vars.x}} but no module declares x", () => {
    const m = makeModule({ id: "intro", scope: "kickoff" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["intro"] }]);
    const loaded: LoadedModule[] = [
      { module: m, body: "Stage: {{vars.never_declared}}" },
    ];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    expect(r.text).toBe("Stage: {{vars.never_declared}}");
    expect(r.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "malformed-frontmatter",
        severity: "warning",
        moduleId: "intro",
        varName: "never_declared",
      }),
    );
    expect(r.diagnostics[0].message).toMatch(/never declared/);
  });

  it("malformed-frontmatter (info, declared-but-unused) when vars: declares x but body never references it", () => {
    const m = makeModule({
      id: "intro",
      scope: "kickoff",
      vars: [{ kind: "default", name: "unused_var", value: "ignored" }],
    });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["intro"] }]);
    const loaded: LoadedModule[] = [
      { module: m, body: "no vars referenced here" },
    ];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    expect(r.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "malformed-frontmatter",
        severity: "info",
        moduleId: "intro",
        varName: "unused_var",
      }),
    );
  });

  it("missing-var (warning) for unknown plugin-var tokens (re-emitted from renderTemplate)", () => {
    const m = makeModule({ id: "intro", scope: "kickoff" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["intro"] }]);
    const loaded: LoadedModule[] = [
      { module: m, body: "Hello {{notavar}}" },
    ];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    expect(r.text).toBe("Hello {{notavar}}");
    expect(r.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "missing-var",
        severity: "warning",
        moduleId: "intro",
        varName: "notavar",
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Size-budget overrun
// ---------------------------------------------------------------------------

describe("size-budget", () => {
  it("emits a size-budget info diagnostic when composed text exceeds maxWorkflowChars", () => {
    const big = "x".repeat(100);
    const m = makeModule({ id: "fat", scope: "kickoff" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["fat"] }]);
    const loaded: LoadedModule[] = [{ module: m, body: big }];
    const r = composeWorkflow({
      loadedModules: loaded,
      workflow,
      step: "kickoff",
      ctx: { ...baseCtx, maxWorkflowChars: 50 },
    });
    expect(r.sizeChars).toBe(100);
    const d = r.diagnostics.find((x) => x.code === "size-budget");
    expect(d).toMatchObject({ code: "size-budget", severity: "info" });
    expect(d?.extra).toMatchObject({ sizeChars: 100, maxWorkflowChars: 50 });
  });

  it("emits no size-budget diagnostic when below the cap", () => {
    const m = makeModule({ id: "small", scope: "kickoff" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["small"] }]);
    const loaded: LoadedModule[] = [{ module: m, body: "tiny body" }];
    const r = composeWorkflow({
      loadedModules: loaded,
      workflow,
      step: "kickoff",
      ctx: { ...baseCtx, maxWorkflowChars: 50000 },
    });
    expect(r.diagnostics.find((x) => x.code === "size-budget")).toBeUndefined();
  });

  it("default cap is 50000 when ctx.maxWorkflowChars is unset", () => {
    expect(DEFAULT_MAX_WORKFLOW_CHARS).toBe(50000);
    // Compose a small body; no diagnostic at default cap.
    const m = makeModule({ id: "small", scope: "kickoff" });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["small"] }]);
    const loaded: LoadedModule[] = [{ module: m, body: "tiny" }];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    expect(r.diagnostics.find((x) => x.code === "size-budget")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// extends: inheritance merge
// ---------------------------------------------------------------------------

describe("extends inheritance (composer reads merged workflow as opaque)", () => {
  it("composes modules from steps that came from both parent and child workflows", () => {
    // Simulate the post-merge workflow OP-196's mergeWorkflows would produce:
    // parent had [kickoff], child added [review]; the merged step list is
    // [kickoff, review] in that order.
    const mergedWorkflow = makeWorkflow([
      { step: "kickoff", modules: ["from-parent"] },
      { step: "review", modules: ["from-child"] },
    ]);
    const parentMod = makeModule({ id: "from-parent", scope: "kickoff" });
    const childMod = makeModule({ id: "from-child", scope: "review" });
    const loaded: LoadedModule[] = [
      { module: parentMod, body: "parent step body" },
      { module: childMod, body: "child step body" },
    ];

    const r1 = composeWorkflow({
      loadedModules: loaded,
      workflow: mergedWorkflow,
      step: "kickoff",
      ctx: baseCtx,
    });
    expect(r1.text).toBe("parent step body");

    const r2 = composeWorkflow({
      loadedModules: loaded,
      workflow: mergedWorkflow,
      step: "review",
      ctx: baseCtx,
    });
    expect(r2.text).toBe("child step body");
  });
});

// ---------------------------------------------------------------------------
// Intra-scope collision (OP-195 detector reuse)
// ---------------------------------------------------------------------------

describe("intra-scope collision visibility", () => {
  it("does NOT re-detect collisions — the composer trusts the loader's output", () => {
    // Two modules at the same scope declaring the same var. OP-195's
    // validateIntraScopeCollisions would have flagged it at load time. The
    // composer takes the alphabetically-first module's default deterministically;
    // it does not re-emit the collision diagnostic (that's the loader's job).
    const m1 = makeModule({
      id: "alpha",
      scope: "kickoff",
      vars: [{ kind: "default", name: "shared", value: "alpha-default" }],
    });
    const m2 = makeModule({
      id: "beta",
      scope: "kickoff",
      vars: [{ kind: "default", name: "shared", value: "beta-default" }],
    });
    const workflow = makeWorkflow([
      { step: "kickoff", modules: ["alpha", "beta"] },
    ]);
    const loaded: LoadedModule[] = [
      { module: m1, body: "{{vars.shared}}" },
      { module: m2, body: "{{vars.shared}}" },
    ];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    // Both chunks resolve via alpha's default (alphabetically first).
    expect(r.orderedChunks.map((c) => c.text)).toEqual(["alpha-default", "alpha-default"]);
    expect(r.perVarSourceMap.shared).toMatchObject({ value: "alpha-default", source: "alpha" });
    // No intra-scope-collision diagnostic from the composer itself.
    expect(r.diagnostics.find((x) => x.code === "intra-scope-collision")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Legacy kickoff splice
// ---------------------------------------------------------------------------

describe("legacy kickoff body splice", () => {
  it("splices legacyKickoffBody verbatim with no template substitution", () => {
    const workflow = makeWorkflow([
      {
        step: "kickoff",
        modules: [],
        legacyKickoffBody: "legacy body with {{id}} that should NOT substitute",
      },
    ]);
    const r = composeWorkflow({ loadedModules: [], workflow, step: "kickoff", ctx: baseCtx });
    expect(r.text).toBe("legacy body with {{id}} that should NOT substitute");
    expect(r.orderedChunks).toEqual([
      expect.objectContaining({ moduleId: "<legacy-kickoff>", scope: "kickoff" }),
    ]);
    expect(r.diagnostics).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Whitespace tolerance in tokens
// ---------------------------------------------------------------------------

describe("token whitespace", () => {
  it("tolerates whitespace inside {{vars.name}} braces", () => {
    const m = makeModule({
      id: "ws",
      scope: "kickoff",
      vars: [{ kind: "default", name: "foo", value: "FOO" }],
    });
    const workflow = makeWorkflow([{ step: "kickoff", modules: ["ws"] }]);
    const loaded: LoadedModule[] = [
      { module: m, body: "a {{ vars.foo }} b {{vars.foo}} c" },
    ];
    const r = composeWorkflow({ loadedModules: loaded, workflow, step: "kickoff", ctx: baseCtx });
    expect(r.text).toBe("a FOO b FOO c");
  });
});

// ---------------------------------------------------------------------------
// Lazy skill partition (OP-192)
// ---------------------------------------------------------------------------

describe("lazy skill partition (OP-192)", () => {
  it("excludes lazy modules from text/orderedChunks and emits them as lazySkills with an info diagnostic", () => {
    const normal = loaded({ id: "intro", scope: "kickoff", body: "Normal body" });
    const lazyMod = loaded({
      id: "tmux", scope: "kickoff", lazy: true,
      description: "tmux gotchas catalog", body: "Lazy body {{id}}",
    });
    const wf = workflowWith("kickoff", ["intro", "tmux"]);
    const r = composeWorkflow({
      loadedModules: [normal, lazyMod], workflow: wf, step: "kickoff",
      ctx: { render: renderCtx({ id: "OP-1" }) },
    });
    expect(r.text).toBe("Normal body");
    expect(r.orderedChunks.map(c => c.moduleId)).toEqual(["intro"]);
    expect(r.lazySkills).toEqual([
      { id: "tmux", name: "op-module-tmux", description: "tmux gotchas catalog", body: "Lazy body OP-1" },
    ]);
    expect(r.diagnostics.some(d => d.code === "lazy-skill" && d.severity === "info" && d.moduleId === "tmux")).toBe(true);
  });

  it("falls back to title with a lazy-skill warning when a lazy module has no description", () => {
    const lazyMod = loaded({ id: "tmux", scope: "kickoff", lazy: true, title: "Tmux Notes", body: "Body" });
    const wf = workflowWith("kickoff", ["tmux"]);
    const r = composeWorkflow({ loadedModules: [lazyMod], workflow: wf, step: "kickoff", ctx: { render: renderCtx({}) } });
    expect(r.lazySkills[0].description).toBe("Tmux Notes");
    expect(r.diagnostics.some(d => d.code === "lazy-skill" && d.severity === "warning" && /no .description/.test(d.message))).toBe(true);
  });

  it("resolves {{vars.x}} user-var tokens in lazy module bodies through the precedence chain", () => {
    // Module declares greeting with a default; the body references it.
    // Proves user-var substitution runs on lazy bodies (not just inlined chunks).
    const lazyMod = loaded({
      id: "greeter",
      scope: "kickoff",
      lazy: true,
      description: "A greeting module",
      vars: [{ kind: "default", name: "greeting", value: "hi" }],
      body: "Lazy {{vars.greeting}}",
    });
    const wf = workflowWith("kickoff", ["greeter"]);
    const r = composeWorkflow({
      loadedModules: [lazyMod],
      workflow: wf,
      step: "kickoff",
      ctx: { render: renderCtx({}) },
    });
    // The lazy skill's body should have the var substituted, not left as a token.
    expect(r.lazySkills[0].body).toBe("Lazy hi");
    // The var must appear in perVarSourceMap, resolved from the module default.
    expect(r.perVarSourceMap.greeting).toMatchObject({
      value: "hi",
      scope: "module",
      source: "greeter",
    });
    // The lazy module is NOT inlined.
    expect(r.text).toBe("");
    expect(r.orderedChunks).toEqual([]);
  });
});
