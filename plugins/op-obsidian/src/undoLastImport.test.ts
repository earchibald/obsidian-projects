import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => {
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  class TFolder {
    path = "";
  }
  return {
    TFile,
    TFolder,
    normalizePath: (p: string) => p.replace(/\/+/g, "/"),
  };
});

import { TFile, TFolder } from "obsidian";
import { undoLastImport } from "./undoLastImport";
import {
  TRANSACTION_HISTORY_DIR,
  serializeTransaction,
  type TransactionRecord,
} from "./exportImportPure";
import type { OpSettings } from "./settingsPure";

interface FakeFile {
  path: string;
  raw: string;
}

interface FakeState {
  files: Map<string, FakeFile>;
  folders: Set<string>;
  trashed: string[];
  varsByStatus: Map<string, Record<string, string>>;
}

function tfile(path: string): TFile {
  const f = new TFile();
  const basename = path.split("/").pop()!.replace(/\.md$/, "").replace(/\.json$/, "");
  Object.assign(f, { path, basename, name: path.split("/").pop()! });
  return f;
}

function makeFolder(path: string, files: TFile[]): TFolder {
  const folder = new TFolder();
  Object.assign(folder, { path, children: files });
  return folder;
}

function fakeApp(initial: FakeFile[] = [], folders: string[] = []) {
  const state: FakeState = {
    files: new Map(initial.map((f) => [f.path, f])),
    folders: new Set(folders),
    trashed: [],
    varsByStatus: new Map(),
  };

  const childrenByFolder = (folderPath: string) =>
    [...state.files.values()]
      .filter((f) => {
        const dir = f.path.slice(0, f.path.lastIndexOf("/"));
        return dir === folderPath;
      })
      .map((f) => tfile(f.path));

  const app = {
    vault: {
      getAbstractFileByPath: (p: string) => {
        if (state.files.has(p)) return tfile(p);
        if (state.folders.has(p)) return makeFolder(p, childrenByFolder(p));
        return null;
      },
      read: async (file: TFile) => {
        const f = state.files.get(file.path);
        if (!f) throw new Error(`fake vault: no file at ${file.path}`);
        return f.raw;
      },
      create: async (path: string, content: string) => {
        if (state.files.has(path)) throw new Error(`fake vault: ${path} exists`);
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
      trash: async (file: TFile | TFolder, _system: boolean) => {
        const path = (file as TFile).path;
        if (state.files.has(path)) state.files.delete(path);
        else if (state.folders.has(path)) {
          state.folders.delete(path);
          // Cascade-delete files inside the folder for test sanity.
          for (const key of [...state.files.keys()]) {
            if (key.startsWith(path + "/")) state.files.delete(key);
          }
        }
        state.trashed.push(path);
      },
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        if (!file.path.endsWith("/STATUS.md")) return null;
        const vars = state.varsByStatus.get(file.path);
        return vars ? { frontmatter: { vars: { ...vars } } } : { frontmatter: {} };
      },
    },
    fileManager: {
      processFrontMatter: async (
        file: TFile,
        mutator: (fm: Record<string, unknown>) => void,
      ) => {
        const fm: Record<string, unknown> = state.varsByStatus.has(file.path)
          ? { vars: { ...state.varsByStatus.get(file.path)! } }
          : {};
        mutator(fm);
        if (fm.vars && typeof fm.vars === "object") {
          state.varsByStatus.set(file.path, { ...(fm.vars as Record<string, string>) });
        } else {
          state.varsByStatus.delete(file.path);
        }
      },
    },
  } as any;

  return { app, state };
}

const baseSettings = (overrides: Partial<OpSettings> = {}): OpSettings =>
  ({
    workflowVars: {} as Record<string, string>,
    ...overrides,
  }) as unknown as OpSettings;

const txRecord = (over: Partial<TransactionRecord> = {}): TransactionRecord => ({
  version: 1,
  timestamp: "2026-04-26T12:00:00.000Z",
  command: "op-import-module",
  modulesLanded: [],
  varsWritten: [],
  ...over,
});

