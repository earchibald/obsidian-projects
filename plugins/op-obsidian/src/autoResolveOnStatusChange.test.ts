import { describe, expect, it } from "vitest";
import { shouldAutoResolve, _test } from "./autoResolveOnStatusChange";
import type { IssueEntry, IssueStatus, LifecycleEvent } from "./types";

const makeEntry = _test.makeIssueEntry;

function statusEvent(
  entry: Partial<IssueEntry> & Pick<IssueEntry, "path" | "status">,
  prev: IssueStatus,
): LifecycleEvent {
  return { kind: "issue:status-changed", entry: makeEntry(entry), prev };
}

describe("shouldAutoResolve", () => {
  it("returns args when terminal, not agent-owned, still in ISSUES/, not suppressed", () => {
    const ev = statusEvent({ path: "Projects/x/ISSUES/X-1.md", status: "resolved" }, "in-progress");
    expect(shouldAutoResolve(ev, new Set())).toEqual({
      path: "Projects/x/ISSUES/X-1.md",
      status: "resolved",
    });
  });

  it("returns args when terminal=wontfix", () => {
    const ev = statusEvent({ path: "Projects/x/ISSUES/X-2.md", status: "wontfix" }, "open");
    expect(shouldAutoResolve(ev, new Set())).toEqual({
      path: "Projects/x/ISSUES/X-2.md",
      status: "wontfix",
    });
  });

  it("returns null when agent is set", () => {
    const ev = statusEvent(
      { path: "Projects/x/ISSUES/X-3.md", status: "resolved", agent: "claude" },
      "in-progress",
    );
    expect(shouldAutoResolve(ev, new Set())).toBeNull();
  });

  it("returns null when already in RESOLVED ISSUES/", () => {
    const ev = statusEvent(
      { path: "Projects/x/RESOLVED ISSUES/X-4.md", status: "resolved", resolvedFolder: true },
      "in-progress",
    );
    expect(shouldAutoResolve(ev, new Set())).toBeNull();
  });

  it("returns null when prev is already terminal", () => {
    const ev = statusEvent({ path: "Projects/x/ISSUES/X-5.md", status: "resolved" }, "wontfix");
    expect(shouldAutoResolve(ev, new Set())).toBeNull();
  });

  it("returns null when path is in the in-flight suppression set", () => {
    const path = "Projects/x/ISSUES/X-6.md";
    const ev = statusEvent({ path, status: "resolved" }, "in-progress");
    expect(shouldAutoResolve(ev, new Set([path]))).toBeNull();
  });

  it("returns null when next status is non-terminal", () => {
    const ev = statusEvent({ path: "Projects/x/ISSUES/X-7.md", status: "in-progress" }, "open");
    expect(shouldAutoResolve(ev, new Set())).toBeNull();
  });

  it("returns null for non-status-changed events", () => {
    const ev = {
      kind: "issue:updated",
      entry: makeEntry({ path: "Projects/x/ISSUES/X-8.md", status: "resolved" }),
      prev: makeEntry({ path: "Projects/x/ISSUES/X-8.md", status: "open" }),
    } as LifecycleEvent;
    expect(shouldAutoResolve(ev, new Set())).toBeNull();
  });

  it("treats whitespace-only agent as unset", () => {
    const ev = statusEvent(
      { path: "Projects/x/ISSUES/X-9.md", status: "resolved", agent: "   " },
      "in-progress",
    );
    expect(shouldAutoResolve(ev, new Set())).not.toBeNull();
  });
});
