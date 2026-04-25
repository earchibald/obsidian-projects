import { describe, it, expect } from "vitest";
import {
  findIssueById,
  resolveUriArgs,
  handleOpWorkUri,
  handleOpAppendCommitUri,
  handleOpSetPrUri,
  handleOpSetScopeUri,
  handleOpSetSectionUri,
  handleOpSetEvaluationUri,
  handleOpSetFlowUri,
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
    workIssue: async (e, args) => ({
      issueId: e.id,
      path: e.path,
      previousStatus: "open",
      createdTaskPath: "Projects/x/TASKS/OP-1.1 t.md",
      registered: true,
      ...(args?.agent ? { registration: { agent: args.agent } } : {}),
    }),
    appendCommit: async (e, input) => ({
      issueId: e.id,
      path: e.path,
      entry: `${input.sha} ${input.subject}`,
      added: true,
      commits: [`${input.sha} ${input.subject}`],
    }),
    setPr: async (e, url) => ({ issueId: e.id, path: e.path, pr: url }),
    setScope: async (e, _scope, options) => ({
      issueId: e.id,
      path: e.path,
      scope: _scope,
      replaced: true,
      mode: options?.mode ?? "scope",
    }),
    setEvaluation: async (e, evaluation) => ({
      issueId: e.id,
      path: e.path,
      evaluation,
      replaced: true,
    }),
    setSection: async (e, name, content, options) => ({
      issueId: e.id,
      path: e.path,
      section: name as "Plan" | "Notes" | "Summary",
      content,
      replaced: true,
      appended: options?.append === true,
    }),
    setFlow: async (e, input) => ({
      issueId: e.id,
      path: e.path,
      flow: (input.flow ?? null) as any,
      complexity: (input.complexity ?? null) as any,
    }),
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

describe("handleOpSetEvaluationUri", () => {
  it("requires id and evaluation string", async () => {
    await expect(handleOpSetEvaluationUri(makeDeps(), { id: "OP-1" })).rejects.toThrow(
      "op-set-evaluation URI requires id and evaluation",
    );
  });
  it("happy path payload shape", async () => {
    const r = await handleOpSetEvaluationUri(makeDeps(), {
      id: "OP-1",
      evaluation: "some notes",
    });
    expect(r).toMatchObject({
      ok: true,
      command: "op-set-evaluation",
      issueId: "OP-1",
      replaced: true,
    });
  });
});

describe("handleOpSetFlowUri", () => {
  it("requires id", async () => {
    await expect(handleOpSetFlowUri(makeDeps(), {})).rejects.toThrow(
      "op-set-flow URI requires id",
    );
  });
  it("requires at least one of flow or complexity", async () => {
    await expect(handleOpSetFlowUri(makeDeps(), { id: "OP-1" })).rejects.toThrow(
      /flow and\/or complexity/,
    );
  });
  it("accepts valid flow + complexity", async () => {
    const r = await handleOpSetFlowUri(makeDeps(), {
      id: "OP-1",
      flow: "planning",
      complexity: "complex",
    });
    expect(r).toMatchObject({
      ok: true,
      command: "op-set-flow",
      flow: "planning",
      complexity: "complex",
    });
  });
  it("rejects unknown flow value", async () => {
    await expect(handleOpSetFlowUri(makeDeps(), { id: "OP-1", flow: "wat" })).rejects.toThrow(
      /flow must be one of/,
    );
  });
  it("passes 'null' through as null to clear", async () => {
    const r = await handleOpSetFlowUri(makeDeps(), { id: "OP-1", flow: "null" });
    expect(r.flow).toBeUndefined();
  });
});

describe("handleOpSetSectionUri", () => {
  it("requires id, name, content", async () => {
    await expect(handleOpSetSectionUri(makeDeps(), {})).rejects.toThrow(
      "op-set-section URI requires id, name, content",
    );
    await expect(
      handleOpSetSectionUri(makeDeps(), { id: "OP-1", name: "Plan" }),
    ).rejects.toThrow();
  });
  it("rejects name outside Plan|Notes|Summary", async () => {
    await expect(
      handleOpSetSectionUri(makeDeps(), { id: "OP-1", name: "Scope", content: "x" }),
    ).rejects.toThrow(/Plan\|Notes\|Summary/);
  });
  it("happy path payload shape", async () => {
    const r = await handleOpSetSectionUri(makeDeps(), {
      id: "OP-1",
      name: "Plan",
      content: "approach",
    });
    expect(r).toMatchObject({
      ok: true,
      command: "op-set-section",
      issueId: "OP-1",
      section: "Plan",
      replaced: true,
      appended: false,
    });
  });
  it("forwards append=true", async () => {
    const r = await handleOpSetSectionUri(makeDeps(), {
      id: "OP-1",
      name: "Notes",
      content: "### OP-1.1 — done",
      append: "true",
    });
    expect(r).toMatchObject({ section: "Notes", appended: true });
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
    expect(r).toMatchObject({ ok: true, command: "op-set-scope", replaced: true, mode: "scope" });
  });
  it("accepts mode=body and forwards it", async () => {
    const r = await handleOpSetScopeUri(makeDeps(), { id: "OP-1", scope: "x", mode: "body" });
    expect(r).toMatchObject({ ok: true, mode: "body" });
  });
  it("rejects invalid mode", async () => {
    await expect(
      handleOpSetScopeUri(makeDeps(), { id: "OP-1", scope: "x", mode: "wat" }),
    ).rejects.toThrow(/mode must be/);
  });
});
