import { describe, it, expect, vi } from "vitest";
import type { IssueEntry } from "./types";

vi.mock("obsidian", () => ({
  ItemView: class {},
  TFile: class {},
  WorkspaceLeaf: class {},
  setIcon: () => {},
  setTooltip: () => {},
  prepareFuzzySearch: () => () => null,
}));

import { filterEntries } from "./sidebarView";

function entry(over: Partial<IssueEntry>): IssueEntry {
  return {
    path: "x.md",
    type: "issue",
    id: "OP-1",
    project: "obsidian-projects",
    status: "open",
    title: "OP-1 placeholder",
    resolvedFolder: false,
    ...over,
  };
}

const subseqMatcher = (q: string) => (text: string) => {
  const lq = q.toLowerCase();
  const lt = text.toLowerCase();
  let i = 0;
  for (const ch of lt) {
    if (ch === lq[i]) i++;
    if (i === lq.length) return { score: -1, matches: [] };
  }
  return null;
};

describe("filterEntries", () => {
  const items = [
    entry({ id: "OP-1", title: "OP-1 sidebar fuzzy filter" }),
    entry({ id: "OP-2", title: "OP-2 settings tab cleanup" }),
    entry({ id: "JB-9", title: "JB-9 link escaping", project: "jira-bases" }),
  ];

  it("returns all entries when query is empty", () => {
    expect(filterEntries(items, "", subseqMatcher)).toHaveLength(3);
    expect(filterEntries(items, "   ", subseqMatcher)).toHaveLength(3);
  });

  it("filters to fuzzy-matching entries by title", () => {
    const out = filterEntries(items, "filter", subseqMatcher);
    expect(out.map((e) => e.id)).toEqual(["OP-1"]);
  });

  it("matches against id", () => {
    const out = filterEntries(items, "jb9", subseqMatcher);
    expect(out.map((e) => e.id)).toEqual(["JB-9"]);
  });

  it("matches against project slug", () => {
    const out = filterEntries(items, "jira", subseqMatcher);
    expect(out.map((e) => e.id)).toEqual(["JB-9"]);
  });

  it("returns empty when nothing matches", () => {
    expect(filterEntries(items, "zzznotpresent", subseqMatcher)).toEqual([]);
  });

  it("preserves input order", () => {
    const out = filterEntries(items, "op", subseqMatcher);
    expect(out.map((e) => e.id)).toEqual(["OP-1", "OP-2"]);
  });
});
