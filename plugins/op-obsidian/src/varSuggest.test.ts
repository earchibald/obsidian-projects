import { describe, it, expect } from "vitest";
import {
  buildCandidates,
  buildObjectFormSnippet,
  classifyWorkflowFile,
  getDoubleBraceTrigger,
  getVarsBlockTrigger,
  isWorkflowFile,
  keyedMapApplies,
  renderPerAgentKeyedMap,
  type VarCandidate,
} from "./varSuggest";
import type { WorkflowModule } from "./workflowModulePure";

const FAKE_GLOBAL_MOD: WorkflowModule = {
  id: "orient",
  title: "Orient",
  scope: "kickoff",
  order: 0,
  vars: [
    { kind: "object", name: "tone", default: "concise", description: "Voice for the agent." },
    { kind: "default", name: "lang", value: "en" },
  ],
  source: { kind: "global", path: "Projects/_op-modules/orient.md" },
};

const FAKE_PROJECT_MOD: WorkflowModule = {
  id: "house-style",
  title: "House style",
  scope: "kickoff",
  order: 0,
  vars: [{ kind: "object", name: "tone", default: "warm", description: "Per-project tone override." }],
  source: { kind: "project", path: "Projects/demo/MODULES/house-style.md", projectSlug: "demo" },
};

const FAKE_CURRENT_MOD: WorkflowModule = {
  id: "review",
  title: "Review",
  scope: "review",
  order: 0,
  vars: [
    { kind: "bare", name: "reviewer" },
    { kind: "object", name: "checklist", default: "default-checklist" },
  ],
  source: { kind: "global", path: "Projects/_op-modules/review.md" },
};

describe("getDoubleBraceTrigger", () => {
  it("fires immediately after `{{`", () => {
    const t = getDoubleBraceTrigger({ lineText: "Hello {{", ch: 8 });
    expect(t).toMatchObject({ startCh: 8, endCh: 8, query: "", isVarsNamespace: false });
  });

  it("captures a partial token after `{{`", () => {
    const t = getDoubleBraceTrigger({ lineText: "Hello {{ti", ch: 10 });
    expect(t).toMatchObject({ startCh: 8, endCh: 10, query: "ti", isVarsNamespace: false });
  });

  it("recognises the `vars.` namespace and exposes only the post-dot query", () => {
    const t = getDoubleBraceTrigger({ lineText: "x {{vars.to", ch: 11 });
    expect(t).toMatchObject({ startCh: 9, endCh: 11, query: "to", isVarsNamespace: true });
  });

  it("does not fire when the cursor is past a closing `}}`", () => {
    expect(getDoubleBraceTrigger({ lineText: "{{id}} done", ch: 11 })).toBeNull();
  });

  it("does not fire mid-whitespace inside the open token", () => {
    expect(getDoubleBraceTrigger({ lineText: "x {{ id", ch: 7 })).toBeNull();
  });

  it("rejects an unknown namespace prefix", () => {
    expect(getDoubleBraceTrigger({ lineText: "{{global.id", ch: 11 })).toBeNull();
  });

  it("rejects a `vars.foo.bar` chain", () => {
    expect(getDoubleBraceTrigger({ lineText: "{{vars.foo.b", ch: 12 })).toBeNull();
  });

  it("returns null when no `{{` precedes the cursor", () => {
    expect(getDoubleBraceTrigger({ lineText: "plain text", ch: 5 })).toBeNull();
  });
});

describe("getVarsBlockTrigger", () => {
  const mkLines = (s: string) => s.split("\n");

  it("fires on an empty bullet under `vars:`", () => {
    const lines = mkLines("---\nid: x\nvars:\n  - \n---");
    const t = getVarsBlockTrigger({ lines, cursor: { line: 3, ch: 4 } });
    expect(t).not.toBeNull();
    expect(t?.line).toBe(3);
    expect(t?.startCh).toBe(4);
    expect(t?.snippet.text).toMatch(/name/);
  });

  it("does not fire when the bullet line already has content", () => {
    const lines = mkLines("---\nvars:\n  - foo=bar\n---");
    const t = getVarsBlockTrigger({ lines, cursor: { line: 2, ch: 5 } });
    expect(t).toBeNull();
  });

  it("does not fire under a sibling YAML key", () => {
    const lines = mkLines("---\nvars:\n  - existing\ntags:\n  - \n---");
    const t = getVarsBlockTrigger({ lines, cursor: { line: 4, ch: 4 } });
    expect(t).toBeNull();
  });

  it("does not fire on a non-bullet line", () => {
    const lines = mkLines("---\nvars:\n  foo\n---");
    const t = getVarsBlockTrigger({ lines, cursor: { line: 2, ch: 4 } });
    expect(t).toBeNull();
  });

  it("respects the frontmatter fence as a hard boundary", () => {
    const lines = mkLines("vars:\n---\n  - \n---");
    const t = getVarsBlockTrigger({ lines, cursor: { line: 2, ch: 4 } });
    expect(t).toBeNull();
  });
});

describe("buildObjectFormSnippet", () => {
  it("emits the object form with cursor at NAME", () => {
    const s = buildObjectFormSnippet();
    expect(s.text).toBe(`{ name: NAME, default: "" }`);
    expect(s.cursorOffset).toBe(s.text.indexOf("NAME"));
  });
});

