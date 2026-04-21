import { describe, it, expect } from "vitest";
import { sanitizeIssueTitle, issueFilename } from "./sanitize";

describe("sanitizeIssueTitle", () => {
  it("replaces forbidden characters with a single space", () => {
    expect(sanitizeIssueTitle("a#b")).toBe("a b");
    expect(sanitizeIssueTitle("a:b/c?d")).toBe("a b c d");
    expect(sanitizeIssueTitle('a"b<c>d*e|f[g]h^i\\j')).toBe("a b c d e f g h i j");
  });

  it("collapses whitespace runs", () => {
    expect(sanitizeIssueTitle("a   b")).toBe("a b");
    expect(sanitizeIssueTitle("a\t\tb")).toBe("a b");
  });

  it("trims leading/trailing whitespace and periods", () => {
    expect(sanitizeIssueTitle("  hello  ")).toBe("hello");
    expect(sanitizeIssueTitle("...hello...")).toBe("hello");
    expect(sanitizeIssueTitle(" . hello . ")).toBe("hello");
  });

  it("truncates to 80 chars at a word boundary", () => {
    const long = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen";
    const out = sanitizeIssueTitle(long);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.endsWith(" ")).toBe(false);
    expect(long.startsWith(out)).toBe(true);
  });

  it("truncates at hard cut when no word boundary found", () => {
    const solid = "a".repeat(100);
    const out = sanitizeIssueTitle(solid);
    expect(out).toBe("a".repeat(80));
  });

  it("preserves case, hyphens, commas, apostrophes", () => {
    expect(sanitizeIssueTitle("Don't Stop - Believin', Journey")).toBe(
      "Don't Stop - Believin', Journey",
    );
  });

  it("returns empty string for all-forbidden input", () => {
    expect(sanitizeIssueTitle("///???")).toBe("");
  });
});

describe("issueFilename", () => {
  it("joins id and sanitized title with a space", () => {
    expect(issueFilename("OP-22", "Plugin: commands")).toBe("OP-22 Plugin commands.md");
  });

  it("falls back to id-only when title is empty after sanitize", () => {
    expect(issueFilename("OP-22", "///")).toBe("OP-22.md");
    expect(issueFilename("OP-22", "   ")).toBe("OP-22.md");
  });
});