describe("undoLastImport — empty / no history", () => {
  it("returns no-history when the history dir is missing", async () => {
    const { app } = fakeApp();
    const result = await undoLastImport(app, baseSettings(), async () => {});
    expect(result.status).toBe("no-history");
  });

  it("returns no-history when the history dir has no .json files", async () => {
    const { app } = fakeApp([], [TRANSACTION_HISTORY_DIR]);
    const result = await undoLastImport(app, baseSettings(), async () => {});
    expect(result.status).toBe("no-history");
  });
});

describe("undoLastImport — fresh import (no overwrite)", () => {
  it("trashes the imported module and removes the var; trashes the tx record", async () => {
    const txPath = `${TRANSACTION_HISTORY_DIR}/20260426-120000-000.json`;
    const tx = txRecord({
      modulesLanded: [
        {
          sourcePath: "Projects/_op-export/orient.md",
          targetPath: "Projects/_op-modules/orient.md",
          scopeKind: "global",
          originalProject: null,
          rewrittenProject: null,
          overwrote: false,
        },
      ],
      varsWritten: [
        { name: "tone", value: "loud", scopeKind: "global", preexisting: false },
      ],
    });
    const { app, state } = fakeApp(
      [
        { path: txPath, raw: serializeTransaction(tx) },
        { path: "Projects/_op-modules/orient.md", raw: "imported content" },
      ],
      [TRANSACTION_HISTORY_DIR],
    );
    const settings = baseSettings({ workflowVars: { tone: "loud" } });
    const result = await undoLastImport(app, settings, async () => {});
    expect(result.status).toBe("ok");
    expect(result.modulesReverted).toEqual(["Projects/_op-modules/orient.md"]);
    expect(result.varsRemoved).toEqual([{ name: "tone", scopeKind: "global" }]);
    expect(settings.workflowVars).toEqual({});
    expect(state.trashed).toContain("Projects/_op-modules/orient.md");
    expect(state.trashed).toContain(txPath);
  });
});

describe("undoLastImport — overwrite + backup restore", () => {
  it("restores the backed-up original to the target path", async () => {
    const txPath = `${TRANSACTION_HISTORY_DIR}/20260426-120000-000.json`;
    const backupPath = `${TRANSACTION_HISTORY_DIR}/20260426-120000-000.bak/Projects/_op-modules/orient.md`;
    const tx = txRecord({
      modulesLanded: [
        {
          sourcePath: "import.md",
          targetPath: "Projects/_op-modules/orient.md",
          scopeKind: "global",
          originalProject: null,
          rewrittenProject: null,
          overwrote: true,
          backupPath,
        },
      ],
    });
    const { app, state } = fakeApp(
      [
        { path: txPath, raw: serializeTransaction(tx) },
        { path: "Projects/_op-modules/orient.md", raw: "new (imported) content" },
        { path: backupPath, raw: "old (backed-up) content" },
      ],
      [
        TRANSACTION_HISTORY_DIR,
        `${TRANSACTION_HISTORY_DIR}/20260426-120000-000.bak`,
        `${TRANSACTION_HISTORY_DIR}/20260426-120000-000.bak/Projects`,
        `${TRANSACTION_HISTORY_DIR}/20260426-120000-000.bak/Projects/_op-modules`,
        "Projects",
        "Projects/_op-modules",
      ],
    );
    const result = await undoLastImport(app, baseSettings(), async () => {});
    expect(result.originalsRestored).toEqual(["Projects/_op-modules/orient.md"]);
    expect(state.files.get("Projects/_op-modules/orient.md")?.raw).toBe(
      "old (backed-up) content",
    );
    expect(state.trashed).toContain(`${TRANSACTION_HISTORY_DIR}/20260426-120000-000.bak`);
  });
});

