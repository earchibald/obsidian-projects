import { describe, it, expect } from "vitest";
import {
  parseScopeTextarea,
  validateNewIssueInput,
  validateScaffoldInput,
  validateWorkingDirInput,
  validateSha,
  validateSubject,
  validatePrUrl,
  validateGithubIssueUrl,
} from "./modalValidation";

describe("parseScopeTextarea", () => {
  it("returns empty array for empty/whitespace input", () => {
    expect(parseScopeTextarea("")).toEqual([]);
    expect(parseScopeTextarea("   \n  \n")).toEqual([]);
  });

  it("strips leading '- ' and '* ' bullets and trims", () => {
    const raw = "- one\n  * two\n   three  \n-    four";
    expect(parseScopeTextarea(raw)).toEqual(["one", "two", "three", "four"]);
  });

  it("drops blank lines", () => {
    expect(parseScopeTextarea("a\n\nb\n\n")).toEqual(["a", "b"]);
  });
});

describe("validateNewIssueInput", () => {
  it("rejects empty/whitespace title", () => {
    for (const title of ["", "   "]) {
      const r = validateNewIssueInput({ title, scopeRaw: "", githubIssue: "", priority: "med" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/title/i);
    }
  });

  it("trims title, parses scope, omits empty githubIssue", () => {
    const r = validateNewIssueInput({
      title: "  my title  ",
      scopeRaw: "- a\n- b",
      githubIssue: "",
      priority: "high",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        title: "my title",
        scope: ["a", "b"],
        githubIssue: undefined,
        priority: "high",
      });
    }
  });

  it("rejects non-http(s) githubIssue URL", () => {
    const r = validateNewIssueInput({
      title: "t",
      scopeRaw: "",
      githubIssue: "github.com/o/r/issues/1",
      priority: "med",
    });
    expect(r.ok).toBe(false);
  });

  it("accepts http and https githubIssue URLs", () => {
    for (const u of ["http://a/b", "HTTPS://a/b"]) {
      const r = validateNewIssueInput({ title: "t", scopeRaw: "", githubIssue: u, priority: "med" });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.githubIssue).toBe(u);
    }
  });
});

describe("validateScaffoldInput", () => {
  it("requires slug and prefix", () => {
    expect(
      validateScaffoldInput({ slug: "", prefix: "MP", repoPath: "", seedTitle: "", seedPriority: "med" }).ok,
    ).toBe(false);
    expect(
      validateScaffoldInput({ slug: "mp", prefix: "", repoPath: "", seedTitle: "", seedPriority: "med" }).ok,
    ).toBe(false);
    expect(
      validateScaffoldInput({ slug: "   ", prefix: "MP", repoPath: "", seedTitle: "", seedPriority: "med" }).ok,
    ).toBe(false);
  });

  it("rejects relative repoPath", () => {
    const r = validateScaffoldInput({
      slug: "mp",
      prefix: "MP",
      repoPath: "Projects/mp",
      seedTitle: "",
      seedPriority: "med",
    });
    expect(r.ok).toBe(false);
  });

  it("trims fields; omits optional empties; drops seedPriority when no seedTitle", () => {
    const r = validateScaffoldInput({
      slug: "  mp  ",
      prefix: "  MP  ",
      repoPath: "  /abs/mp  ",
      seedTitle: "",
      seedPriority: "high",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        slug: "mp",
        prefix: "MP",
        repoPath: "/abs/mp",
        seedTitle: undefined,
        seedPriority: undefined,
      });
    }
  });

  it("keeps seedPriority when seedTitle present", () => {
    const r = validateScaffoldInput({
      slug: "mp",
      prefix: "MP",
      repoPath: "",
      seedTitle: "first",
      seedPriority: "low",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.seedTitle).toBe("first");
      expect(r.value.seedPriority).toBe("low");
      expect(r.value.repoPath).toBeUndefined();
    }
  });
});

describe("validateWorkingDirInput", () => {
  it("rejects empty/whitespace", () => {
    expect(validateWorkingDirInput("").ok).toBe(false);
    expect(validateWorkingDirInput("   ").ok).toBe(false);
  });
  it("trims and accepts", () => {
    const r = validateWorkingDirInput("  /abs/path  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("/abs/path");
  });
});

describe("validateSha / validateSubject", () => {
  it("rejects empty", () => {
    expect(validateSha("").ok).toBe(false);
    expect(validateSubject("  ").ok).toBe(false);
  });
  it("accepts trimmed non-empty", () => {
    const s = validateSha(" abc1234 ");
    const j = validateSubject(" fix: x ");
    expect(s.ok && s.value).toBe("abc1234");
    expect(j.ok && j.value).toBe("fix: x");
  });
});

describe("validatePrUrl / validateGithubIssueUrl", () => {
  it("requires http(s):// prefix", () => {
    for (const bad of ["", "github.com/o/r/pull/1", "ftp://x", "//x"]) {
      expect(validatePrUrl(bad).ok).toBe(false);
      expect(validateGithubIssueUrl(bad).ok).toBe(false);
    }
  });
  it("accepts http/https case-insensitive and trims", () => {
    for (const u of ["http://x/y", "HTTPS://x/y", "  https://x  "]) {
      const r = validatePrUrl(u);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(u.trim());
    }
  });
});
