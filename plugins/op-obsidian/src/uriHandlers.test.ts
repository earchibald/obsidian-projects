import { describe, it, expect } from "vitest";
import {
  findIssueById,
  resolveUriArgs,
  handleOpWorkUri,
  handleOpAppendCommitUri,
  handleOpSetPrUri,
  handleOpSetScopeUri,
  type UriHandlerDeps,
} from "./uriHandlers";
import type { IssueEntry } from "./types";

function issue(id: string): IssueEntry {
  return {
    path: `Projects/x/ISSUES/${id} t.md`,
    type: "issue",
    id,
    project: "x",
    status: "open",
    title: "t",
    resolvedFolder: false,
  };
}

function makeDeps(overrides: Partial<UriHandlerDeps> = {}): UriHandlerDeps {
  const entry = issue("OP-1");
  const store = { issues: () => [entry] };
  return {
    store,
    workIssue: async (e) => ({
      issueId: e.id,
      path: e.path,
      previousStatus: "open",
      createdTaskPath: "Projects/x/TASKS/OP-1.1 t.md",
    }),
    appendCommit: async (e, input) => ({
      issueId: e.id,
      path: e.path,
      entry: `${input.sha} ${input.subject}`,
      added: true,
      commits: [`${input.sha} ${input.subject}`],
    }),
    setPr: async (e, url) => ({ issueId: e.id, path: e.path, pr: url }),
    setScope: async (e, _scope) => ({ issueId: e.id, path: e.path, replaced: true }),
    ...overrides,
  };
}

describe("findIssueById", () => {
  it("returns matching entry", () => {
    const e = issue("OP-1");
    expect(findIssueById({ issues: () => [e] }, "OP-1")).toBe(e);
  });
  it("throws documented error on miss", () => {
    expect(() => findIssueById({ issues: () => [] }, "OP-9")).toThrow("Issue not found: OP-9");
  });
});

describe("resolveUriArgs", () => {
  it("maps status=wontfix|resolved, else undefined", () => {
    expect(resolveUriArgs({ status: "wontfix" }).status).toBe("wontfix");
    expect(resolveUriArgs({ status: "resolved" }).status).toBe("resolved");
    expect(resolveUriArgs({ status: "other" }).status).toBeUndefined();
    expect(resolveUriArgs({}).status).toBeUndefined();
  });
  it("confirmed=1|true, else false", () => {
    expect(resolveUriArgs({ confirmed: "1" }).confirmed).toBe(true);
    expect(resolveUriArgs({ confirmed: "true" }).confirmed).toBe(true);
    expect(resolveUriArgs({ confirmed: "yes" }).confirmed).toBe(false);
    expect(resolveUriArgs({}).confirmed).toBe(false);
  });
  it("issue beats id; path and id both carried", () => {
    expect(resolveUriArgs({ issue: "A", id: "B" }).issue).toBe("A");
    expect(resolveUriArgs({ id: "B" }).issue).toBe("B");
    expect(resolveUriArgs({ path: "foo.md" }).path).toBe("foo.md");
  });
});

describe("handleOpWorkUri", () => {
  it("requires id", async () => {
    await expect(handleOpWorkUri(makeDeps(), {})).rejects.toThrow("op-work URI requires id");
  });
  it("id alias resolves", async () => {
    const r = await handleOpWorkUri(makeDeps(), { id: "OP-1" });
    expect(r).toMatchObject({ ok: true, command: "op-work", issueId: "OP-1" });
  });
  it("issue alias resolves", async () => {
    const r = await handleOpWorkUri(makeDeps(), { issue: "OP-1" });
    expect(r.issueId).toBe("OP-1");
  });
  it("unknown id → Issue not found", async () => {
    await expect(handleOpWorkUri(makeDeps(), { id: "OP-99" })).rejects.toThrow(
      "Issue not found: OP-99",
    );
  });
});

describe("handleOpAppendCommitUri", () => {
  it("requires id, sha, subject", async () => {
    const d = makeDeps();
    await expect(handleOpAppendCommitUri(d, {})).rejects.toThrow(
      "op-append-commit URI requires id, sha, subject",
    );
    await expect(handleOpAppendCommitUri(d, { id: "OP-1" })).rejects.toThrow();
    await expect(handleOpAppendCommitUri(d, { id: "OP-1", sha: "a" })).rejects.toThrow();
  });
  it("happy path payload shape", async () => {
    const r = await handleOpAppendCommitUri(makeDeps(), {
      id: "OP-1",
      sha: "abc1234",
      subject: "fix",
    });
    expect(r).toMatchObject({
      ok: true,
      command: "op-append-commit",
      issueId: "OP-1",
      added: true,
      entry: "abc1234 fix",
    });
  });
});

describe("handleOpSetPrUri", () => {
  it("requires id and url", async () => {
    await expect(handleOpSetPrUri(makeDeps(), { id: "OP-1" })).rejects.toThrow(
      "op-set-pr URI requires id and url",
    );
    await expect(handleOpSetPrUri(makeDeps(), { url: "x" })).rejects.toThrow();
  });
  it("accepts pr alias for url", async () => {
    const r = await handleOpSetPrUri(makeDeps(), { id: "OP-1", pr: "https://x/y/pull/1" });
    expect(r).toMatchObject({ ok: true, pr: "https://x/y/pull/1" });
  });
});

describe("handleOpSetScopeUri", () => {
  it("requires id and scope (string)", async () => {
    await expect(handleOpSetScopeUri(makeDeps(), { id: "OP-1" })).rejects.toThrow(
      "op-set-scope URI requires id and scope",
    );
  });
  it("accepts empty scope string (replace-all semantics)", async () => {
    const r = await handleOpSetScopeUri(makeDeps(), { id: "OP-1", scope: "" });
    expect(r).toMatchObject({ ok: true, command: "op-set-scope", replaced: true });
  });
});
