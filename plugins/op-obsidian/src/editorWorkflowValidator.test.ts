import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => {
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  return {
    TFile,
    normalizePath: (p: string) => p.replace(/\/+/g, "/").replace(/\/$/g, ""),
  };
});

import { TFile } from "obsidian";
import { classifyFile, validateFile } from "./editorWorkflowValidator";
import { DEFAULT_SETTINGS } from "./settingsPure";
import type { OpSettings } from "./settings";

interface FakeFile {
  path: string;
  raw: string;
  frontmatter?: Record<string, unknown> | null;
}

function makeFile(path: string): TFile {
  const basename = path.split("/").pop()!.replace(/\.md$/, "");
  const f = new TFile();
  Object.assign(f, { path, basename, name: `${basename}.md` });
  return f;
}

function fakeApp(files: FakeFile[]) {
  const tfiles = files.map((f) => ({
    tfile: makeFile(f.path),
    raw: f.raw,
    fm: f.frontmatter,
  }));
  return {
    vault: {
      getMarkdownFiles: () => tfiles.map((x) => x.tfile),
      getAbstractFileByPath: (path: string) => {
        const hit = tfiles.find((x) => x.tfile.path === path);
        return hit ? hit.tfile : null;
      },
      read: async (file: TFile) => {
        const hit = tfiles.find((x) => x.tfile === file);
        if (!hit) throw new Error(`fakeApp: missing raw for ${file.path}`);
        return hit.raw;
      },
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        const hit = tfiles.find((x) => x.tfile === file);
        if (!hit) return null;
        if (hit.fm === undefined) return null;
        return { frontmatter: hit.fm };
      },
    },
  } as any;
}

const SETTINGS: OpSettings = DEFAULT_SETTINGS;

function moduleFile(args: {
  path: string;
  id: string;
  scope: string;
  body: string;
  vars?: unknown[];
}): FakeFile {
  return {
    path: args.path,
    frontmatter: {
      id: args.id,
      title: args.id,
      type: "workflow-module",
      scope: args.scope,
      vars: args.vars ?? [],
    },
    raw: `---\nplaceholder\n---\n${args.body}\n`,
  };
}

function workflowFile(args: { path: string; project: string; steps: unknown[] }): FakeFile {
  return {
    path: args.path,
    frontmatter: {
      type: "workflow",
      schema: 1,
      project: args.project,
      default_agent: "claude",
      default_model: "opus",
      steps: args.steps,
    },
    raw: "---\nplaceholder\n---\n",
  };
}

describe("classifyFile", () => {
  it("classifies global modules", () => {
    expect(classifyFile("Projects/_op-modules/orient.md")).toEqual({
      kind: "module",
      project: "",
    });
  });
  it("classifies per-project modules and extracts the slug", () => {
    expect(classifyFile("Projects/demo/MODULES/x.md")).toEqual({
      kind: "module",
      project: "demo",
    });
  });
  it("classifies per-project workflow files", () => {
    expect(classifyFile("Projects/demo/WORKFLOW.md")).toEqual({
      kind: "workflow",
      project: "demo",
    });
  });
  it("classifies the global workflow file", () => {
    expect(classifyFile("Projects/_op-workflow.md")).toEqual({
      kind: "workflow",
      project: "",
    });
  });
  it("classifies files under a configured root", () => {
    expect(classifyFile("Workspace/Projects/demo/WORKFLOW.md", "Workspace/Projects")).toEqual({
      kind: "workflow",
      project: "demo",
    });
  });
  it("rejects unrelated paths", () => {
    expect(classifyFile("Projects/demo/ISSUES/OP-1.md")).toBeNull();
    expect(classifyFile("Projects/_op-modules/sub/nested.md")).toBeNull();
    expect(classifyFile("README.md")).toBeNull();
  });
});

