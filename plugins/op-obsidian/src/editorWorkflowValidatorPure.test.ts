import { describe, it, expect } from "vitest";
import {
  enumerateTuples,
  dedupeDiagnostics,
  summarizeStatus,
  locateDiagnostic,
} from "./editorWorkflowValidatorPure";
import type { WorkflowFile } from "./workflowFilePure";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

function workflow(args: Partial<WorkflowFile> & { steps: WorkflowFile["steps"] }): WorkflowFile {
  return {
    source: { path: "Projects/demo/WORKFLOW.md", project: "demo", isLegacy: false },
    type: "workflow",
    schema: 1,
    project: "demo",
    defaultAgent: ["claude"],
    defaultModel: { kind: "all", values: ["opus"] },
    extendsPath: null,
    ...args,
  };
}

describe("enumerateTuples", () => {
  it("emits one tuple per step using workflow.defaultAgent when no override", () => {
    const wf = workflow({
      steps: [
        { step: "kickoff", modules: [] },
        { step: "implement", modules: [] },
      ],
    });
    const tuples = enumerateTuples(wf, ["claude"]);
    expect(tuples).toEqual([
      { step: "kickoff", agent: "claude" },
      { step: "implement", agent: "claude" },
    ]);
  });

  it("uses step.agent override when present", () => {
    const wf = workflow({
      defaultAgent: ["claude"],
      steps: [{ step: "review", modules: [], agent: ["gemini"] }],
    });
    const tuples = enumerateTuples(wf, ["claude", "gemini"]);
    expect(tuples).toEqual([{ step: "review", agent: "gemini" }]);
  });

  it("filters to installed agents but falls back when intersection is empty", () => {
    const wf = workflow({
      defaultAgent: ["claude", "gemini"],
      steps: [{ step: "kickoff", modules: [] }],
    });
    // Both installed → both fan out.
    expect(enumerateTuples(wf, ["claude", "gemini"])).toEqual([
      { step: "kickoff", agent: "claude" },
      { step: "kickoff", agent: "gemini" },
    ]);
    // Intersection empty → fall back to declared agents so compose still runs.
    expect(enumerateTuples(wf, ["copilot"])).toEqual([
      { step: "kickoff", agent: "claude" },
      { step: "kickoff", agent: "gemini" },
    ]);
  });

  it("normalizes legacy step name 'work' to 'implement' and dedupes", () => {
    const wf = workflow({
      steps: [
        { step: "work", modules: [] },
        // A second pre-OP-185 author may have shipped both — collapse.
        { step: "implement", modules: [] },
      ],
    });
    const tuples = enumerateTuples(wf, ["claude"]);
    expect(tuples).toEqual([{ step: "implement", agent: "claude" }]);
  });
});

describe("dedupeDiagnostics", () => {
  const base = (over: Partial<WorkflowDiagnostic> = {}): WorkflowDiagnostic => ({
    code: "missing-var",
    severity: "warning",
    message: "msg",
    moduleId: "m",
    varName: "x",
    ...over,
  });

  it("collapses identical diagnostics emitted by the sweep", () => {
    const out = dedupeDiagnostics([base(), base(), base()]);
    expect(out.length).toBe(1);
  });

  it("keeps diagnostics that differ in any keyed field", () => {
    const out = dedupeDiagnostics([
      base({ varName: "x" }),
      base({ varName: "y" }),
      base({ moduleId: "n" }),
      base({ severity: "error" }),
    ]);
    expect(out.length).toBe(4);
  });

  it("preserves first-seen order", () => {
    const out = dedupeDiagnostics([
      base({ varName: "a" }),
      base({ varName: "b" }),
      base({ varName: "a" }),
    ]);
    expect(out.map((d) => d.varName)).toEqual(["a", "b"]);
  });
});

describe("summarizeStatus", () => {
  it("'Workflow OK' on a clean diagnostic stream", () => {
    expect(summarizeStatus([]).footerLine).toBe("Workflow OK");
  });

  it("singular and plural error copy + dangling counters", () => {
    const one = summarizeStatus([
      { code: "bad-model", severity: "error", message: "x" },
    ]);
    expect(one.footerLine).toBe("1 error will block launch");

    const many = summarizeStatus([
      { code: "bad-model", severity: "error", message: "x" },
      { code: "bad-model", severity: "error", message: "y" },
      { code: "missing-var", severity: "warning", message: "z" },
      { code: "size-budget", severity: "info", message: "w" },
    ]);
    expect(many.footerLine).toBe("2 errors will block launch · 1W · 1I");
    expect(many.errors).toBe(2);
    expect(many.warnings).toBe(1);
    expect(many.info).toBe(1);
  });

  it("warning/info-only line uses prose copy", () => {
    expect(
      summarizeStatus([
        { code: "missing-var", severity: "warning", message: "x" },
        { code: "size-budget", severity: "info", message: "y" },
      ]).footerLine,
    ).toBe("1 warning · 1 notice");
  });
});

