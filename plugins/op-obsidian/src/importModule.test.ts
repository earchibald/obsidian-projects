import { describe, it, expect, vi } from "vitest";
import { parse as parseYaml } from "yaml";

vi.mock("obsidian", () => {
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  return {
    TFile,
    normalizePath: (p: string) => p.replace(/\/+/g, "/"),
    parseYaml: (yaml: string) => parseYaml(yaml),
  };
});

import { TFile } from "obsidian";
import { commitImport, prepareImport } from "./importModule";
import type { OpSettings } from "./settingsPure";

interface FakeFile {
  path: string;
  raw: string;
  frontmatter?: Record<string, unknown> | null;
}

interface FakeState {
  files: Map<string, FakeFile>;
  folders: Set<string>;
  varsByStatus: Map<string, Record<string, string>>;
}

function tfile(path: string): TFile {
  const f = new TFile();
  const basename = path.split("/").pop()!.replace(/\.md$/, "");
  Object.assign(f, { path, basename, name: `${basename}.md` });
  return f;
}

function fakeApp(initial: FakeFile[] = []) {
  const state: FakeState = {
    files: new Map(initial.map((f) => [f.path, f])),
    folders: new Set(),
    varsByStatus: new Map(),
  };

  const app = {
    vault: {
      getMarkdownFiles: () => [...state.files.values()].map((f) => tfile(f.path)),
      getAbstractFileByPath: (p: string) => {
        if (state.files.has(p)) return tfile(p);
        if (state.folders.has(p)) return { path: p };
        return null;
      },
      read: async (file: TFile) => {
        const f = state.files.get(file.path);
        if (!f) throw new Error(`fake vault: no file at ${file.path}`);
        return f.raw;
      },
      create: async (path: string, content: string) => {
        if (state.files.has(path)) throw new Error(`fake vault: ${path} already exists`);
        state.files.set(path, { path, raw: content });
        return tfile(path);
      },
      modify: async (file: TFile, content: string) => {
        const f = state.files.get(file.path);
        if (!f) throw new Error(`fake vault: no file at ${file.path}`);
        f.raw = content;
      },
      createFolder: async (path: string) => {
        state.folders.add(path);
      },
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        // Used by readProjectVars — return the persisted vars map.
        const path = file.path;
        if (!path.endsWith("/STATUS.md")) return null;
        const vars = state.varsByStatus.get(path);
        return vars ? { frontmatter: { vars: { ...vars } } } : { frontmatter: {} };
      },
    },
    fileManager: {
      processFrontMatter: async (
        file: TFile,
        mutator: (fm: Record<string, unknown>) => void,
      ) => {
        const fmInitial: Record<string, unknown> = state.varsByStatus.has(file.path)
          ? { vars: { ...state.varsByStatus.get(file.path)! } }
          : {};
        mutator(fmInitial);
        if (fmInitial.vars && typeof fmInitial.vars === "object") {
          state.varsByStatus.set(file.path, { ...(fmInitial.vars as Record<string, string>) });
        }
      },
    },
  } as any;

  return { app, state };
}

const baseSettings = (): OpSettings =>
  ({
    workflowVars: {} as Record<string, string>,
    // Other fields aren't read by the import path; cast through any.
  }) as unknown as OpSettings;

const moduleBundle = (over: Record<string, unknown> = {}, body = "Hi {{vars.tone}}!\n") =>
  [
    "---",
    "id: orient",
    "title: Orient",
    "type: workflow-module",
    "scope: kickoff",
    ...Object.entries(over).map(([k, v]) =>
      typeof v === "string" ? `${k}: ${v}` : `${k}: ${JSON.stringify(v)}`,
    ),
    "vars:",
    "  - tone=concise",
    "---",
    "",
    body,
  ].join("\n");

describe("prepareImport", () => {
  it("plans a fresh global import that needs the tone prompt", async () => {
    const importPath = "Projects/_op-export/orient.md";
    const { app } = fakeApp([{ path: importPath, raw: moduleBundle() }]);
    const prepared = await prepareImport(app, baseSettings(), {
      sourcePath: importPath,
      targetScope: "global",
    });
    expect(prepared.module.id).toBe("orient");
    expect(prepared.plan.targetPath).toBe("Projects/_op-modules/orient.md");
    expect(prepared.plan.promptsNeeded.map((p) => p.name)).toEqual(["tone"]);
    expect(prepared.plan.promptsNeeded[0].prefill).toBe("concise");
  });

  it("rewrites project: when scope=project + slug differs from source", async () => {
    const importPath = "Projects/_op-export/orient.md";
    const { app } = fakeApp([
      { path: importPath, raw: moduleBundle({ project: "old-slug" }) },
      { path: "Projects/new-slug/STATUS.md", raw: "---\n---\n" },
    ]);
    const prepared = await prepareImport(app, baseSettings(), {
      sourcePath: importPath,
      targetScope: "project",
      targetProjectSlug: "new-slug",
    });
    expect(prepared.plan.originalProject).toBe("old-slug");
    expect(prepared.plan.rewrittenProject).toBe("new-slug");
    expect(prepared.plan.targetPath).toBe("Projects/new-slug/MODULES/orient.md");
  });

  it("flags an existing-target overwrite", async () => {
    const importPath = "Projects/_op-export/orient.md";
    const { app } = fakeApp([
      { path: importPath, raw: moduleBundle() },
      { path: "Projects/_op-modules/orient.md", raw: "old" },
    ]);
    const prepared = await prepareImport(app, baseSettings(), {
      sourcePath: importPath,
      targetScope: "global",
    });
    expect(prepared.plan.overwrite).toBe(true);
    expect(prepared.plan.backupRelPath).toBe("Projects/_op-modules/orient.md");
  });

  it("throws when the source can't be parsed as a workflow module", async () => {
    const { app } = fakeApp([
      { path: "Projects/_op-export/junk.md", raw: "no frontmatter\n" },
    ]);
    await expect(
      prepareImport(app, baseSettings(), {
        sourcePath: "Projects/_op-export/junk.md",
        targetScope: "global",
      }),
    ).rejects.toThrow(/failed to parse/);
  });
});