describe("undoLastImport — preexisting vars", () => {
  it("preserves preexisting=true vars and removes only the import-added ones", async () => {
    const txPath = `${TRANSACTION_HISTORY_DIR}/20260426-120000-000.json`;
    const tx = txRecord({
      modulesLanded: [
        {
          sourcePath: "import.md",
          targetPath: "Projects/_op-modules/orient.md",
          scopeKind: "global",
          originalProject: null,
          rewrittenProject: null,
          overwrote: false,
        },
      ],
      varsWritten: [
        // Pre-existed in workflowVars before import; undo must NOT delete.
        { name: "tone", value: "calm", scopeKind: "global", preexisting: true },
        // Added by this import; undo MUST delete.
        { name: "lang", value: "fr", scopeKind: "global", preexisting: false },
      ],
    });
    const { app, state } = fakeApp(
      [
        { path: txPath, raw: serializeTransaction(tx) },
        { path: "Projects/_op-modules/orient.md", raw: "imported" },
      ],
      [TRANSACTION_HISTORY_DIR],
    );
    const settings = baseSettings({ workflowVars: { tone: "calm", lang: "fr" } });
    const result = await undoLastImport(app, settings, async () => {});
    expect(settings.workflowVars).toEqual({ tone: "calm" });
    expect(result.varsRemoved).toEqual([{ name: "lang", scopeKind: "global" }]);
    expect(result.varsPreserved).toEqual([{ name: "tone", scopeKind: "global" }]);
    expect(state.varsByStatus.size).toBe(0);
  });
});

describe("undoLastImport — project-scope vars", () => {
  it("removes a project-scope var from STATUS.md vars: map", async () => {
    const txPath = `${TRANSACTION_HISTORY_DIR}/20260426-120000-000.json`;
    const tx = txRecord({
      modulesLanded: [
        {
          sourcePath: "import.md",
          targetPath: "Projects/foo/MODULES/orient.md",
          scopeKind: "project",
          projectSlug: "foo",
          originalProject: null,
          rewrittenProject: "foo",
          overwrote: false,
        },
      ],
      varsWritten: [
        {
          name: "reviewer",
          value: "@me",
          scopeKind: "project",
          projectSlug: "foo",
          preexisting: false,
        },
      ],
    });
    const { app, state } = fakeApp(
      [
        { path: txPath, raw: serializeTransaction(tx) },
        { path: "Projects/foo/MODULES/orient.md", raw: "x" },
        { path: "Projects/foo/STATUS.md", raw: "---\n---\n" },
      ],
      [TRANSACTION_HISTORY_DIR],
    );
    state.varsByStatus.set("Projects/foo/STATUS.md", { reviewer: "@me" });
    const settings = baseSettings();
    const result = await undoLastImport(app, settings, async () => {});
    expect(result.varsRemoved).toEqual([
      { name: "reviewer", scopeKind: "project", projectSlug: "foo" },
    ]);
    expect(state.varsByStatus.get("Projects/foo/STATUS.md")).toBeUndefined();
  });
});

describe("undoLastImport — picks the latest record", () => {
  it("reverses the alphabetically-latest filename when multiple records exist", async () => {
    const older = `${TRANSACTION_HISTORY_DIR}/20260101-000000.json`;
    const newer = `${TRANSACTION_HISTORY_DIR}/20260426-120000-000.json`;
    const olderTx = txRecord({
      timestamp: "2026-01-01T00:00:00.000Z",
      modulesLanded: [
        {
          sourcePath: "old.md",
          targetPath: "Projects/_op-modules/old.md",
          scopeKind: "global",
          originalProject: null,
          rewrittenProject: null,
          overwrote: false,
        },
      ],
    });
    const newerTx = txRecord({
      modulesLanded: [
        {
          sourcePath: "new.md",
          targetPath: "Projects/_op-modules/new.md",
          scopeKind: "global",
          originalProject: null,
          rewrittenProject: null,
          overwrote: false,
        },
      ],
    });
    const { app, state } = fakeApp(
      [
        { path: older, raw: serializeTransaction(olderTx) },
        { path: newer, raw: serializeTransaction(newerTx) },
        { path: "Projects/_op-modules/old.md", raw: "old" },
        { path: "Projects/_op-modules/new.md", raw: "new" },
      ],
      [TRANSACTION_HISTORY_DIR],
    );
    const result = await undoLastImport(app, baseSettings(), async () => {});
    expect(result.transactionPath).toBe(newer);
    expect(state.files.has("Projects/_op-modules/old.md")).toBe(true);
    expect(state.files.has("Projects/_op-modules/new.md")).toBe(false);
    expect(state.files.has(newer)).toBe(false);
    expect(state.files.has(older)).toBe(true);
  });
});
