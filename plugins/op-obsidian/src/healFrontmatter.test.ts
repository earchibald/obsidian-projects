import { describe, it, expect, vi } from "vitest";

const { FakeTFile } = vi.hoisted(() => {
  class FakeTFile {
    path: string;
    constructor(path: string) {
      this.path = path;
    }
    get basename(): string {
      const last = this.path.split("/").pop() ?? "";
      return last.replace(/\.md$/, "");
    }
  }
  return { FakeTFile };
});

vi.mock("obsidian", () => ({
  TFile: FakeTFile,
  App: class {},
}));

import { healFrontmatter } from "./healFrontmatter";

interface FakeFile {
  path: string;
  fm: Record<string, any>;
  shouldThrow?: boolean;
  /** Optional mtime / ctime (epoch ms) — used by rules that backfill dates. */
  mtime?: number;
  ctime?: number;
}

function makeApp(files: FakeFile[]) {
  const tfiles = new Map<string, any>(
    files.map((f) => {
      const tf = Object.assign(new FakeTFile(f.path), f, {
        stat: { mtime: f.mtime ?? 0, ctime: f.ctime ?? 0 },
      });
      return [f.path, tf];
    }),
  );
  return {
    vault: {
      getMarkdownFiles: () => Array.from(tfiles.values()),
    },
    fileManager: {
      processFrontMatter: async (file: any, fn: (fm: Record<string, any>) => void) => {
        if (file.shouldThrow) throw new Error("simulated write failure");
        fn(file.fm);
      },
    },
  } as any;
}

const FULL_ISSUE_FM = {
  type: "issue",
  id: "OP-1",
  project: "p",
  status: "open",
  created: "2026-04-30",
  tags: ["project/p", "issue"],
};

const FULL_TASK_FM = {
  type: "task",
  id: "OP-1.1",
  project: "p",
  status: "pending",
  tags: ["project/p", "task"],
};