describe("commitImport", () => {
  it("writes the module, sets the var, and appends a transaction record", async () => {
    const importPath = "Projects/_op-export/orient.md";
    const { app, state } = fakeApp([{ path: importPath, raw: moduleBundle() }]);
    const settings = baseSettings();
    const prepared = await prepareImport(app, settings, {
      sourcePath: importPath,
      targetScope: "global",
    });
    const result = await commitImport(app, settings, async () => {}, {
      prepared,
      varAnswers: { tone: "loud" },
      now: () => new Date(2026, 3, 26, 12, 0, 0),
    });
    expect(result.targetPath).toBe("Projects/_op-modules/orient.md");
    expect(result.transactionPath).toBe(
      "Projects/_op-import-history/20260426-120000.json",
    );
    expect(state.files.has("Projects/_op-modules/orient.md")).toBe(true);
    expect(state.files.has(result.transactionPath)).toBe(true);
    expect(settings.workflowVars).toEqual({ tone: "loud" });
    const tx = JSON.parse(state.files.get(result.transactionPath)!.raw);
    expect(tx.varsWritten).toEqual([
      { name: "tone", value: "loud", scopeKind: "global", preexisting: false },
    ]);
    expect(tx.modulesLanded[0].overwrote).toBe(false);
  });

  it("backs up an existing target before overwriting", async () => {
    const importPath = "Projects/_op-export/orient.md";
    const { app, state } = fakeApp([
      { path: importPath, raw: moduleBundle() },
      { path: "Projects/_op-modules/orient.md", raw: "previous version" },
    ]);
    const settings = baseSettings();
    const prepared = await prepareImport(app, settings, {
      sourcePath: importPath,
      targetScope: "global",
    });
    const result = await commitImport(app, settings, async () => {}, {
      prepared,
      varAnswers: { tone: "loud" },
      now: () => new Date(2026, 3, 26, 12, 0, 0),
    });
    expect(result.overwrote).toBe(true);
    expect(result.backupPath).toBe(
      "Projects/_op-import-history/20260426-120000.bak/Projects/_op-modules/orient.md",
    );
    expect(state.files.get(result.backupPath!)?.raw).toBe("previous version");
  });

  it("writes per-project vars into STATUS.md via processFrontMatter", async () => {
    const importPath = "Projects/_op-export/orient.md";
    const { app, state } = fakeApp([
      { path: importPath, raw: moduleBundle() },
      { path: "Projects/foo/STATUS.md", raw: "---\n---\n" },
    ]);
    const settings = baseSettings();
    const prepared = await prepareImport(app, settings, {
      sourcePath: importPath,
      targetScope: "project",
      targetProjectSlug: "foo",
    });
    await commitImport(app, settings, async () => {}, {
      prepared,
      varAnswers: { tone: "concise" },
      now: () => new Date(2026, 3, 26, 12, 0, 0),
    });
    expect(state.varsByStatus.get("Projects/foo/STATUS.md")).toEqual({ tone: "concise" });
    // global settings unchanged
    expect(settings.workflowVars).toEqual({});
  });

  it("preserves preexisting higher-precedence vars (recorded but not rewritten)", async () => {
    const importPath = "Projects/_op-export/orient.md";
    const { app, state } = fakeApp([
      { path: importPath, raw: moduleBundle() },
    ]);
    const settings = baseSettings();
    settings.workflowVars = { tone: "already-set" };
    const prepared = await prepareImport(app, settings, {
      sourcePath: importPath,
      targetScope: "global",
    });
    expect(prepared.plan.promptsNeeded).toEqual([]);
    const result = await commitImport(app, settings, async () => {}, {
      prepared,
      now: () => new Date(2026, 3, 26, 12, 0, 0),
    });
    expect(settings.workflowVars).toEqual({ tone: "already-set" });
    const tx = JSON.parse(state.files.get(result.transactionPath)!.raw);
    expect(tx.varsWritten).toEqual([
      { name: "tone", value: "already-set", scopeKind: "global", preexisting: true },
    ]);
  });

  it("aborts when an answer is missing for a needed prompt", async () => {
    const importPath = "Projects/_op-export/orient.md";
    const { app } = fakeApp([{ path: importPath, raw: moduleBundle() }]);
    const settings = baseSettings();
    const prepared = await prepareImport(app, settings, {
      sourcePath: importPath,
      targetScope: "global",
    });
    await expect(
      commitImport(app, settings, async () => {}, { prepared }),
    ).rejects.toThrow(/missing answer for var\(s\): tone/);
  });
});
