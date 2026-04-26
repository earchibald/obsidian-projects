import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => {
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  return {
    TFile,
    normalizePath: (p: string) => p.replace(/\/+/g, "/"),
  };
});

import { TFile } from "obsidian";
import { exportModules, EXPORT_DIR } from "./exportModule";

interface FakeFile {
  path: string;
  raw: string;
  frontmatter: Record<string, unknown> | null;
}

function makeTFile(path: string): TFile {
  const f = new TFile();
  const basename = path.split("/").pop()!.replace(/\.md$/, "");
  Object.assign(f, { path, basename, name: `${basename}.md` });
  return f;
}

interface FakeVaultState {
  files: Map<string, FakeFile>;
  folders: Set<string>;
  writes: Array<{ path: string; content: string }>;
  modifies: Array<{ path: string; content: string }>;
  createdFolders: string[];
}

function fakeApp(initial: FakeFile[]) {
  const state: FakeVaultState = {
    files: new Map(initial.map((f) => [f.path, f])),
    folders: new Set(),
    writes: [],
    modifies: [],
    createdFolders: [],
  };

  const tfileFor = (path: string) => makeTFile(path);

  const app = {
    vault: {
      getMarkdownFiles: () =>
        [...state.files.values()].map((f) => tfileFor(f.path)),
      getAbstractFileByPath: (p: string) => {
        if (state.files.has(p)) return tfileFor(p);
        if (state.folders.has(p)) return { path: p }; // folder marker
        return null;
      },
      read: async (file: TFile) => {
        const f = state.files.get(file.path);
        if (!f) throw new Error(`fake vault: no file at ${file.path}`);
        return f.raw;
      },
      create: async (path: string, content: string) => {
        if (state.files.has(path)) {
          throw new Error(`fake vault: ${path} already exists`);
        }
        state.files.set(path, { path, raw: content, frontmatter: null });
        state.writes.push({ path, content });
        return tfileFor(path);
      },
      modify: async (file: TFile, content: string) => {
        const f = state.files.get(file.path);
        if (!f) throw new Error(`fake vault: no file at ${file.path}`);
        f.raw = content;
        state.modifies.push({ path: file.path, content });
      },
      createFolder: async (path: string) => {
        state.folders.add(path);
        state.createdFolders.push(path);
      },
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        const f = state.files.get(file.path);
        return f && f.frontmatter ? { frontmatter: f.frontmatter } : null;
      },
    },
  } as any;

  return { app, state };
}

const moduleFm = (over: Record<string, unknown> = {}) => ({
  type: "workflow-module",
  title: "Sample",
  scope: "kickoff",
  ...over,
});

const moduleFile = (path: string, fm: Record<string, unknown>, body: string): FakeFile => ({
  path,
  frontmatter: fm,
  raw:
    "---\n" +
    Object.entries(fm)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join("\n") +
    "\n---\n" +
    body,
});

describe("exportModules — single id mode", () => {
  it("writes a single export file at Projects/_op-export/<id>.md", async () => {
    const { app, state } = fakeApp([
      moduleFile(
        "Projects/_op-modules/orient.md",
        moduleFm({ id: "orient" }),
        "Hello body.\n",
      ),
    ]);
    const r = await exportModules(app, { kind: "id", moduleId: "orient" });
    expect(r.files).toHaveLength(1);
    expect(r.files[0]).toMatchObject({
      moduleId: "orient",
      sourcePath: "Projects/_op-modules/orient.md",
      exportPath: "Projects/_op-export/orient.md",
      sourceScope: "global",
    });
    const written = state.writes.find((w) => w.path === "Projects/_op-export/orient.md");
    expect(written).toBeDefined();
    expect(written!.content).toContain("type: workflow-module");
    expect(written!.content).toContain("Hello body.");
    expect(state.createdFolders).toContain(EXPORT_DIR);
  });

  it("throws when the requested id is not in the vault", async () => {
    const { app } = fakeApp([]);
    await expect(exportModules(app, { kind: "id", moduleId: "missing" })).rejects.toThrow(
      /no module with id "missing"/,
    );
  });

  it("overwrites an existing export file via vault.modify", async () => {
    const { app, state } = fakeApp([
      moduleFile("Projects/_op-modules/orient.md", moduleFm({ id: "orient" }), "Body v2"),
      // pre-existing export file at the destination
      {
        path: "Projects/_op-export/orient.md",
        frontmatter: null,
        raw: "old export",
      },
    ]);
    await exportModules(app, { kind: "id", moduleId: "orient" });
    const mod = state.modifies.find((m) => m.path === "Projects/_op-export/orient.md");
    expect(mod).toBeDefined();
    expect(mod!.content).toContain("Body v2");
  });
});

describe("exportModules — project mode", () => {
  it("bundles per-project modules + globals targeting that slug into a subfolder", async () => {
    const { app, state } = fakeApp([
      moduleFile(
        "Projects/foo/MODULES/local-a.md",
        moduleFm({ id: "local-a" }),
        "A",
      ),
      moduleFile(
        "Projects/foo/MODULES/local-b.md",
        moduleFm({ id: "local-b" }),
        "B",
      ),
      moduleFile(
        "Projects/_op-modules/global-tagged.md",
        moduleFm({ id: "global-tagged", project: "foo" }),
        "G",
      ),
      moduleFile(
        "Projects/_op-modules/global-untagged.md",
        moduleFm({ id: "global-untagged" }),
        "U",
      ),
      moduleFile(
        "Projects/bar/MODULES/other.md",
        moduleFm({ id: "other" }),
        "X",
      ),
    ]);
    const r = await exportModules(app, { kind: "project", projectSlug: "foo" });
    const ids = r.files.map((f) => f.moduleId).sort();
    expect(ids).toEqual(["global-tagged", "local-a", "local-b"]);
    for (const f of r.files) {
      expect(f.exportPath.startsWith("Projects/_op-export/foo/")).toBe(true);
    }
    expect(state.createdFolders).toContain("Projects/_op-export/foo");
  });

  it("throws when no modules match the project", async () => {
    const { app } = fakeApp([]);
    await expect(
      exportModules(app, { kind: "project", projectSlug: "missing" }),
    ).rejects.toThrow(/no modules found for project "missing"/);
  });
});

describe("exportModules — vault hygiene", () => {
  it("aborts when an existing module has a frontmatter error", async () => {
    const { app } = fakeApp([
      // Wrong type — loadModules produces an error diagnostic.
      {
        path: "Projects/_op-modules/bad.md",
        frontmatter: { type: "not-a-module", id: "bad" },
        raw: "---\ntype: not-a-module\nid: bad\n---\n",
      },
    ]);
    await expect(exportModules(app, { kind: "id", moduleId: "bad" })).rejects.toThrow(
      /module-loading error/,
    );
  });
});
