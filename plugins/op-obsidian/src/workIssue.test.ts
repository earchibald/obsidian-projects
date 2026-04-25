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
import { workIssue } from "./workIssue";
import type { IssueEntry } from "./types";
import type { IssueStore } from "./issueStore";

interface FakeFm {
  status?: string;
  agent?: string;
  agent_session?: string;
  [k: string]: unknown;
}

function makeEnv(initial: FakeFm = { status: "open" }) {
  const issuePath = "Projects/demo/ISSUES/OP-1 t.md";
  const fm: FakeFm = { ...initial };
  const issueFile = Object.assign(new TFile(), {
    path: issuePath,
    basename: "OP-1 t",
    name: "OP-1 t.md",
  });
  const folders = new Set<string>();
  const created: Array<{ path: string; content: string }> = [];
  const app = {
    vault: {
      getAbstractFileByPath: (p: string) => {
        if (p === issuePath) return issueFile;
        if (folders.has(p)) return { children: [] };
        const hit = created.find((c) => c.path === p);
        return hit ? Object.assign(new TFile(), { path: hit.path }) : null;
      },
      createFolder: async (p: string) => {
        folders.add(p);
      },
      create: async (path: string, content: string) => {
        created.push({ path, content });
        return Object.assign(new TFile(), { path });
      },
    },
    fileManager: {
      processFrontMatter: async (_f: unknown, mut: (fm: FakeFm) => void) => {
        mut(fm);
      },
    },
  };
  const entry: IssueEntry = {
    path: issuePath,
    type: "issue",
    id: "OP-1",
    project: "demo",
    status: (initial.status as IssueEntry["status"]) ?? "open",
    title: "OP-1 t",
    resolvedFolder: false,
  };
  const store = { tasks: () => [], issues: () => [entry] } as unknown as IssueStore;
  return { app: app as any, store, entry, fm, created };
}

describe("workIssue — base behavior (no agent args)", () => {
  it("flips status to in-progress and seeds the default task", async () => {
    const { app, store, entry, fm, created } = makeEnv();
    const res = await workIssue(app, store, entry);
    expect(fm.status).toBe("in-progress");
    expect(res.previousStatus).toBe("open");
    expect(res.createdTaskPath).toBe("Projects/demo/TASKS/OP-1.1 work.md");
    expect(created).toHaveLength(1);
    expect(res.registered).toBe(true); // no-op registration counts as registered
    expect(res.registration).toBeUndefined();
    expect(res.conflict).toBeUndefined();
    expect(fm.agent).toBeUndefined();
  });
});

describe("workIssue — agent registration", () => {
  it("writes agent and agent_session into frontmatter on a fresh issue", async () => {
    const { app, store, entry, fm } = makeEnv();
    const res = await workIssue(app, store, entry, {
      agent: "claude",
      agentSession: "sess-1",
    });
    expect(fm.agent).toBe("claude");
    expect(fm.agent_session).toBe("sess-1");
    expect(res.registered).toBe(true);
    expect(res.registration).toEqual({ agent: "claude", session: "sess-1" });
    expect(res.alreadyHeld).toBeUndefined();
    expect(res.conflict).toBeUndefined();
  });

  it("is idempotent when existing agent and session match", async () => {
    const { app, store, entry, fm } = makeEnv({
      status: "in-progress",
      agent: "claude",
      agent_session: "sess-1",
    });
    const res = await workIssue(app, store, entry, {
      agent: "claude",
      agentSession: "sess-1",
    });
    expect(res.registered).toBe(true);
    expect(res.alreadyHeld).toBe(true);
    expect(res.conflict).toBeUndefined();
    expect(fm.agent).toBe("claude");
    expect(fm.agent_session).toBe("sess-1");
  });

  it("reports conflict when an existing different agent is registered", async () => {
    const { app, store, entry, fm } = makeEnv({
      status: "in-progress",
      agent: "codex",
      agent_session: "other-sess",
    });
    const res = await workIssue(app, store, entry, {
      agent: "claude",
      agentSession: "sess-1",
    });
    expect(res.registered).toBe(false);
    expect(res.conflict?.agent).toBe("codex");
    expect(res.conflict?.session).toBe("other-sess");
    // Frontmatter unchanged on conflict.
    expect(fm.agent).toBe("codex");
    expect(fm.agent_session).toBe("other-sess");
    // Status flip still happens.
    expect(fm.status).toBe("in-progress");
  });

  it("force=true overwrites a conflicting registration", async () => {
    const { app, store, entry, fm } = makeEnv({
      status: "in-progress",
      agent: "codex",
      agent_session: "other-sess",
    });
    const res = await workIssue(app, store, entry, {
      agent: "claude",
      agentSession: "sess-1",
      force: true,
    });
    expect(res.registered).toBe(true);
    expect(res.conflict).toBeUndefined();
    expect(fm.agent).toBe("claude");
    expect(fm.agent_session).toBe("sess-1");
    expect(res.registration).toEqual({ agent: "claude", session: "sess-1" });
  });

  it("treats different session of same agent as a conflict", async () => {
    const { app, store, entry, fm } = makeEnv({
      status: "in-progress",
      agent: "claude",
      agent_session: "old-sess",
    });
    const res = await workIssue(app, store, entry, {
      agent: "claude",
      agentSession: "new-sess",
    });
    expect(res.registered).toBe(false);
    expect(res.conflict).toEqual({ session: "old-sess" });
    expect(fm.agent_session).toBe("old-sess"); // unchanged
  });

  it("upgrades a session-less registration without flagging conflict", async () => {
    const { app, store, entry, fm } = makeEnv({
      status: "in-progress",
      agent: "claude",
    });
    const res = await workIssue(app, store, entry, {
      agent: "claude",
      agentSession: "sess-new",
    });
    expect(res.registered).toBe(true);
    expect(res.alreadyHeld).toBeUndefined();
    expect(res.conflict).toBeUndefined();
    expect(fm.agent_session).toBe("sess-new");
  });

  it("registering only agent (no session) leaves session unset", async () => {
    const { app, store, entry, fm } = makeEnv();
    const res = await workIssue(app, store, entry, { agent: "claude" });
    expect(fm.agent).toBe("claude");
    expect(fm.agent_session).toBeUndefined();
    expect(res.registration).toEqual({ agent: "claude" });
  });

  it("does not write agent fields when args are empty", async () => {
    const { app, store, entry, fm } = makeEnv();
    await workIssue(app, store, entry, { agent: "", agentSession: "" });
    expect(fm.agent).toBeUndefined();
    expect(fm.agent_session).toBeUndefined();
  });
});
