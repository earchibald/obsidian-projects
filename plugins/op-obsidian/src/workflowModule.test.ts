import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => {
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  return { TFile };
});

import { TFile } from "obsidian";
import { loadModules } from "./workflowModule";

interface FakeFile {
  path: string;
  frontmatter: Record<string, unknown> | null;
}

function makeFile(path: string): TFile {
  const basename = path.split("/").pop()!.replace(/\.md$/, "");
  const f = new TFile();
  Object.assign(f, { path, basename, name: `${basename}.md` });
  return f;
}

function fakeApp(files: FakeFile[]) {
  const tfiles = files.map((f) => ({ tfile: makeFile(f.path), fm: f.frontmatter }));
  const app = {
    vault: {
      getMarkdownFiles: () => tfiles.map((x) => x.tfile),
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        const hit = tfiles.find((x) => x.tfile === file);
        return hit && hit.fm ? { frontmatter: hit.fm } : null;
      },
    },
  };
  return app as any;
}

const moduleFm = (over: Record<string, unknown> = {}) => ({
  type: "workflow-module",
  title: "Sample",
  scope: "pre-commit",
  ...over,
});

describe("loadModules — path bucketing", () => {
  it("loads global modules from Projects/_op-modules/<id>.md", () => {
    const app = fakeApp([
      { path: "Projects/_op-modules/sample.md", frontmatter: moduleFm({ id: "sample" }) },
    ]);
    const r = loadModules(app);
    expect(r.modules).toHaveLength(1);
    expect(r.modules[0].source).toEqual({ kind: "global", path: "Projects/_op-modules/sample.md" });
    expect(r.diagnostics).toEqual([]);
  });

  it("loads per-project modules from Projects/<slug>/MODULES/<id>.md", () => {
    const app = fakeApp([
      {
        path: "Projects/obsidian-projects/MODULES/build.md",
        frontmatter: moduleFm({ id: "build" }),
      },
    ]);
    const r = loadModules(app);
    expect(r.modules).toHaveLength(1);
    expect(r.modules[0].source).toEqual({
      kind: "project",
      path: "Projects/obsidian-projects/MODULES/build.md",
      projectSlug: "obsidian-projects",
    });
  });

  it("ignores files outside the module directories", () => {
    const app = fakeApp([
      {
        path: "Projects/obsidian-projects/ISSUES/OP-1.md",
        frontmatter: moduleFm({ id: "OP-1" }),
      },
      { path: "Projects/_scratch/foo.md", frontmatter: moduleFm({ id: "foo" }) },
      {
        path: "Projects/obsidian-projects/MODULES/sub/nested.md",
        frontmatter: moduleFm({ id: "nested" }),
      },
      {
        path: "Projects/_op-modules/sub/nested.md",
        frontmatter: moduleFm({ id: "nested" }),
      },
    ]);
    const r = loadModules(app);
    expect(r.modules).toEqual([]);
    expect(r.diagnostics).toEqual([]);
  });
});

describe("loadModules — shadowing", () => {
  it("per-project module shadows same-id global silently", () => {
    const app = fakeApp([
      {
        path: "Projects/_op-modules/lint.md",
        frontmatter: moduleFm({ id: "lint", title: "Global lint" }),
      },
      {
        path: "Projects/obsidian-projects/MODULES/lint.md",
        frontmatter: moduleFm({ id: "lint", title: "Project lint" }),
      },
    ]);
    const r = loadModules(app);
    expect(r.modules).toHaveLength(1);
    expect(r.modules[0].title).toBe("Project lint");
    expect(r.modules[0].source.kind).toBe("project");
    expect(r.diagnostics).toEqual([]);
  });

  it("does not shadow a different-id pair", () => {
    const app = fakeApp([
      { path: "Projects/_op-modules/a.md", frontmatter: moduleFm({ id: "a" }) },
      {
        path: "Projects/obsidian-projects/MODULES/b.md",
        frontmatter: moduleFm({ id: "b" }),
      },
    ]);
    const r = loadModules(app);
    expect(r.modules.map((m) => m.id).sort()).toEqual(["a", "b"]);
  });
});

describe("loadModules — project filter", () => {
  it("drops globals whose project: doesn't match opts.project", () => {
    const app = fakeApp([
      {
        path: "Projects/_op-modules/all.md",
        frontmatter: moduleFm({ id: "all" }),
      },
      {
        path: "Projects/_op-modules/match.md",
        frontmatter: moduleFm({ id: "match", project: "obsidian-projects" }),
      },
      {
        path: "Projects/_op-modules/other.md",
        frontmatter: moduleFm({ id: "other", project: "different-project" }),
      },
    ]);
    const r = loadModules(app, { project: "obsidian-projects" });
    expect(r.modules.map((m) => m.id).sort()).toEqual(["all", "match"]);
  });

  it("keeps modules without a project: field regardless of filter", () => {
    const app = fakeApp([
      { path: "Projects/_op-modules/lint.md", frontmatter: moduleFm({ id: "lint" }) },
    ]);
    const r = loadModules(app, { project: "anything" });
    expect(r.modules).toHaveLength(1);
  });

  it("no filter → keeps all modules including those with project:", () => {
    const app = fakeApp([
      {
        path: "Projects/_op-modules/match.md",
        frontmatter: moduleFm({ id: "match", project: "obsidian-projects" }),
      },
    ]);
    const r = loadModules(app);
    expect(r.modules).toHaveLength(1);
  });
});

describe("loadModules — diagnostics", () => {
  it("emits malformed-frontmatter for module files with no frontmatter", () => {
    const app = fakeApp([{ path: "Projects/_op-modules/empty.md", frontmatter: null }]);
    const r = loadModules(app);
    expect(r.modules).toEqual([]);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("emits malformed-frontmatter when type is not workflow-module", () => {
    const app = fakeApp([
      {
        path: "Projects/_op-modules/skill.md",
        frontmatter: { type: "skill", id: "skill", title: "x", scope: "x" },
      },
    ]);
    const r = loadModules(app);
    expect(r.modules).toEqual([]);
    expect(r.diagnostics).toHaveLength(1);
  });

  it("propagates intra-scope-collision after shadowing", () => {
    const app = fakeApp([
      {
        path: "Projects/_op-modules/a.md",
        frontmatter: moduleFm({ id: "a", scope: "pre-commit", vars: ["pkg"] }),
      },
      {
        path: "Projects/_op-modules/b.md",
        frontmatter: moduleFm({ id: "b", scope: "pre-commit", vars: ["pkg"] }),
      },
    ]);
    const r = loadModules(app);
    const collisions = r.diagnostics.filter((d) => d.code === "intra-scope-collision");
    expect(collisions).toHaveLength(1);
    expect(collisions[0].varName).toBe("pkg");
  });

  it("collision check runs against post-shadowing module set", () => {
    // Global `a` and project `a` both declare `pkg` at scope=pre-commit. After
    // shadowing, only the project copy survives — no collision.
    const app = fakeApp([
      {
        path: "Projects/_op-modules/a.md",
        frontmatter: moduleFm({ id: "a", vars: ["pkg"] }),
      },
      {
        path: "Projects/obsidian-projects/MODULES/a.md",
        frontmatter: moduleFm({ id: "a", vars: ["pkg"] }),
      },
    ]);
    const r = loadModules(app);
    const collisions = r.diagnostics.filter((d) => d.code === "intra-scope-collision");
    expect(collisions).toEqual([]);
  });
});
