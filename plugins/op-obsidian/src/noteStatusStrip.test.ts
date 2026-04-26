import { describe, expect, it } from "vitest";
import {
  composeStripSegments,
  formatSegment,
  GH_STATE_TTL_MS,
  parseGithubNumber,
  parseLatestCommit,
  readGhCache,
  writeGhCache,
  type GhStateCache,
} from "./noteStatusStrip";

describe("parseLatestCommit", () => {
  it("returns null for empty / missing", () => {
    expect(parseLatestCommit(undefined)).toBeNull();
    expect(parseLatestCommit([])).toBeNull();
  });

  it("splits the latest entry on the first space", () => {
    expect(parseLatestCommit(["abc1234 first commit", "def5678 latest commit"]))
      .toEqual({ sha: "def5678", subject: "latest commit" });
  });

  it("handles a sha without a subject", () => {
    expect(parseLatestCommit(["abc1234"])).toEqual({ sha: "abc1234", subject: "" });
  });

  it("ignores blank entries at the tail", () => {
    expect(parseLatestCommit(["abc1234 ok", "   "])).toBeNull();
  });

  it("preserves multi-word subjects", () => {
    expect(parseLatestCommit(["abc1234 fix: collapse rewriteScopeSection"]))
      .toEqual({ sha: "abc1234", subject: "fix: collapse rewriteScopeSection" });
  });
});

describe("parseGithubNumber", () => {
  it("extracts the trailing number", () => {
    expect(parseGithubNumber("https://github.com/x/y/issues/153")).toBe(153);
    expect(parseGithubNumber("https://github.com/x/y/pull/42")).toBe(42);
  });

  it("returns null for non-numeric tails", () => {
    expect(parseGithubNumber("https://github.com/x/y/pulls")).toBeNull();
    expect(parseGithubNumber(undefined)).toBeNull();
    expect(parseGithubNumber("")).toBeNull();
  });

  it("tolerates trailing slash / hash / query", () => {
    expect(parseGithubNumber("https://github.com/x/y/issues/7/")).toBe(7);
    expect(parseGithubNumber("https://github.com/x/y/issues/7#comment")).toBe(7);
    expect(parseGithubNumber("https://github.com/x/y/issues/7?ref=abc")).toBe(7);
  });
});

describe("gh cache", () => {
  it("returns null on miss", () => {
    const c: GhStateCache = new Map();
    expect(readGhCache(c, "u", 0)).toBeNull();
  });

  it("returns null when expired", () => {
    const c: GhStateCache = new Map();
    writeGhCache(c, "u", "OPEN", 0, 100);
    expect(readGhCache(c, "u", 99)?.state).toBe("OPEN");
    expect(readGhCache(c, "u", 100)).toBeNull();
  });

  it("default TTL is 60s", () => {
    expect(GH_STATE_TTL_MS).toBe(60_000);
  });

  it("preserves null state (negative caching)", () => {
    const c: GhStateCache = new Map();
    writeGhCache(c, "u", null, 0);
    expect(readGhCache(c, "u", 1)?.state).toBeNull();
  });
});

describe("composeStripSegments", () => {
  it("returns empty for empty frontmatter", () => {
    expect(composeStripSegments(undefined, new Map(), 0)).toEqual([]);
    expect(composeStripSegments({}, new Map(), 0)).toEqual([]);
  });

  it("emits commit + pr + gh issue when all present", () => {
    const cache: GhStateCache = new Map();
    writeGhCache(cache, "https://github.com/x/y/pull/42", "MERGED", 0);
    writeGhCache(cache, "https://github.com/x/y/issues/7", "OPEN", 0);
    const segs = composeStripSegments(
      {
        commits: ["abc1234 sub"],
        pr: "https://github.com/x/y/pull/42",
        githubIssue: "https://github.com/x/y/issues/7",
      },
      cache,
      0,
    );
    expect(segs.map((s) => s.kind)).toEqual(["commit", "pr", "issue"]);
    expect(segs[1]).toMatchObject({ kind: "pr", number: 42, state: "MERGED", pending: false });
    expect(segs[2]).toMatchObject({ kind: "issue", number: 7, state: "OPEN", pending: false });
  });

  it("marks pr/issue segments pending when cache misses", () => {
    const segs = composeStripSegments(
      { pr: "https://github.com/x/y/pull/42" },
      new Map(),
      0,
    );
    expect(segs[0]).toMatchObject({ kind: "pr", pending: true, state: null });
  });

  it("trims whitespace-only urls (no dead segments)", () => {
    const segs = composeStripSegments(
      { pr: "   ", githubIssue: "https://github.com/x/y/issues/1" },
      new Map(),
      0,
    );
    expect(segs.map((s) => s.kind)).toEqual(["issue"]);
  });
});

describe("formatSegment", () => {
  it("renders commit with quoted subject", () => {
    expect(
      formatSegment({ kind: "commit", sha: "abc1234", subject: "fix things" }),
    ).toBe('last commit: abc1234 "fix things"');
  });

  it("truncates long subjects", () => {
    const long = "x".repeat(60);
    expect(
      formatSegment({ kind: "commit", sha: "abc1234", subject: long }),
    ).toContain("…");
  });

  it("renders pr/issue with state", () => {
    expect(
      formatSegment({
        kind: "pr",
        url: "u",
        number: 42,
        state: "OPEN",
        pending: false,
      }),
    ).toBe("PR #42 (open)");
    expect(
      formatSegment({
        kind: "issue",
        url: "u",
        number: 7,
        state: "CLOSED",
        pending: false,
      }),
    ).toBe("GH #7 (closed)");
  });

  it("renders pending segments with ellipsis", () => {
    expect(
      formatSegment({ kind: "pr", url: "u", number: 42, state: null, pending: true }),
    ).toBe("PR #42 (…)");
  });
});
