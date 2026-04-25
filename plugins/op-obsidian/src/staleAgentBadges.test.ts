import { describe, it, expect } from "vitest";
import type { IssueEntry } from "./types";
import { selectStaleAgentBadges } from "./staleAgentBadges";

function entry(over: Partial<IssueEntry>): IssueEntry {
  return {
    path: "x.md",
    type: "issue",
    id: "OP-1",
    project: "obsidian-projects",
    status: "in-progress",
    title: "OP-1 placeholder",
    resolvedFolder: false,
    ...over,
  };
}

describe("selectStaleAgentBadges", () => {
  it("returns issues with agent: set but no live window", () => {
    const issues = [
      entry({ id: "OP-1", agent: "claude" }),
      entry({ id: "OP-2", agent: "gemini" }),
    ];
    const live = new Set(["OP-2"]);
    expect(selectStaleAgentBadges(issues, live).map((e) => e.id)).toEqual(["OP-1"]);
  });

  it("ignores issues without agent: set", () => {
    const issues = [entry({ id: "OP-1" })];
    expect(selectStaleAgentBadges(issues, new Set())).toEqual([]);
  });

  it("skips resolved / wontfix issues even with agent: set", () => {
    const issues = [
      entry({ id: "OP-1", agent: "claude", status: "resolved" }),
      entry({ id: "OP-2", agent: "claude", status: "wontfix" }),
      entry({ id: "OP-3", agent: "claude", resolvedFolder: true }),
    ];
    expect(selectStaleAgentBadges(issues, new Set())).toEqual([]);
  });

  it("returns empty when every agent has a live window", () => {
    const issues = [
      entry({ id: "OP-1", agent: "claude" }),
      entry({ id: "OP-2", agent: "gemini" }),
    ];
    const live = new Set(["OP-1", "OP-2"]);
    expect(selectStaleAgentBadges(issues, live)).toEqual([]);
  });

  it("uses the tmux-window name derived from the issue id", () => {
    // Window names sanitize non-alnum-dash-underscore — id "OP-1" maps to "OP-1"
    // already, so a literal id match is sufficient here. Verifying with a
    // sanitized form documents the expectation explicitly.
    const issues = [entry({ id: "OP-1", agent: "claude" })];
    expect(selectStaleAgentBadges(issues, new Set(["OP-1"]))).toEqual([]);
    expect(selectStaleAgentBadges(issues, new Set(["op-1"]))).toHaveLength(1);
  });
});
