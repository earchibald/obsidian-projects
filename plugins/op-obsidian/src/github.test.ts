import { describe, expect, it } from "vitest";
import { extractIssueUrl, isAlreadyClosedError } from "./githubPure";

describe("extractIssueUrl", () => {
  it("extracts issue URL from gh output", () => {
    const out = "Creating issue in owner/repo\n\nhttps://github.com/owner/repo/issues/42\n";
    expect(extractIssueUrl(out)).toBe("https://github.com/owner/repo/issues/42");
  });

  it("returns undefined when no URL present", () => {
    expect(extractIssueUrl("nothing here")).toBeUndefined();
  });

  it("ignores pull URLs", () => {
    expect(extractIssueUrl("https://github.com/o/r/pull/9")).toBeUndefined();
  });
});

describe("isAlreadyClosedError", () => {
  it("matches gh's closeIssue already-closed error", () => {
    expect(
      isAlreadyClosedError("GraphQL: Could not close the issue. (closeIssue)"),
    ).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAlreadyClosedError("could not close the issue")).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isAlreadyClosedError("HTTP 401: Bad credentials")).toBe(false);
    expect(isAlreadyClosedError("")).toBe(false);
  });
});