describe("buildCandidates", () => {
  const named = (cs: VarCandidate[]) => cs.map((c) => `${c.kind}:${c.name}`);

  it("returns plugin vars first, then user vars", () => {
    const cs = buildCandidates({
      currentModule: FAKE_CURRENT_MOD,
      globalModules: [FAKE_GLOBAL_MOD],
      projectModules: [],
    });
    // Plugin vars come from the registry — first one is "id" by registry order.
    expect(cs[0].kind).toBe("plugin");
    expect(cs[0].name).toBe("id");
    // Last user vars should be appended after every plugin entry.
    const firstUserIdx = cs.findIndex((c) => c.kind === "user");
    expect(firstUserIdx).toBeGreaterThan(0);
    expect(cs.slice(firstUserIdx).every((c) => c.kind === "user")).toBe(true);
  });

  it("filters by query case-insensitively on `startsWith`", () => {
    const cs = buildCandidates({
      currentModule: FAKE_CURRENT_MOD,
      query: "PR",
    });
    // `PR` matches the plugin var `pr_url` and `priority` and `project`.
    expect(cs.every((c) => c.name.toLowerCase().startsWith("pr"))).toBe(true);
    expect(cs.length).toBeGreaterThan(0);
  });

  it("restricts to user vars under the `vars.` namespace", () => {
    const cs = buildCandidates({
      currentModule: FAKE_CURRENT_MOD,
      varsNamespaceOnly: true,
    });
    expect(cs.every((c) => c.kind === "user")).toBe(true);
    expect(named(cs)).toEqual(expect.arrayContaining(["user:reviewer", "user:checklist"]));
  });

  it("de-duplicates a user var across precedence layers, keeping the highest", () => {
    const cs = buildCandidates({
      currentModule: null,
      globalModules: [FAKE_GLOBAL_MOD],
      projectModules: [FAKE_PROJECT_MOD],
      varsNamespaceOnly: true,
    });
    const tones = cs.filter((c) => c.name === "tone");
    expect(tones).toHaveLength(1);
    // Project layer is highest in the precedence walk among module/global/project.
    expect(tones[0].sourceLabel).toBe("Project default");
    expect(tones[0].preview).toBe("warm");
  });

  it("inserts `{{name}}` for plugin vars and `{{vars.name}}` for user vars", () => {
    const cs = buildCandidates({
      currentModule: FAKE_CURRENT_MOD,
    });
    const id = cs.find((c) => c.kind === "plugin" && c.name === "id");
    const reviewer = cs.find((c) => c.kind === "user" && c.name === "reviewer");
    expect(id?.insertText).toBe("{{id}}");
    expect(reviewer?.insertText).toBe("{{vars.reviewer}}");
  });

  it("uses the canonical Launch-override label for plugin vars", () => {
    const cs = buildCandidates({});
    expect(cs[0].sourceLabel).toBe("Plugin (Launch override)");
  });

  it("uses the canonical scope label per precedence layer for user vars", () => {
    const cs = buildCandidates({
      globalModules: [FAKE_GLOBAL_MOD],
      varsNamespaceOnly: true,
    });
    const tone = cs.find((c) => c.name === "tone");
    expect(tone?.sourceLabel).toBe("Global default");
    expect(tone?.sourceAbbrev).toBe("G");
  });
});

describe("keyedMapApplies", () => {
  it("returns true for multi-agent + scalar/list model", () => {
    expect(
      keyedMapApplies({
        defaultAgent: ["claude", "gemini"],
        defaultModel: { kind: "all", values: ["opus"] },
      }),
    ).toBe(true);
  });

  it("returns false for single-agent workflows", () => {
    expect(
      keyedMapApplies({
        defaultAgent: ["claude"],
        defaultModel: { kind: "all", values: ["opus"] },
      }),
    ).toBe(false);
  });

  it("returns false when the model is already a per-agent map", () => {
    expect(
      keyedMapApplies({
        defaultAgent: ["claude", "gemini"],
        defaultModel: { kind: "perAgent", perAgent: { claude: ["opus"] } },
      }),
    ).toBe(false);
  });
});

describe("isWorkflowFile / classifyWorkflowFile", () => {
  it("recognises a global module path", () => {
    expect(isWorkflowFile("Projects/_op-modules/orient.md")).toBe(true);
    expect(classifyWorkflowFile("Projects/_op-modules/orient.md")).toEqual({
      kind: "global-module",
      id: "orient",
    });
  });

  it("recognises a per-project module path", () => {
    expect(classifyWorkflowFile("Projects/demo/MODULES/house.md")).toEqual({
      kind: "project-module",
      slug: "demo",
      id: "house",
    });
  });

  it("recognises a workflow file path", () => {
    expect(classifyWorkflowFile("Projects/demo/WORKFLOW.md")).toEqual({
      kind: "workflow",
      slug: "demo",
    });
  });

  it("rejects regular issue notes", () => {
    expect(isWorkflowFile("Projects/demo/ISSUES/OP-1 something.md")).toBe(false);
    expect(classifyWorkflowFile("Projects/demo/ISSUES/OP-1 something.md")).toBeNull();
  });

  it("rejects nested paths under the global modules dir", () => {
    expect(classifyWorkflowFile("Projects/_op-modules/sub/orient.md")).toBeNull();
  });
});

describe("renderPerAgentKeyedMap", () => {
  it("emits one row per agent, single-line for a single value", () => {
    const out = renderPerAgentKeyedMap({
      defaultAgent: ["claude", "gemini"],
      modelValues: ["opus"],
    });
    expect(out).toBe(`  claude: opus\n  gemini: opus`);
  });

  it("emits a list under each agent for multi-value model specs", () => {
    const out = renderPerAgentKeyedMap({
      defaultAgent: ["claude"],
      modelValues: ["opus", "sonnet"],
    });
    expect(out).toBe(`  claude:\n    - opus\n    - sonnet`);
  });

  it("emits empty-string rows when no model values are provided", () => {
    const out = renderPerAgentKeyedMap({
      defaultAgent: ["claude", "gemini"],
      modelValues: [],
    });
    expect(out).toBe(`  claude: ""\n  gemini: ""`);
  });
});
