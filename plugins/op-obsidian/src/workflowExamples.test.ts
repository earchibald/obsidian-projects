import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({}));

import {
  EXAMPLE_MODULES,
  installExampleLibrary,
  type InstallExamplesResult,
} from "./workflowExamples";

interface FakeAdapterState {
  files: Map<string, string>;
  dirs: Set<string>;
}

function makeFakeApp(initial: Partial<FakeAdapterState> = {}) {
  const state: FakeAdapterState = {
    files: initial.files ?? new Map(),
    dirs: initial.dirs ?? new Set(),
  };
  const adapter = {
    exists: async (p: string) => state.files.has(p) || state.dirs.has(p),
  };
  const vault = {
    adapter,
    create: async (p: string, content: string) => {
      state.files.set(p, content);
    },
    createFolder: async (p: string) => {
      state.dirs.add(p);
    },
  };
  const app = { vault } as unknown;
  return { app: app as any, state, adapter, vault };
}

describe("EXAMPLE_MODULES", () => {
  it("ships at least one example", () => {
    expect(EXAMPLE_MODULES.length).toBeGreaterThan(0);
  });

  it("every example carries an id and a frontmatter id matching it", () => {
    for (const ex of EXAMPLE_MODULES) {
      expect(ex.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(ex.content).toContain(`id: ${ex.id}`);
    }
  });

  it("every example declares the workflow-module type and a scope", () => {
    for (const ex of EXAMPLE_MODULES) {
      expect(ex.content).toContain("type: workflow-module");
      expect(ex.content).toMatch(/\nscope: \S+/);
    }
  });

  it("the library and its entries are frozen", () => {
    expect(Object.isFrozen(EXAMPLE_MODULES)).toBe(true);
    for (const ex of EXAMPLE_MODULES) {
      expect(Object.isFrozen(ex)).toBe(true);
    }
  });
});

describe("installExampleLibrary", () => {
  it("writes every example into Projects/_op-modules/<id>.md on a fresh vault", async () => {
    const { app, state } = makeFakeApp();
    const r: InstallExamplesResult = await installExampleLibrary(app);
    expect(r.installed.length).toBe(EXAMPLE_MODULES.length);
    expect(r.skipped).toEqual([]);
    for (const ex of EXAMPLE_MODULES) {
      const path = `Projects/_op-modules/${ex.id}.md`;
      expect(state.files.get(path)).toBe(ex.content);
    }
  });

  it("creates the parent directory if missing", async () => {
    const { app, state } = makeFakeApp();
    await installExampleLibrary(app);
    expect(state.dirs.has("Projects/_op-modules/")).toBe(true);
  });

  it("does not call createFolder when the directory already exists", async () => {
    const { app, state, vault } = makeFakeApp({
      dirs: new Set(["Projects/_op-modules/"]),
    });
    const createFolderSpy = vi.spyOn(vault, "createFolder");
    await installExampleLibrary(app);
    expect(createFolderSpy).not.toHaveBeenCalled();
    expect(state.dirs.size).toBe(1);
  });

  it("never overwrites an existing file — skips and reports it", async () => {
    const target = `Projects/_op-modules/${EXAMPLE_MODULES[0].id}.md`;
    const { app, state } = makeFakeApp({
      files: new Map([[target, "user-edited content do not destroy"]]),
    });
    const r = await installExampleLibrary(app);
    expect(r.skipped).toContain(target);
    expect(state.files.get(target)).toBe("user-edited content do not destroy");
    // Other examples that didn't pre-exist still installed.
    expect(r.installed.length).toBe(EXAMPLE_MODULES.length - 1);
  });

  it("is idempotent — running twice produces no new writes the second time", async () => {
    const { app, vault } = makeFakeApp();
    await installExampleLibrary(app);
    const createSpy = vi.spyOn(vault, "create");
    const second = await installExampleLibrary(app);
    expect(second.installed).toEqual([]);
    expect(second.skipped.length).toBe(EXAMPLE_MODULES.length);
    expect(createSpy).not.toHaveBeenCalled();
  });
});