describe("healFrontmatter", () => {
  describe("path classification", () => {
    it("only scans Projects/<slug>/{ISSUES,RESOLVED ISSUES,TASKS}/*.md", async () => {
      const out = { path: "Notes/random.md", fm: { ...FULL_ISSUE_FM, type: undefined } };
      const docs = {
        path: "Projects/p/DOCS/some.md",
        fm: { ...FULL_ISSUE_FM, type: undefined },
      };
      const status = {
        path: "Projects/p/STATUS.md",
        fm: { ...FULL_ISSUE_FM, type: undefined },
      };
      const ok = { path: "Projects/p/ISSUES/OP-1.md", fm: { ...FULL_ISSUE_FM } };
      const app = makeApp([out, docs, status, ok]);
      const res = await healFrontmatter(app);
      expect(res.scanned).toBe(1);
      expect(res.fixed).toEqual([]);
      expect(out.fm.type).toBeUndefined();
      expect(docs.fm.type).toBeUndefined();
      expect(status.fm.type).toBeUndefined();
    });
  });

  describe("issue rules", () => {
    it("backfills missing type/project/id/status/created/tags from path & filename", async () => {
      const f: FakeFile = {
        path: "Projects/myproj/ISSUES/MP-7 something.md",
        fm: {},
        ctime: Date.UTC(2026, 0, 15),
      };
      const app = makeApp([f]);
      const res = await healFrontmatter(app);
      expect(res.fixed).toHaveLength(1);
      expect(res.fixed[0].rules).toEqual(
        expect.arrayContaining([
          "issue.type",
          "issue.project",
          "issue.id",
          "issue.status.default",
          "issue.created",
          "issue.tags",
        ]),
      );
      expect(f.fm.type).toBe("issue");
      expect(f.fm.project).toBe("myproj");
      expect(f.fm.id).toBe("MP-7");
      expect(f.fm.status).toBe("open");
      expect(f.fm.created).toBe("2026-01-15");
      expect(f.fm.tags).toEqual(["project/myproj", "issue"]);
    });

    it("defaults status to 'resolved' when in RESOLVED ISSUES/", async () => {
      const f: FakeFile = {
        path: "Projects/myproj/RESOLVED ISSUES/MP-7 something.md",
        fm: {},
      };
      const app = makeApp([f]);
      await healFrontmatter(app);
      expect(f.fm.status).toBe("resolved");
    });

    it("preserves existing tags when adding the canonical pair", async () => {
      const f: FakeFile = {
        path: "Projects/p/ISSUES/OP-1 t.md",
        fm: { ...FULL_ISSUE_FM, tags: ["custom/x"] },
      };
      const app = makeApp([f]);
      await healFrontmatter(app);
      expect(f.fm.tags).toEqual(["custom/x", "project/p", "issue"]);
    });

    it("skips id rule when filename has no PREFIX-N pattern", async () => {
      const f: FakeFile = { path: "Projects/p/ISSUES/notes.md", fm: { ...FULL_ISSUE_FM, id: undefined } };
      const app = makeApp([f]);
      await healFrontmatter(app);
      expect(f.fm.id).toBeUndefined();
    });

    it("falls back to today() when ctime is unavailable for created", async () => {
      const f: FakeFile = {
        path: "Projects/p/ISSUES/OP-1 t.md",
        fm: { ...FULL_ISSUE_FM, created: undefined },
        ctime: 0,
      };
      const app = makeApp([f]);
      await healFrontmatter(app);
      expect(f.fm.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("OP-221 rule: file in RESOLVED ISSUES/ + non-terminal status → resolved + backfill", async () => {
      const f: FakeFile = {
        path: "Projects/p/RESOLVED ISSUES/OP-197.md",
        fm: { ...FULL_ISSUE_FM, id: "OP-197", status: "in-progress", launch_vars: { x: 1 } },
        mtime: Date.UTC(2026, 0, 15),
      };
      const app = makeApp([f]);
      const res = await healFrontmatter(app);
      expect(f.fm.status).toBe("resolved");
      expect(f.fm.resolved).toBe("2026-01-15");
      expect(f.fm.launch_vars).toBeUndefined();
      expect(res.fixed[0].rules).toContain("issue.status.staleResolved");
    });

    it("OP-221 rule preserves agent/agent_session (live-agent safety)", async () => {
      const f: FakeFile = {
        path: "Projects/p/RESOLVED ISSUES/OP-197.md",
        fm: {
          ...FULL_ISSUE_FM,
          id: "OP-197",
          status: "in-progress",
          agent: "claude",
          agent_session: "tmux:abc",
          custom_field: "keep me",
        },
      };
      const app = makeApp([f]);
      await healFrontmatter(app);
      expect(f.fm.agent).toBe("claude");
      expect(f.fm.agent_session).toBe("tmux:abc");
      expect(f.fm.custom_field).toBe("keep me");
    });

    it("OP-221 rule preserves an existing `resolved:` date — no overwrite", async () => {
      const f: FakeFile = {
        path: "Projects/p/RESOLVED ISSUES/OP-1.md",
        fm: { ...FULL_ISSUE_FM, status: "in-progress", resolved: "2025-01-15" },
      };
      const app = makeApp([f]);
      await healFrontmatter(app);
      expect(f.fm.resolved).toBe("2025-01-15");
    });

    it("OP-221 rule treats wontfix in RESOLVED ISSUES/ as terminal — no rewrite", async () => {
      const f: FakeFile = {
        path: "Projects/p/RESOLVED ISSUES/OP-300.md",
        fm: { ...FULL_ISSUE_FM, id: "OP-300", status: "wontfix" },
      };
      const app = makeApp([f]);
      const res = await healFrontmatter(app);
      expect(f.fm.status).toBe("wontfix");
      const rules = res.fixed[0]?.rules ?? [];
      expect(rules).not.toContain("issue.status.staleResolved");
    });

    it("OP-247 inverse: file in ISSUES/ + terminal status → status open", async () => {
      const f: FakeFile = {
        path: "Projects/p/ISSUES/OP-1.md",
        fm: { ...FULL_ISSUE_FM, status: "resolved" },
      };
      const app = makeApp([f]);
      const res = await healFrontmatter(app);
      expect(f.fm.status).toBe("open");
      expect(res.fixed[0].rules).toContain("issue.status.staleTerminal");
    });

    it("OP-247 inverse also flips wontfix in ISSUES/ → open", async () => {
      const f: FakeFile = {
        path: "Projects/p/ISSUES/OP-1.md",
        fm: { ...FULL_ISSUE_FM, status: "wontfix" },
      };
      const app = makeApp([f]);
      await healFrontmatter(app);
      expect(f.fm.status).toBe("open");
    });
  });

  describe("task rules", () => {
    it("backfills missing type/project/id/status/tags from path & filename", async () => {
      const f: FakeFile = { path: "Projects/myproj/TASKS/MP-7.1 work.md", fm: {} };
      const app = makeApp([f]);
      const res = await healFrontmatter(app);
      expect(res.fixed[0].rules).toEqual(
        expect.arrayContaining([
          "task.type",
          "task.project",
          "task.id",
          "task.status.default",
          "task.tags",
        ]),
      );
      expect(f.fm.type).toBe("task");
      expect(f.fm.project).toBe("myproj");
      expect(f.fm.id).toBe("MP-7.1");
      expect(f.fm.status).toBe("pending");
      expect(f.fm.tags).toEqual(["project/myproj", "task"]);
    });

    it("skips id when filename has no PREFIX-N.M pattern", async () => {
      const f: FakeFile = { path: "Projects/p/TASKS/notes.md", fm: { ...FULL_TASK_FM, id: undefined } };
      const app = makeApp([f]);
      await healFrontmatter(app);
      expect(f.fm.id).toBeUndefined();
    });
  });

  describe("idempotency", () => {
    it("is a no-op on a clean vault", async () => {
      const issue: FakeFile = { path: "Projects/p/ISSUES/OP-1.md", fm: { ...FULL_ISSUE_FM } };
      const task: FakeFile = { path: "Projects/p/TASKS/OP-1.1.md", fm: { ...FULL_TASK_FM } };
      const app = makeApp([issue, task]);
      const res = await healFrontmatter(app);
      expect(res.scanned).toBe(2);
      expect(res.fixed).toEqual([]);
    });

    it("re-running after a heal yields 0 further fixes", async () => {
      const f: FakeFile = { path: "Projects/p/ISSUES/OP-1 t.md", fm: {} };
      const app = makeApp([f]);
      await healFrontmatter(app);
      const second = await healFrontmatter(app);
      expect(second.fixed).toEqual([]);
    });
  });

  describe("OP-270: stale loc after concurrent rename", () => {
    it("does not apply staleTerminal when file was moved to RESOLVED ISSUES mid-pass", async () => {
      // Scenario: healFrontmatter captures a candidate at ISSUES/OP-270.md, then
      // a concurrent runResolve:
      //   1. renames the file → RESOLVED ISSUES/OP-270 resolved.md
      //   2. writes fm.status = "resolved"
      // By the time healFrontmatter's processFrontMatter lock is acquired, file.path
      // is already the target path. The staleTerminal rule must NOT fire.
      const tf = Object.assign(
        new FakeTFile("Projects/p/ISSUES/OP-270 test.md"),
        { stat: { mtime: 0, ctime: 0 }, fm: { ...FULL_ISSUE_FM, status: "in-progress" } },
      );

      const app = {
        vault: {
          getMarkdownFiles: () => [tf],
        },
        fileManager: {
          processFrontMatter: async (file: any, fn: (fm: Record<string, any>) => void) => {
            // Simulate: rename completed (and runResolve wrote status) before
            // the heal callback acquires the lock.
            file.path = "Projects/p/RESOLVED ISSUES/OP-270 test resolved.md";
            file.fm.status = "resolved";
            fn(file.fm);
          },
        },
      } as any;

      const res = await healFrontmatter(app);
      expect(tf.fm.status).toBe("resolved");
      const rules = res.fixed[0]?.rules ?? [];
      expect(rules).not.toContain("issue.status.staleTerminal");
    });
  });

  describe("error handling", () => {
    it("captures errors per-file without aborting the pass", async () => {
      const ok: FakeFile = { path: "Projects/p/ISSUES/OP-1.md", fm: {} };
      const fail: FakeFile = { path: "Projects/p/ISSUES/OP-2.md", fm: {}, shouldThrow: true };
      const app = makeApp([ok, fail]);
      const res = await healFrontmatter(app);
      expect(res.fixed.map((f) => f.path)).toEqual([ok.path]);
      expect(res.errors.map((e) => e.path)).toEqual([fail.path]);
    });
  });

  describe("composition", () => {
    it("applies multiple rules to a single drifted file in one write", async () => {
      let writeCount = 0;
      const f: FakeFile = { path: "Projects/p/RESOLVED ISSUES/OP-9 t.md", fm: {} };
      const app = {
        vault: {
          getMarkdownFiles: () => [Object.assign(new FakeTFile(f.path), f, { stat: { mtime: 0, ctime: 0 } })],
        },
        fileManager: {
          processFrontMatter: async (_file: any, fn: (fm: Record<string, any>) => void) => {
            writeCount++;
            fn(f.fm);
          },
        },
      } as any;
      const res = await healFrontmatter(app);
      expect(writeCount).toBe(1);
      // Many rules fire on this synthetic empty-fm file in RESOLVED ISSUES/.
      expect(res.fixed[0].rules.length).toBeGreaterThanOrEqual(5);
      expect(f.fm.type).toBe("issue");
      expect(f.fm.status).toBe("resolved");
    });
  });
});
