import { describe, it, expect, vi } from "vitest";

const { FakeTFile } = vi.hoisted(() => {
  class FakeTFile {
    path: string;
    name: string;
    constructor(path: string) {
      this.path = path;
      this.name = path.split("/").pop() ?? path;
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
  Setting: class {
    addButton() {
      return this;
    }
  },
  normalizePath: (p: string) => p,
}));

vi.mock("./projects", () => ({
  listProjects: () => [
    { slug: "demo", prefix: "OP", statusPath: "Projects/demo/STATUS.md" },
  ],
}));

import { runResolve, handleResolveModalEnter } from "./resolve";
import type { IssueEntry } from "./types";

interface Recorded {
  fmBefore: Record<string, unknown>;
  fmAfter: Record<string, unknown>;
  renamedTo?: string;
  trashed: string[];
}

function issue(over: Partial<IssueEntry> = {}): IssueEntry {
  return {
    path: "Projects/demo/ISSUES/OP-1 t.md",
    type: "issue",
    id: "OP-1",
    project: "demo",
    status: "in-progress",
    title: "t",
    resolvedFolder: false,
    ...over,
  };
}

function makeFakes(entry: IssueEntry, fmInitial: Record<string, unknown>) {
  const file = new FakeTFile(entry.path);
  const fm: Record<string, unknown> = { ...fmInitial };
  const recorded: Recorded = { fmBefore: { ...fm }, fmAfter: fm, trashed: [] };

  const store: any = {
    byPath: (p: string) => (p === entry.path ? entry : undefined),
    tasks: () => [],
    issues: () => [entry],
  };

  const app: any = {
    vault: {
      getAbstractFileByPath: (p: string) => (p === entry.path ? file : null),
      adapter: { exists: async () => true },
      createFolder: async () => {},
      trash: async () => {},
    },
    fileManager: {
      processFrontMatter: async (
        _f: unknown,
        cb: (fm: Record<string, unknown>) => void,
      ) => {
        cb(fm);
      },
      renameFile: async (f: any, target: string) => {
        recorded.renamedTo = target;
        // Mimic real Obsidian: TFile.path updates to the target path after rename.
        f.path = target;
        f.name = target.split("/").pop() ?? target;
      },
    },
  };

  return { store, app, recorded, fm };
}

describe("runResolve — agent-badge persistence (OP-156 §5)", () => {
  it("clears agent: when no probe is wired (legacy callers)", async () => {
    const e = issue();
    const { store, app, fm } = makeFakes(e, {
      status: "in-progress",
      agent: "claude",
      agent_session: "sess-1",
    });
    const res = await runResolve(app, store, { path: e.path, confirmed: true });
    expect(res.ok).toBe(true);
    expect(fm.agent).toBeUndefined();
    expect(fm.agent_session).toBeUndefined();
    expect(res.agentKept).toBeUndefined();
    expect(res.agentProbeOk).toBeUndefined();
  });

  it("keeps agent: when the probe says alive", async () => {
    const e = issue({ agent: "claude" });
    const { store, app, fm } = makeFakes(e, {
      status: "in-progress",
      agent: "claude",
      agent_session: "sess-1",
    });
    const probe = vi.fn(async () => ({ ok: true as const, alive: true }));
    const res = await runResolve(app, store, {
      path: e.path,
      confirmed: true,
      probeAgentLive: probe,
    });
    expect(probe).toHaveBeenCalledWith("OP-1");
    expect(res.ok).toBe(true);
    expect(res.agentKept).toBe(true);
    expect(res.agentProbeOk).toBe(true);
    expect(fm.agent).toBe("claude");
    expect(fm.agent_session).toBe("sess-1");
    expect(fm.status).toBe("resolved");
    expect(fm.resolved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("clears agent: when the probe says dead (legacy clear path)", async () => {
    const e = issue({ agent: "claude" });
    const { store, app, fm } = makeFakes(e, {
      status: "in-progress",
      agent: "claude",
      agent_session: "sess-1",
    });
    const probe = vi.fn(async () => ({ ok: true as const, alive: false }));
    const res = await runResolve(app, store, {
      path: e.path,
      confirmed: true,
      probeAgentLive: probe,
    });
    expect(res.agentKept).toBe(false);
    expect(res.agentProbeOk).toBe(true);
    expect(fm.agent).toBeUndefined();
    expect(fm.agent_session).toBeUndefined();
  });

  it("keeps agent: when the probe fails (tmux unreachable)", async () => {
    const e = issue({ agent: "claude" });
    const { store, app, fm } = makeFakes(e, {
      status: "in-progress",
      agent: "claude",
      agent_session: "sess-1",
    });
    const probe = vi.fn(async () => ({ ok: false as const }));
    const res = await runResolve(app, store, {
      path: e.path,
      confirmed: true,
      probeAgentLive: probe,
    });
    expect(res.agentKept).toBe(true);
    expect(res.agentProbeOk).toBe(false);
    expect(fm.agent).toBe("claude");
    expect(fm.agent_session).toBe("sess-1");
  });

  it("keeps agent: when the probe throws unexpectedly", async () => {
    const e = issue({ agent: "claude" });
    const { store, app, fm } = makeFakes(e, {
      status: "in-progress",
      agent: "claude",
      agent_session: "sess-1",
    });
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const probe = vi.fn(async () => {
      throw new Error("boom");
    });
    const res = await runResolve(app, store, {
      path: e.path,
      confirmed: true,
      probeAgentLive: probe,
    });
    expect(res.agentKept).toBe(true);
    expect(res.agentProbeOk).toBe(false);
    expect(fm.agent).toBe("claude");
    expect(fm.agent_session).toBe("sess-1");
    consoleWarn.mockRestore();
  });

  it("does not run the probe when the issue has no agent set", async () => {
    const e = issue();
    const { store, app } = makeFakes(e, { status: "in-progress" });
    const probe = vi.fn(async () => ({ ok: true as const, alive: true }));
    const res = await runResolve(app, store, {
      path: e.path,
      confirmed: true,
      probeAgentLive: probe,
    });
    expect(probe).not.toHaveBeenCalled();
    expect(res.agentKept).toBeUndefined();
    expect(res.agentProbeOk).toBeUndefined();
  });

  it("moves the file into RESOLVED ISSUES regardless of probe outcome", async () => {
    const e = issue({ agent: "claude" });
    const { store, app, recorded } = makeFakes(e, {
      status: "in-progress",
      agent: "claude",
    });
    await runResolve(app, store, {
      path: e.path,
      confirmed: true,
      probeAgentLive: async () => ({ ok: true as const, alive: true }),
    });
    expect(recorded.renamedTo).toBe("Projects/demo/RESOLVED ISSUES/OP-1 t.md");
  });
});

// OP-221 (gemini review #2): if processFrontMatter throws AFTER the rename
// has already moved the file, the function must still trash linked tasks
// and return — leaving the moved file in a stale-status state that the
// startup heal pass will reconcile on the next plugin load.
describe("runResolve — graceful failure when frontmatter write throws", () => {
  it("still trashes linked tasks when processFrontMatter throws after rename", async () => {
    const e = issue();
    const file = new FakeTFile(e.path);
    const taskTrashed: string[] = [];

    const taskFile = new FakeTFile("Projects/demo/TASKS/OP-1.1 work.md");
    const store: any = {
      byPath: (p: string) => (p === e.path ? e : undefined),
      tasks: () => [
        {
          path: taskFile.path,
          type: "task",
          id: "OP-1.1",
          project: "demo",
          status: "in-progress",
          issueLink: "OP-1",
          title: "OP-1.1 work",
        },
      ],
      issues: () => [e],
    };

    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});

    const app: any = {
      vault: {
        getAbstractFileByPath: (p: string) =>
          p === e.path ? file : p === taskFile.path ? taskFile : null,
        adapter: { exists: async () => true },
        createFolder: async () => {},
        trash: async (f: any) => {
          taskTrashed.push(f.path);
        },
      },
      fileManager: {
        processFrontMatter: async () => {
          throw new Error("simulated yaml parse failure");
        },
        renameFile: async () => {},
      },
    };

    const res = await runResolve(app, store, { path: e.path, confirmed: true });

    expect(res.ok).toBe(true);
    expect(res.movedTo).toBe("Projects/demo/RESOLVED ISSUES/OP-1 t.md");
    expect(res.trashed).toEqual([taskFile.path]);
    expect(taskTrashed).toEqual([taskFile.path]);
    // OP-221 (gemini #3, 2nd pass): partial-failure must be visible to caller.
    expect(res.frontmatterWriteError).toContain("simulated yaml parse failure");
    expect(consoleErr).toHaveBeenCalledWith(
      expect.stringContaining("processFrontMatter failed after rename"),
      "Projects/demo/RESOLVED ISSUES/OP-1 t.md",
      expect.stringContaining("simulated yaml parse failure"),
    );
    consoleErr.mockRestore();
  });

  it("leaves frontmatterWriteError undefined on a clean resolve", async () => {
    const e = issue();
    const { store, app } = makeFakes(e, { status: "in-progress" });
    const res = await runResolve(app, store, { path: e.path, confirmed: true });
    expect(res.ok).toBe(true);
    expect(res.frontmatterWriteError).toBeUndefined();
  });
});

describe("handleResolveModalEnter", () => {
  function fakeEvt(target: { tagName?: string } | null) {
    let prevented = false;
    return {
      evt: { target, preventDefault: () => (prevented = true) },
      get prevented() {
        return prevented;
      },
    };
  }

  it("calls onConfirm and preventDefault for a non-input target", () => {
    const onConfirm = vi.fn();
    const e = fakeEvt({ tagName: "DIV" });
    handleResolveModalEnter(e.evt, onConfirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(e.prevented).toBe(true);
  });

  it("skips when an INPUT is focused", () => {
    const onConfirm = vi.fn();
    const e = fakeEvt({ tagName: "INPUT" });
    handleResolveModalEnter(e.evt, onConfirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(e.prevented).toBe(false);
  });

  it("skips when a TEXTAREA is focused", () => {
    const onConfirm = vi.fn();
    const e = fakeEvt({ tagName: "TEXTAREA" });
    handleResolveModalEnter(e.evt, onConfirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(e.prevented).toBe(false);
  });

  it("confirms when target is null", () => {
    const onConfirm = vi.fn();
    const e = fakeEvt(null);
    handleResolveModalEnter(e.evt, onConfirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(e.prevented).toBe(true);
  });
});
