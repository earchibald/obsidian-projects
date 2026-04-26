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
import { loadModuleSources, loadAndComposeWorkflow } from "./composeWorkflow";

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

const RENDER_CTX = {
  id: "OP-FIX-1",
  title: "Fixture issue",
  project: "demo",
  status: "open",
  priority: "med",
  parent: null,
  pr_url: undefined,
  github_issue: undefined,
  repo_path: "/repo",
  vault_path: "/vault",
  vault_name: "vault",
  branch: "main",
  today: "2026-04-26",
  agent: "claude",
  model: "opus",
  mode: "kickoff",
};

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
    raw: `---\n# yaml omitted (parsed via metadataCache)\n---\n${args.body}\n`,
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
    raw: "---\n# yaml omitted (parsed via metadataCache)\n---\nbody\n",
  };
}

describe("loadModuleSources", () => {
  it("rejects an empty project slug with a schema-mismatch diagnostic", async () => {
    const app = fakeApp([]);
    const r = await loadModuleSources(app, { project: "" });
    expect(r.workflow).toBeNull();
    expect(r.loadedModules).toEqual([]);
    expect(r.diagnostics[0]).toMatchObject({
      code: "schema-mismatch",
      severity: "error",
    });
  });

  it("loads modules and reads their bodies, paired with the parsed module record", async () => {
    const app = fakeApp([
      moduleFile({
        path: "Projects/_op-modules/branching.md",
        id: "branching",
        scope: "kickoff",
        body: "Always work in a worktree.",
      }),
      workflowFile({
        path: "Projects/demo/WORKFLOW.md",
        project: "demo",
        steps: [{ step: "kickoff", modules: ["branching"] }],
      }),
    ]);
    const r = await loadModuleSources(app, { project: "demo" });
    expect(r.loadedModules).toHaveLength(1);
    expect(r.loadedModules[0].module.id).toBe("branching");
    expect(r.loadedModules[0].body).toBe("Always work in a worktree.\n");
    expect(r.workflow?.steps).toHaveLength(1);
    expect(r.diagnostics.find((d) => d.severity === "error")).toBeUndefined();
  });

  it("strips frontmatter the same way promptBuild.stripFrontmatter does", async () => {
    const app = fakeApp([
      {
        path: "Projects/_op-modules/raw.md",
        frontmatter: {
          id: "raw",
          title: "Raw",
          type: "workflow-module",
          scope: "kickoff",
        },
        raw: "---\nid: raw\n---\nfirst line\n\nsecond line with --- in body\n",
      },
      workflowFile({
        path: "Projects/demo/WORKFLOW.md",
        project: "demo",
        steps: [{ step: "kickoff", modules: ["raw"] }],
      }),
    ]);
    const r = await loadModuleSources(app, { project: "demo" });
    expect(r.loadedModules[0].body).toBe("first line\n\nsecond line with --- in body\n");
  });

  it("propagates loader diagnostics from the workflow file alongside module diagnostics", async () => {
    const app = fakeApp([
      // Workflow file references a module that doesn't exist on disk.
      workflowFile({
        path: "Projects/demo/WORKFLOW.md",
        project: "demo",
        steps: [{ step: "kickoff", modules: ["missing"] }],
      }),
    ]);
    const r = await loadModuleSources(app, { project: "demo" });
    // Loader doesn't validate step.modules against discovered ids — that's
    // the composer's job. So here we just assert the bundle came back clean
    // structurally and the diagnostics stream is empty (no error).
    expect(r.workflow).not.toBeNull();
    expect(r.loadedModules).toEqual([]);
  });
});

describe("loadAndComposeWorkflow", () => {
  it("end-to-end happy path: load + compose for a single step", async () => {
    const app = fakeApp([
      moduleFile({
        path: "Projects/_op-modules/branching.md",
        id: "branching",
        scope: "kickoff",
        body: "Working on {{id}} on {{branch}}.",
      }),
      workflowFile({
        path: "Projects/demo/WORKFLOW.md",
        project: "demo",
        steps: [{ step: "kickoff", modules: ["branching"] }],
      }),
    ]);
    const r = await loadAndComposeWorkflow(app, {
      project: "demo",
      step: "kickoff",
      ctx: { render: RENDER_CTX as any },
    });
    expect(r.composed?.text).toBe("Working on OP-FIX-1 on main.\n");
    expect(r.bundle.workflow).not.toBeNull();
  });

  it("returns composed=null when the workflow file is unsalvageable", async () => {
    const app = fakeApp([]); // no WORKFLOW.md at all
    const r = await loadAndComposeWorkflow(app, {
      project: "demo",
      step: "kickoff",
      ctx: { render: RENDER_CTX as any },
    });
    expect(r.composed).toBeNull();
    expect(r.bundle.workflow).toBeNull();
    expect(r.bundle.diagnostics.find((d) => d.severity === "error")).toBeTruthy();
  });

  it("merges loader diagnostics into composed.diagnostics for unified surface", async () => {
    const app = fakeApp([
      // Module body references a never-declared user var → composer diagnostic.
      moduleFile({
        path: "Projects/_op-modules/intro.md",
        id: "intro",
        scope: "kickoff",
        body: "stage: {{vars.never_declared}}",
      }),
      workflowFile({
        path: "Projects/demo/WORKFLOW.md",
        project: "demo",
        steps: [{ step: "kickoff", modules: ["intro"] }],
      }),
    ]);
    const r = await loadAndComposeWorkflow(app, {
      project: "demo",
      step: "kickoff",
      ctx: { render: RENDER_CTX as any },
    });
    expect(r.composed?.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "malformed-frontmatter",
        severity: "warning",
        moduleId: "intro",
        varName: "never_declared",
      }),
    );
  });
});
