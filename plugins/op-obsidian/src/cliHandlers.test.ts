import { describe, it, expect } from "vitest";
import {
  parseWorkParams,
  parseAppendCommitParams,
  parseSetPrParams,
  parseSetScopeParams,
  parseNewParams,
  parseScaffoldParams,
} from "./cliHandlers";

describe("parseWorkParams", () => {
  it("rejects missing id", () => {
    const r = parseWorkParams({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--issue/);
  });
  it("issue beats id alias and both accepted", () => {
    const a = parseWorkParams({ issue: "OP-1" });
    const b = parseWorkParams({ id: "OP-2" });
    const c = parseWorkParams({ issue: "OP-3", id: "OP-4" });
    expect(a.ok && a.value.id).toBe("OP-1");
    expect(b.ok && b.value.id).toBe("OP-2");
    expect(c.ok && c.value.id).toBe("OP-3");
  });
});

describe("parseAppendCommitParams", () => {
  it("requires id, sha, subject", () => {
    expect(parseAppendCommitParams({}).ok).toBe(false);
    expect(parseAppendCommitParams({ id: "OP-1" }).ok).toBe(false);
    expect(parseAppendCommitParams({ id: "OP-1", sha: "a" }).ok).toBe(false);
  });
  it("happy path", () => {
    const r = parseAppendCommitParams({ id: "OP-1", sha: "abc", subject: "fix" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ id: "OP-1", sha: "abc", subject: "fix" });
  });
});

describe("parseSetPrParams", () => {
  it("requires id and url (pr alias works)", () => {
    expect(parseSetPrParams({}).ok).toBe(false);
    expect(parseSetPrParams({ id: "OP-1" }).ok).toBe(false);
    const r = parseSetPrParams({ id: "OP-1", pr: "https://x" });
    expect(r.ok && r.value.url).toBe("https://x");
  });
});

describe("parseSetScopeParams", () => {
  it("requires id and scope string", () => {
    expect(parseSetScopeParams({ id: "OP-1" }).ok).toBe(false);
    const r = parseSetScopeParams({ id: "OP-1", scope: "" });
    expect(r.ok && r.value.scope).toBe("");
  });
});

describe("parseNewParams", () => {
  it("requires project (or slug alias) and title", () => {
    expect(parseNewParams({}).ok).toBe(false);
    expect(parseNewParams({ slug: "x" }).ok).toBe(false);
    const r = parseNewParams({ slug: "x", title: "t" });
    expect(r.ok && r.value).toEqual({ slug: "x", title: "t", priority: "med" });
  });
  it("accepts priority override", () => {
    const r = parseNewParams({ project: "x", title: "t", priority: "high" });
    expect(r.ok && r.value.priority).toBe("high");
  });
});

describe("parseScaffoldParams", () => {
  it("requires slug and prefix separately", () => {
    expect(parseScaffoldParams({}).ok).toBe(false);
    expect(parseScaffoldParams({ slug: "mp" }).ok).toBe(false);
    const r = parseScaffoldParams({ slug: "mp", prefix: "MP" });
    expect(r.ok && r.value).toEqual({ slug: "mp", prefix: "MP" });
  });
});
