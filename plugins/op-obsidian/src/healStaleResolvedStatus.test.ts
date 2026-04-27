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
  App: class {},
}));

import { healStaleResolvedStatus } from "./healStaleResolvedStatus";
import type { IssueEntry, IssueStatus } from "./types";

function entry(over: Partial<IssueEntry>): IssueEntry {
  return {
    path: "x.md",
    type: "issue",
    id: "OP-1",
    project: "p",
    status: "in-progress",
    title: "t",
    resolvedFolder: false,
    ...over,
  };
}

function makeStore(issues: IssueEntry[]) {
  return { issues: () => issues } as any;
}

interface FakeFile {
  path: string;
  fm: Record<string, any>;
  shouldThrow?: boolean;
}

function makeApp(files: FakeFile[]) {
  const tfiles = new Map<string, any>(
    files.map((f) => {
      const tf = Object.assign(new FakeTFile(f.path), f);
      return [f.path, tf];
    }),
  );
  return {
    vault: {
      getAbstractFileByPath: (p: string) => tfiles.get(p) ?? null,
    },
    fileManager: {
      processFrontMatter: async (file: any, fn: (fm: Record<string, any>) => void) => {
        if (file.shouldThrow) throw new Error("simulated write failure");
        fn(file.fm);
      },
    },
  } as any;
}

describe("healStaleResolvedStatus", () => {
  it("rewrites status to resolved for resolvedFolder rows whose status is non-terminal", async () => {
    const drift = entry({
      id: "OP-197",
      path: "Projects/p/RESOLVED ISSUES/OP-197.md",
      status: "in-progress" as IssueStatus,
      resolvedFolder: true,
    });
    const ok = entry({
      id: "OP-200",
      path: "Projects/p/RESOLVED ISSUES/OP-200.md",
      status: "resolved" as IssueStatus,
      resolvedFolder: true,
    });
    const live = entry({
      id: "OP-201",
      path: "Projects/p/ISSUES/OP-201.md",
      status: "in-progress" as IssueStatus,
      resolvedFolder: false,
    });
    const driftFile: FakeFile = {
      path: drift.path,
      fm: { id: "OP-197", status: "in-progress", resolved: "2026-04-26" },
    };
    const okFile: FakeFile = {
      path: ok.path,
      fm: { id: "OP-200", status: "resolved", resolved: "2026-04-26" },
    };
    const liveFile: FakeFile = {
      path: live.path,
      fm: { id: "OP-201", status: "in-progress" },
    };
    const app = makeApp([driftFile, okFile, liveFile]);
    const store = makeStore([drift, ok, live]);

    const result = await healStaleResolvedStatus(app, store);

    expect(result.scanned).toBe(3);
    expect(result.fixed.map((f) => f.path)).toEqual([drift.path]);
    expect(result.fixed[0]?.from).toBe("in-progress");
    expect(result.errors).toEqual([]);
    // Drift file is rewritten in place — `resolved:` and `id:` preserved.
    expect(driftFile.fm.status).toBe("resolved");
    expect(driftFile.fm.resolved).toBe("2026-04-26");
    expect(driftFile.fm.id).toBe("OP-197");
    // Healthy files untouched.
    expect(okFile.fm.status).toBe("resolved");
    expect(liveFile.fm.status).toBe("in-progress");
  });

  it("treats resolvedFolder + wontfix as terminal — no rewrite", async () => {
    const wf = entry({
      id: "OP-300",
      path: "Projects/p/RESOLVED ISSUES/OP-300.md",
      status: "wontfix" as IssueStatus,
      resolvedFolder: true,
    });
    const file: FakeFile = { path: wf.path, fm: { id: "OP-300", status: "wontfix" } };
    const app = makeApp([file]);
    const store = makeStore([wf]);

    const result = await healStaleResolvedStatus(app, store);

    expect(result.fixed).toEqual([]);
    expect(file.fm.status).toBe("wontfix");
  });

  it("captures errors per-file without aborting the pass", async () => {
    const okDrift = entry({
      id: "OP-1",
      path: "Projects/p/RESOLVED ISSUES/OP-1.md",
      status: "in-progress" as IssueStatus,
      resolvedFolder: true,
    });
    const failDrift = entry({
      id: "OP-2",
      path: "Projects/p/RESOLVED ISSUES/OP-2.md",
      status: "in-progress" as IssueStatus,
      resolvedFolder: true,
    });
    const missingDrift = entry({
      id: "OP-3",
      path: "Projects/p/RESOLVED ISSUES/OP-3.md",
      status: "in-progress" as IssueStatus,
      resolvedFolder: true,
    });
    const okFile: FakeFile = { path: okDrift.path, fm: { status: "in-progress" } };
    const failFile: FakeFile = {
      path: failDrift.path,
      fm: { status: "in-progress" },
      shouldThrow: true,
    };
    // missingDrift's file is intentionally not registered — getAbstractFileByPath returns null.
    const app = makeApp([okFile, failFile]);
    const store = makeStore([okDrift, failDrift, missingDrift]);

    const result = await healStaleResolvedStatus(app, store);

    expect(result.fixed.map((f) => f.path)).toEqual([okDrift.path]);
    expect(result.errors.map((e) => e.path).sort()).toEqual(
      [failDrift.path, missingDrift.path].sort(),
    );
    expect(okFile.fm.status).toBe("resolved");
    expect(failFile.fm.status).toBe("in-progress");
  });

  it("is a no-op when no drift exists", async () => {
    const all = entry({
      id: "OP-1",
      path: "Projects/p/ISSUES/OP-1.md",
      status: "open" as IssueStatus,
      resolvedFolder: false,
    });
    const app = makeApp([{ path: all.path, fm: { status: "open" } }]);
    const store = makeStore([all]);

    const result = await healStaleResolvedStatus(app, store);
    expect(result.scanned).toBe(1);
    expect(result.fixed).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
