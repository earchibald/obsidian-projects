import { describe, it, expect, vi } from "vitest";

const { FakeTFile } = vi.hoisted(() => {
  class FakeTFile {
    path: string;
    constructor(path: string) {
      this.path = path;
    }
  }
  return { FakeTFile };
});

vi.mock("obsidian", () => ({
  TFile: FakeTFile,
  Modal: class {
    open() {}
    close() {}
  },
  Notice: class {
    constructor(_msg?: any, _t?: number) {}
    hide() {}
  },
  Setting: class {
    addButton() {
      return this;
    }
  },
  SuggestModal: class {},
  FuzzySuggestModal: class {},
  prepareFuzzySearch: () => () => null,
  normalizePath: (p: string) => p,
  setIcon: () => {},
  setTooltip: () => {},
}));

vi.mock("./openAgent", () => ({
  clearAgentOnIssue: vi.fn(async (app: any, path: string) => {
    const f = app.vault.getAbstractFileByPath(path);
    if (!f) return;
    await app.fileManager.processFrontMatter(f, (fm: any) => {
      delete fm.agent;
      delete fm.agent_session;
    });
  }),
  recordAgentOnIssue: vi.fn(),
  resolveProfile: vi.fn(),
  openAgent: vi.fn(),
}));

vi.mock("./agentSessionCleanup", () => ({
  cleanupAgentSessions: vi.fn(async (args: any) => ({
    killed: args.issueIds.map((id: string) => ({
      issueId: id,
      session: "op-agents",
      window: id,
    })),
    prunedSurfaces: [],
    closedWindows: [],
  })),
}));

vi.mock("./iterm/driver", () => ({
  closeWindow: vi.fn(async () => {}),
}));

import { detachAgent } from "./detachAgent";
import type { IssueEntry } from "./types";
import { cleanupAgentSessions } from "./agentSessionCleanup";

function makeStore(entry?: IssueEntry) {
  return {
    byId: vi.fn((id: string) => (entry && entry.id === id ? entry : undefined)),
  } as any;
}

function makeApp(initialFm: Record<string, unknown> = {}) {
  const fm = { ...initialFm };
  const file = new FakeTFile("Projects/demo/ISSUES/OP-1 t.md");
  return {
    fm,
    app: {
      vault: {
        getAbstractFileByPath: (p: string) =>
          p === "Projects/demo/ISSUES/OP-1 t.md" ? file : null,
      },
      fileManager: {
        processFrontMatter: async (
          _f: unknown,
          cb: (fm: Record<string, unknown>) => void,
        ) => {
          cb(fm);
        },
      },
    } as any,
  };
}

const baseSettings: any = {
  tmuxBinary: "/opt/homebrew/bin/tmux",
  orchestratorState: { surfaces: {}, windows: {}, windowOrder: [] },
};

describe("detachAgent", () => {
  it("kills the issue's tmux window and clears agent: frontmatter", async () => {
    const entry: IssueEntry = {
      path: "Projects/demo/ISSUES/OP-1 t.md",
      type: "issue",
      id: "OP-1",
      project: "demo",
      status: "in-progress",
      title: "t",
      resolvedFolder: false,
      agent: "claude",
    };
    const { app, fm } = makeApp({ agent: "claude", agent_session: "sess-1" });
    const saveSettings = vi.fn(async () => {});
    const result = await detachAgent({
      app,
      store: makeStore(entry),
      settings: baseSettings,
      saveSettings,
      issueId: "OP-1",
    });
    expect(result.ok).toBe(true);
    expect(result.found).toBe(true);
    expect(result.cleared).toBe(true);
    expect(result.killed).toEqual([
      { issueId: "OP-1", session: "op-agents", window: "OP-1" },
    ]);
    expect(fm.agent).toBeUndefined();
    expect(fm.agent_session).toBeUndefined();
    // saveSettings runs only when the cleanup actually changed registry state.
    expect(saveSettings).toHaveBeenCalled();
  });

  it("returns found=false when the issue isn't in the store", async () => {
    const { app } = makeApp();
    const result = await detachAgent({
      app,
      store: makeStore(undefined),
      settings: baseSettings,
      saveSettings: vi.fn(async () => {}),
      issueId: "OP-99",
    });
    expect(result.ok).toBe(true);
    expect(result.found).toBe(false);
    expect(result.cleared).toBe(false);
  });

  it("idempotent: zero kills + no agent set still resolves cleanly", async () => {
    const noAgent: IssueEntry = {
      path: "Projects/demo/ISSUES/OP-1 t.md",
      type: "issue",
      id: "OP-1",
      project: "demo",
      status: "open",
      title: "t",
      resolvedFolder: false,
    };
    vi.mocked(cleanupAgentSessions).mockResolvedValueOnce({
      killed: [],
      prunedSurfaces: [],
      closedWindows: [],
    });
    const { app, fm } = makeApp({});
    const result = await detachAgent({
      app,
      store: makeStore(noAgent),
      settings: baseSettings,
      saveSettings: vi.fn(async () => {}),
      issueId: "OP-1",
    });
    expect(result.ok).toBe(true);
    expect(result.found).toBe(true);
    expect(result.cleared).toBe(true);
    expect(fm.agent).toBeUndefined();
  });

  it("surfaces an error when cleanup throws", async () => {
    vi.mocked(cleanupAgentSessions).mockRejectedValueOnce(new Error("tmux down"));
    const entry: IssueEntry = {
      path: "Projects/demo/ISSUES/OP-1 t.md",
      type: "issue",
      id: "OP-1",
      project: "demo",
      status: "in-progress",
      title: "t",
      resolvedFolder: false,
      agent: "claude",
    };
    const { app } = makeApp({ agent: "claude" });
    const result = await detachAgent({
      app,
      store: makeStore(entry),
      settings: baseSettings,
      saveSettings: vi.fn(async () => {}),
      issueId: "OP-1",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/tmux down/);
    expect(result.cleared).toBe(false);
  });
});