describe("locateDiagnostic", () => {
  it("finds the bad model id inside the frontmatter fence", () => {
    const raw = `---
type: workflow
default_model: opuss
steps:
  - step: kickoff
    modules: []
---
body
`;
    const diag: WorkflowDiagnostic = {
      code: "bad-model",
      severity: "error",
      message: "x",
      stepId: "<defaults>",
      extra: {
        stepId: "<defaults>",
        badName: "opuss",
        agent: "claude",
        allowedAliases: [],
        allowedVersioned: [],
      },
    };
    const range = locateDiagnostic(diag, {
      filePath: "Projects/demo/WORKFLOW.md",
      raw,
    });
    expect(range).not.toBeNull();
    expect(raw.slice(range!.from, range!.to)).toBe("opuss");
  });

  it("finds an unknown module id in the steps frontmatter", () => {
    const raw = `---
type: workflow
steps:
  - step: kickoff
    modules:
      - typo-id
---
body
`;
    const diag: WorkflowDiagnostic = {
      code: "unknown-module",
      severity: "error",
      message: "x",
      moduleId: "typo-id",
      stepId: "kickoff",
      extra: { step: "kickoff", moduleId: "typo-id" },
    };
    const range = locateDiagnostic(diag, {
      filePath: "Projects/demo/WORKFLOW.md",
      raw,
    });
    expect(range).not.toBeNull();
    expect(raw.slice(range!.from, range!.to)).toBe("typo-id");
  });

  it("locates a {{vars.foo}} token in a module body", () => {
    const raw = `---
id: m
type: workflow-module
scope: s
---
Some prose with {{vars.repo_root}} embedded.
`;
    const diag: WorkflowDiagnostic = {
      code: "missing-var",
      severity: "warning",
      message: "x",
      moduleId: "m",
      varName: "repo_root",
    };
    const range = locateDiagnostic(diag, {
      filePath: "Projects/_op-modules/m.md",
      raw,
    });
    expect(range).not.toBeNull();
    expect(raw.slice(range!.from, range!.to)).toBe("{{vars.repo_root}}");
  });

  it("falls back to {{name}} for plugin-var tokens", () => {
    const raw = `---
id: m
type: workflow-module
---
Reference to {{not_a_plugin_var}} here.
`;
    const diag: WorkflowDiagnostic = {
      code: "missing-var",
      severity: "warning",
      message: "x",
      moduleId: "m",
      varName: "not_a_plugin_var",
    };
    const range = locateDiagnostic(diag, {
      filePath: "Projects/_op-modules/m.md",
      raw,
    });
    expect(range).not.toBeNull();
    expect(raw.slice(range!.from, range!.to)).toBe("{{not_a_plugin_var}}");
  });

  it("locates an intra-scope-collision varName inside the implicated module's vars list", () => {
    const raw = `---
id: alpha
type: workflow-module
scope: shared
vars:
  - foo=1
  - bar
---
body
`;
    const diag: WorkflowDiagnostic = {
      code: "intra-scope-collision",
      severity: "error",
      message: "x",
      varName: "foo",
      extra: { scope: "shared", moduleIds: ["alpha", "beta"] },
    };
    const range = locateDiagnostic(diag, {
      filePath: "Projects/_op-modules/alpha.md",
      raw,
    });
    expect(range).not.toBeNull();
    expect(raw.slice(range!.from, range!.to)).toBe("foo");
  });

  it("returns null for a collision when the saved file isn't one of the implicated modules", () => {
    const diag: WorkflowDiagnostic = {
      code: "intra-scope-collision",
      severity: "error",
      message: "x",
      varName: "foo",
      extra: { scope: "shared", moduleIds: ["alpha", "beta"] },
    };
    const range = locateDiagnostic(diag, {
      filePath: "Projects/_op-modules/gamma.md",
      raw: "---\nid: gamma\n---\n",
    });
    expect(range).toBeNull();
  });

  it("locates a malformed-frontmatter field on the frontmatter line", () => {
    const raw = `---
id: m
type: workflow-module
order: oops
---
body
`;
    const diag: WorkflowDiagnostic = {
      code: "malformed-frontmatter",
      severity: "error",
      message: "x",
      moduleId: "m",
      extra: {
        path: "Projects/_op-modules/m.md",
        field: "order",
        expected: "integer",
        actual: "string oops",
      },
    };
    const range = locateDiagnostic(diag, {
      filePath: "Projects/_op-modules/m.md",
      raw,
    });
    expect(range).not.toBeNull();
    expect(raw.slice(range!.from, range!.to)).toBe("order");
  });

  it("returns null for footer-only diagnostics (size-budget, schema-mismatch, import-collision)", () => {
    const ctx = { filePath: "x", raw: "---\n---\nbody\n" };
    const codes: WorkflowDiagnostic["code"][] = [
      "size-budget",
      "schema-mismatch",
      "import-collision",
    ];
    for (const code of codes) {
      expect(
        locateDiagnostic(
          { code, severity: "warning", message: "x" },
          ctx,
        ),
      ).toBeNull();
    }
  });
});
