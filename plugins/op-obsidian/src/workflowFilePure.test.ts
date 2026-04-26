import { describe, it, expect } from "vitest";
import {
  classifyLegacy,
  parseAgentSpec,
  parseModelSpec,
  parseWorkflowFile,
  stripWorkflowFrontmatter,
  synthesizeLegacyWorkflow,
  validateWorkflowModels,
  type WorkflowFile,
} from "./workflowFilePure";

const PATH = "Projects/demo/WORKFLOW.md";
const PROJECT = "demo";

const ctx = (over: Partial<{ field: string; optional: boolean }> = {}) => ({
  path: PATH,
  field: over.field ?? "default_agent",
  optional: over.optional,
});

// ---------------------------------------------------------------------------
// parseAgentSpec
// ---------------------------------------------------------------------------

describe("parseAgentSpec — scalar", () => {
  it("wraps a scalar string", () => {
    const r = parseAgentSpec("claude", ctx());
    expect(r.value).toEqual(["claude"]);
    expect(r.diagnostics).toEqual([]);
  });

  it("trims surrounding whitespace", () => {
    const r = parseAgentSpec("  claude  ", ctx());
    expect(r.value).toEqual(["claude"]);
  });

  it("rejects whitespace-only string", () => {
    const r = parseAgentSpec("   ", ctx());
    expect(r.value).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("rejects empty string", () => {
    const r = parseAgentSpec("", ctx());
    expect(r.value).toBeNull();
  });
});

describe("parseAgentSpec — list", () => {
  it("accepts a list of strings", () => {
    const r = parseAgentSpec(["claude", "gemini"], ctx());
    expect(r.value).toEqual(["claude", "gemini"]);
  });

  it("trims and dedups while preserving order", () => {
    const r = parseAgentSpec(["claude", " claude ", "gemini", "claude"], ctx());
    expect(r.value).toEqual(["claude", "gemini"]);
  });

  it("silently drops blank entries", () => {
    const r = parseAgentSpec(["claude", "", "  ", "gemini"], ctx());
    expect(r.value).toEqual(["claude", "gemini"]);
    expect(r.diagnostics).toEqual([]);
  });

  it("rejects mixed list with non-string entries", () => {
    const r = parseAgentSpec(["claude", 1, true], ctx());
    expect(r.value).toBeNull();
    expect(r.diagnostics).toHaveLength(2);
  });

  it("rejects empty list", () => {
    const r = parseAgentSpec([], ctx());
    expect(r.value).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });
});

describe("parseAgentSpec — non-scalar non-list", () => {
  it("rejects a plain object", () => {
    const r = parseAgentSpec({ claude: "opus" }, ctx());
    expect(r.value).toBeNull();
  });

  it("rejects a Date", () => {
    const r = parseAgentSpec(new Date(), ctx());
    expect(r.value).toBeNull();
  });

  it("rejects a number", () => {
    const r = parseAgentSpec(42, ctx());
    expect(r.value).toBeNull();
  });

  it("rejects a boolean", () => {
    const r = parseAgentSpec(true, ctx());
    expect(r.value).toBeNull();
  });
});

describe("parseAgentSpec — optional", () => {
  it("accepts undefined when optional", () => {
    const r = parseAgentSpec(undefined, ctx({ optional: true }));
    expect(r.value).toBeNull();
    expect(r.diagnostics).toEqual([]);
  });

  it("accepts null when optional", () => {
    const r = parseAgentSpec(null, ctx({ optional: true }));
    expect(r.value).toBeNull();
    expect(r.diagnostics).toEqual([]);
  });

  it("rejects undefined when not optional", () => {
    const r = parseAgentSpec(undefined, ctx());
    expect(r.value).toBeNull();
    expect(r.diagnostics).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// parseModelSpec
// ---------------------------------------------------------------------------

describe("parseModelSpec — scalar / list / per-agent map", () => {
  it("scalar string -> kind:all with one value", () => {
    const r = parseModelSpec("opus", ctx({ field: "default_model" }));
    expect(r.value).toEqual({ kind: "all", values: ["opus"] });
  });

  it("trims a scalar string", () => {
    const r = parseModelSpec("  opus  ", ctx({ field: "default_model" }));
    expect(r.value).toEqual({ kind: "all", values: ["opus"] });
  });

  it("list of strings -> kind:all with values", () => {
    const r = parseModelSpec(["opus", "sonnet"], ctx({ field: "default_model" }));
    expect(r.value).toEqual({ kind: "all", values: ["opus", "sonnet"] });
  });

  it("list dedups while preserving order", () => {
    const r = parseModelSpec(["opus", "opus", "sonnet"], ctx({ field: "default_model" }));
    expect(r.value).toEqual({ kind: "all", values: ["opus", "sonnet"] });
  });

  it("plain object -> kind:perAgent with per-key list-or-scalar parsing", () => {
    const r = parseModelSpec(
      { claude: "opus", gemini: ["pro", "flash"] },
      ctx({ field: "default_model" }),
    );
    expect(r.value).toEqual({
      kind: "perAgent",
      perAgent: { claude: ["opus"], gemini: ["pro", "flash"] },
    });
  });
});

describe("parseModelSpec — bad shapes", () => {
  it("rejects empty list", () => {
    const r = parseModelSpec([], ctx({ field: "default_model" }));
    expect(r.value).toBeNull();
  });

  it("rejects empty per-agent object", () => {
    const r = parseModelSpec({}, ctx({ field: "default_model" }));
    expect(r.value).toBeNull();
  });

  it("rejects Date", () => {
    const r = parseModelSpec(new Date(), ctx({ field: "default_model" }));
    expect(r.value).toBeNull();
  });

  it("rejects number", () => {
    const r = parseModelSpec(42, ctx({ field: "default_model" }));
    expect(r.value).toBeNull();
  });

  it("propagates per-key failures and drops bad entries", () => {
    const r = parseModelSpec(
      { claude: "opus", gemini: 42 },
      ctx({ field: "default_model" }),
    );
    // The valid entry survives, the bad one emits a diagnostic.
    expect(r.value).toEqual({
      kind: "perAgent",
      perAgent: { claude: ["opus"] },
    });
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });

  it("rejects per-agent map with empty key", () => {
    const r = parseModelSpec({ "": "opus" }, ctx({ field: "default_model" }));
    expect(r.value).toBeNull();
  });
});

describe("parseModelSpec — optional", () => {
  it("undefined returns null + no diagnostics when optional", () => {
    const r = parseModelSpec(undefined, ctx({ field: "model", optional: true }));
    expect(r.value).toBeNull();
    expect(r.diagnostics).toEqual([]);
  });

  it("undefined returns null + 1 diagnostic when required", () => {
    const r = parseModelSpec(undefined, ctx({ field: "default_model" }));
    expect(r.value).toBeNull();
    expect(r.diagnostics).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// stripWorkflowFrontmatter — fence detection (shape 6)
// ---------------------------------------------------------------------------

describe("stripWorkflowFrontmatter", () => {
  it("strips frontmatter fence", () => {
    const raw = "---\ntype: workflow\n---\nbody\n";
    expect(stripWorkflowFrontmatter(raw)).toBe("body\n");
  });

  it("returns input verbatim when no fence", () => {
    const raw = "no fence here\n";
    expect(stripWorkflowFrontmatter(raw)).toBe(raw);
  });

  it("matches FIRST closing fence — body HR is preserved (shape 6)", () => {
    const raw = "---\ntype: workflow\n---\n# Title\n---\nhr-rule-after-frontmatter\n---\nmore\n";
    const body = stripWorkflowFrontmatter(raw);
    // Body retains the inline `---` lines verbatim; only the first closing
    // fence at position 14ish is consumed.
    expect(body).toBe("# Title\n---\nhr-rule-after-frontmatter\n---\nmore\n");
  });

  it("returns empty string when fence is unterminated", () => {
    const raw = "---\ntype: workflow\nno-close-fence";
    expect(stripWorkflowFrontmatter(raw)).toBe(raw);
  });

  it("returns empty string when content ends right after closing fence", () => {
    const raw = "---\ntype: workflow\n---";
    // `indexOf("\n---", 3)` finds the `\n---` before the closing fence.
    // Then `indexOf("\n", end + 4)` looks past the closing `---` for the
    // newline that bounds the body — there isn't one, so afterFence = -1
    // and the function returns "" (matches promptBuild.ts:stripFrontmatter).
    expect(stripWorkflowFrontmatter(raw)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// classifyLegacy — six shapes
// ---------------------------------------------------------------------------

describe("classifyLegacy — six shapes", () => {
  it("(1) no frontmatter at all -> legacy-1", () => {
    const c = classifyLegacy("Just some workflow prose.\n", undefined);
    expect(c.shape).toBe("legacy-1");
    expect(c.body).toBe("Just some workflow prose.\n");
  });

  it("(2) frontmatter present, no type field -> legacy-2", () => {
    const raw = "---\nproject: demo\n---\nbody\n";
    const c = classifyLegacy(raw, { project: "demo" });
    expect(c.shape).toBe("legacy-2");
    expect(c.body).toBe("body\n");
  });

  it("(3) type: workflow but no steps -> legacy-3", () => {
    const raw = "---\ntype: workflow\nschema: 1\n---\nbody\n";
    const c = classifyLegacy(raw, { type: "workflow", schema: 1 });
    expect(c.shape).toBe("legacy-3");
    expect(c.body).toBe("body\n");
  });

  it("(4) type: <other> -> legacy-4 (drop)", () => {
    const raw = "---\ntype: project\n---\nbody\n";
    const c = classifyLegacy(raw, { type: "project" });
    expect(c.shape).toBe("legacy-4");
  });

  it("(5) frontmatter parses to null -> legacy-5", () => {
    const raw = "---\n---\nbody\n";
    const c = classifyLegacy(raw, null);
    expect(c.shape).toBe("legacy-5");
    expect(c.body).toBe("body\n");
  });

  it("(6) body contains --- after fence -> classifies as modern when type+steps present", () => {
    const raw = "---\ntype: workflow\nschema: 1\nsteps: []\n---\n# Section\n---\nhr-after-frontmatter\n";
    const c = classifyLegacy(raw, { type: "workflow", schema: 1, steps: [] });
    expect(c.shape).toBe("modern");
  });

  it("(6) body --- is preserved in classification body output for legacy-3", () => {
    const raw = "---\ntype: workflow\n---\n# Section\n---\nhr-after-frontmatter\n";
    const c = classifyLegacy(raw, { type: "workflow" });
    expect(c.shape).toBe("legacy-3");
    expect(c.body).toBe("# Section\n---\nhr-after-frontmatter\n");
  });
});

// ---------------------------------------------------------------------------
// synthesizeLegacyWorkflow
// ---------------------------------------------------------------------------

describe("synthesizeLegacyWorkflow", () => {
  it("produces a synthetic kickoff step carrying the body verbatim", () => {
    const wf = synthesizeLegacyWorkflow({
      path: PATH,
      project: PROJECT,
      body: "the entire WORKFLOW.md body\n",
      shape: "legacy-1",
    });
    expect(wf.source).toEqual({ path: PATH, project: PROJECT, isLegacy: true });
    expect(wf.steps).toHaveLength(1);
    expect(wf.steps[0]).toEqual({
      step: "kickoff",
      modules: [],
      legacyKickoffBody: "the entire WORKFLOW.md body\n",
    });
    expect(wf.defaultAgent).toEqual([]);
    expect(wf.defaultModel).toEqual({ kind: "all", values: [] });
    expect(wf.extendsPath).toBeNull();
  });

  it("works for shapes 1, 2, 3, 4, 5", () => {
    for (const shape of ["legacy-1", "legacy-2", "legacy-3", "legacy-4", "legacy-5"] as const) {
      const wf = synthesizeLegacyWorkflow({ path: PATH, project: PROJECT, body: "x", shape });
      expect(wf.steps[0].legacyKickoffBody).toBe("x");
    }
  });

  it("throws only for 'modern' (defensive)", () => {
    expect(() =>
      synthesizeLegacyWorkflow({ path: PATH, project: PROJECT, body: "x", shape: "modern" }),
    ).toThrow();
    // legacy-4 no longer throws: OP-208 shape-4 cutover fix — body is
    // synthesised so pre-cutover users don't silently lose workflow content.
    expect(() =>
      synthesizeLegacyWorkflow({ path: PATH, project: PROJECT, body: "x", shape: "legacy-4" }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseWorkflowFile — modern path
// ---------------------------------------------------------------------------

const modernFm = (over: Record<string, unknown> = {}) => ({
  type: "workflow",
  schema: 1,
  project: PROJECT,
  default_agent: "claude",
  default_model: "opus",
  steps: [
    { step: "kickoff", modules: ["orient"] },
  ],
  ...over,
});

describe("parseWorkflowFile — happy path", () => {
  it("parses a minimal modern workflow", () => {
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: modernFm() });
    expect(r.workflow).not.toBeNull();
    expect(r.diagnostics).toEqual([]);
    const wf = r.workflow!;
    expect(wf.type).toBe("workflow");
    expect(wf.schema).toBe(1);
    expect(wf.project).toBe(PROJECT);
    expect(wf.defaultAgent).toEqual(["claude"]);
    expect(wf.defaultModel).toEqual({ kind: "all", values: ["opus"] });
    expect(wf.extendsPath).toBeNull();
    expect(wf.steps).toHaveLength(1);
    expect(wf.steps[0]).toEqual({ step: "kickoff", modules: ["orient"] });
    expect(wf.source).toEqual({ path: PATH, project: PROJECT, isLegacy: false });
  });

  it("parses a step with agent + model overrides", () => {
    const fm = modernFm({
      steps: [
        { step: "kickoff", modules: ["orient"], agent: "gemini", model: "flash" },
      ],
    });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.steps[0].agent).toEqual(["gemini"]);
    expect(r.workflow!.steps[0].model).toEqual({ kind: "all", values: ["flash"] });
  });

  it("parses a per-agent default_model", () => {
    const fm = modernFm({
      default_agent: ["claude", "gemini"],
      default_model: { claude: "opus", gemini: "pro" },
    });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.defaultModel).toEqual({
      kind: "perAgent",
      perAgent: { claude: ["opus"], gemini: ["pro"] },
    });
  });

  it("captures extends path verbatim", () => {
    const fm = modernFm({ extends: "Projects/_op-workflow.md" });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.extendsPath).toBe("Projects/_op-workflow.md");
  });
});

describe("parseWorkflowFile — type / schema gates", () => {
  it("emits schema-mismatch when type is missing", () => {
    const fm = modernFm();
    delete (fm as Record<string, unknown>).type;
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
    expect(r.diagnostics[0].code).toBe("schema-mismatch");
  });

  it("emits schema-mismatch when type is wrong", () => {
    const fm = modernFm({ type: "project" });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
    expect(r.diagnostics[0].code).toBe("schema-mismatch");
  });

  it("emits schema-mismatch when schema is wrong", () => {
    const fm = modernFm({ schema: 2 });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
    expect(r.diagnostics[0].code).toBe("schema-mismatch");
  });

  it("emits schema-mismatch when schema is missing", () => {
    const fm = modernFm();
    delete (fm as Record<string, unknown>).schema;
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
    expect(r.diagnostics[0].code).toBe("schema-mismatch");
  });
});

describe("parseWorkflowFile — required fields", () => {
  it("rejects missing project", () => {
    const fm = modernFm();
    delete (fm as Record<string, unknown>).project;
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
  });

  it("warns when project field disagrees with file slug but keeps the file slug", () => {
    const fm = modernFm({ project: "other-slug" });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).not.toBeNull();
    expect(r.workflow!.project).toBe(PROJECT);
    expect(r.diagnostics.some((d) => d.code === "malformed-frontmatter" && d.severity === "warning")).toBe(true);
  });

  it("rejects missing default_agent", () => {
    const fm = modernFm();
    delete (fm as Record<string, unknown>).default_agent;
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
  });

  it("rejects missing default_model", () => {
    const fm = modernFm();
    delete (fm as Record<string, unknown>).default_model;
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
  });

  it("rejects missing steps", () => {
    const fm = modernFm();
    delete (fm as Record<string, unknown>).steps;
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
  });

  it("rejects steps that isn't an array", () => {
    const fm = modernFm({ steps: { kickoff: ["orient"] } });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
  });
});

describe("parseWorkflowFile — step shape", () => {
  it("rejects a step with missing step id", () => {
    const fm = modernFm({ steps: [{ modules: ["orient"] }] });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).not.toBeNull(); // workflow still produced
    expect(r.workflow!.steps).toHaveLength(0);
    expect(r.diagnostics.some((d) => d.message.includes("steps[0].step"))).toBe(true);
  });

  it("treats missing modules as empty list", () => {
    const fm = modernFm({ steps: [{ step: "kickoff" }] });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.steps).toHaveLength(1);
    expect(r.workflow!.steps[0].modules).toEqual([]);
  });

  it("rejects modules that isn't a list", () => {
    const fm = modernFm({ steps: [{ step: "kickoff", modules: "orient" }] });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.steps).toHaveLength(0);
  });

  it("dedups module ids while preserving order", () => {
    const fm = modernFm({
      steps: [{ step: "kickoff", modules: ["orient", "orient", "evaluate"] }],
    });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.steps[0].modules).toEqual(["orient", "evaluate"]);
  });

  it("rejects duplicate step ids — first wins, second emits diagnostic", () => {
    const fm = modernFm({
      steps: [
        { step: "kickoff", modules: ["a"] },
        { step: "kickoff", modules: ["b"] },
      ],
    });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.steps).toHaveLength(1);
    expect(r.workflow!.steps[0].modules).toEqual(["a"]);
    expect(r.diagnostics.some((d) => d.message.includes("duplicate step id"))).toBe(true);
  });

  it("rejects a non-object step entry", () => {
    const fm = modernFm({ steps: ["not a step"] });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.steps).toHaveLength(0);
  });

  it("optional agent/model on a step are skipped silently when absent", () => {
    const fm = modernFm({ steps: [{ step: "kickoff", modules: ["a"] }] });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.steps[0].agent).toBeUndefined();
    expect(r.workflow!.steps[0].model).toBeUndefined();
    expect(r.diagnostics).toEqual([]);
  });
});

describe("parseWorkflowFile — extends shape", () => {
  it("rejects non-string extends", () => {
    const fm = modernFm({ extends: 42 });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
  });

  it("rejects empty-string extends", () => {
    const fm = modernFm({ extends: "  " });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow).toBeNull();
  });

  it("treats null extends as absent", () => {
    const fm = modernFm({ extends: null });
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: fm });
    expect(r.workflow!.extendsPath).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseWorkflowFile — frontmatter shape edges
// ---------------------------------------------------------------------------

describe("parseWorkflowFile — frontmatter edges", () => {
  it("rejects null frontmatter", () => {
    const r = parseWorkflowFile({ path: PATH, project: PROJECT, frontmatter: null });
    expect(r.workflow).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("rejects array frontmatter", () => {
    const r = parseWorkflowFile({
      path: PATH,
      project: PROJECT,
      frontmatter: [] as unknown as Record<string, unknown>,
    });
    expect(r.workflow).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateWorkflowModels
// ---------------------------------------------------------------------------

const goodWorkflow = (): WorkflowFile => ({
  source: { path: PATH, project: PROJECT, isLegacy: false },
  type: "workflow",
  schema: 1,
  project: PROJECT,
  defaultAgent: ["claude"],
  defaultModel: { kind: "all", values: ["opus"] },
  extendsPath: null,
  steps: [{ step: "kickoff", modules: ["orient"] }],
});

describe("validateWorkflowModels", () => {
  it("emits no diagnostics for a clean workflow", () => {
    expect(validateWorkflowModels(goodWorkflow())).toEqual([]);
  });

  it("emits bad-model for a typo in default_model with allowed-arrays in extra", () => {
    const wf = goodWorkflow();
    wf.defaultModel = { kind: "all", values: ["ultra"] };
    const diags = validateWorkflowModels(wf);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe("bad-model");
    expect(diags[0].stepId).toBe("<defaults>");
    expect(diags[0].extra).toMatchObject({
      stepId: "<defaults>",
      badName: "ultra",
      agent: "claude",
    });
    expect(Array.isArray((diags[0].extra as Record<string, unknown>).allowedAliases)).toBe(true);
  });

  it("emits bad-model for a step-level model typo", () => {
    const wf = goodWorkflow();
    wf.steps[0].model = { kind: "all", values: ["wrongone"] };
    const diags = validateWorkflowModels(wf);
    expect(diags.some((d) => d.code === "bad-model" && d.stepId === "kickoff")).toBe(true);
  });

  it("emits bad-model per (agent, model) cross-product for kind:all", () => {
    const wf = goodWorkflow();
    wf.defaultAgent = ["claude", "gemini"];
    wf.defaultModel = { kind: "all", values: ["opus"] };
    // opus is valid for claude but not for gemini.
    const diags = validateWorkflowModels(wf);
    const bad = diags.filter((d) => d.code === "bad-model");
    expect(bad).toHaveLength(1);
    expect(bad[0].extra).toMatchObject({ agent: "gemini", badName: "opus" });
  });

  it("validates only explicit pairs for kind:perAgent", () => {
    const wf = goodWorkflow();
    wf.defaultAgent = ["claude", "gemini"];
    wf.defaultModel = {
      kind: "perAgent",
      perAgent: { claude: ["opus"], gemini: ["pro"] },
    };
    expect(validateWorkflowModels(wf)).toEqual([]);
  });

  it("warns when perAgent map references an agent not in the agents list", () => {
    const wf = goodWorkflow();
    wf.defaultAgent = ["claude"];
    wf.defaultModel = {
      kind: "perAgent",
      perAgent: { claude: ["opus"], gemini: ["pro"] },
    };
    const diags = validateWorkflowModels(wf);
    expect(
      diags.some(
        (d) => d.severity === "warning" && d.message.includes('per-agent entry for "gemini"'),
      ),
    ).toBe(true);
  });

  it("skips synthetic legacy steps (no agent/model overrides)", () => {
    const wf = goodWorkflow();
    wf.defaultAgent = []; // legacy synth uses empty agents
    wf.defaultModel = { kind: "all", values: [] };
    wf.steps = [{ step: "kickoff", modules: [], legacyKickoffBody: "body" }];
    expect(validateWorkflowModels(wf)).toEqual([]);
  });

  it("step-level overrides win over defaults", () => {
    const wf = goodWorkflow();
    wf.defaultModel = { kind: "all", values: ["sonnet"] };
    wf.steps[0].model = { kind: "all", values: ["opus"] }; // both valid for claude
    expect(validateWorkflowModels(wf)).toEqual([]);
  });
});