describe("validateFile", () => {
  it("flags an unknown module id with one diagnostic, deduped across the (step × agent) sweep", async () => {
    const wf = workflowFile({
      path: "Projects/demo/WORKFLOW.md",
      project: "demo",
      steps: [
        { step: "kickoff", modules: ["typo-id"] },
        { step: "implement", modules: ["typo-id"] },
      ],
    });
    const app = fakeApp([wf]);
    const result = await validateFile(app, app.vault.getAbstractFileByPath(wf.path)!, {
      settings: SETTINGS,
    });
    const unknown = result.diagnostics.filter((d) => d.code === "unknown-module");
    // Two steps × one agent (claude) → would duplicate. Dedupe collapses.
    expect(unknown.length).toBe(2); // one per distinct step
    expect(result.summary.errors).toBeGreaterThanOrEqual(2);
    expect(result.summary.footerLine).toMatch(/error/);
  });

  it("returns a clean state for a valid workflow + valid module", async () => {
    const wf = workflowFile({
      path: "Projects/demo/WORKFLOW.md",
      project: "demo",
      steps: [{ step: "kickoff", modules: ["m"] }],
    });
    const m = moduleFile({
      path: "Projects/_op-modules/m.md",
      id: "m",
      scope: "alpha",
      body: "Hello {{id}}, you are working on {{title}}.",
    });
    const app = fakeApp([wf, m]);
    const result = await validateFile(app, app.vault.getAbstractFileByPath(wf.path)!, {
      settings: SETTINGS,
    });
    expect(result.summary.errors).toBe(0);
    expect(result.summary.footerLine).toBe("Workflow OK");
  });

  it("flags an undeclared user-var reference as a warning", async () => {
    const wf = workflowFile({
      path: "Projects/demo/WORKFLOW.md",
      project: "demo",
      steps: [{ step: "kickoff", modules: ["m"] }],
    });
    const m = moduleFile({
      path: "Projects/_op-modules/m.md",
      id: "m",
      scope: "alpha",
      body: "Reference: {{vars.undeclared}}.",
    });
    const app = fakeApp([wf, m]);
    const result = await validateFile(app, app.vault.getAbstractFileByPath(m.path)!, {
      settings: SETTINGS,
    });
    const undeclared = result.diagnostics.filter(
      (d) => d.code === "malformed-frontmatter" && d.severity === "warning",
    );
    expect(undeclared.length).toBeGreaterThan(0);
    expect(result.summary.warnings).toBeGreaterThan(0);
  });

  it("flags a typo'd default model id with one bad-model diagnostic", async () => {
    const wf: FakeFile = {
      path: "Projects/demo/WORKFLOW.md",
      frontmatter: {
        type: "workflow",
        schema: 1,
        project: "demo",
        default_agent: "claude",
        default_model: "opuss", // typo
        steps: [{ step: "kickoff", modules: [] }],
      },
      raw: "---\nplaceholder\n---\n",
    };
    const app = fakeApp([wf]);
    const result = await validateFile(app, app.vault.getAbstractFileByPath(wf.path)!, {
      settings: SETTINGS,
    });
    const bad = result.diagnostics.filter((d) => d.code === "bad-model");
    expect(bad.length).toBe(1);
    expect((bad[0].extra as Record<string, unknown>).badName).toBe("opuss");
  });

  it("returns an empty result for unrecognized files", async () => {
    const issue: FakeFile = {
      path: "Projects/demo/ISSUES/OP-1.md",
      frontmatter: { id: "OP-1", type: "issue" },
      raw: "---\nplaceholder\n---\n",
    };
    const app = fakeApp([issue]);
    const result = await validateFile(app, app.vault.getAbstractFileByPath(issue.path)!, {
      settings: SETTINGS,
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.summary.footerLine).toBe("Workflow OK");
  });

  it("falls back to a discovered project when the saved file is a global module", async () => {
    const wf = workflowFile({
      path: "Projects/demo/WORKFLOW.md",
      project: "demo",
      steps: [{ step: "kickoff", modules: ["g1"] }],
    });
    const g1 = moduleFile({
      path: "Projects/_op-modules/g1.md",
      id: "g1",
      scope: "alpha",
      body: "Hello.",
    });
    const app = fakeApp([wf, g1]);
    const result = await validateFile(app, app.vault.getAbstractFileByPath(g1.path)!, {
      settings: SETTINGS,
    });
    expect(result.summary.errors).toBe(0);
  });
});
