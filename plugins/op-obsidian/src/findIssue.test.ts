import { describe, it, expect } from "vitest";
import { findIssue, nextIssueNumber } from "./findIssue";
import type { IssueEntry } from "./types";
import type { ProjectInfo } from "./projects";

function issue(id: string, project: string, path: string, status: IssueEntry["status"] = "open"): IssueEntry {
  return {
    path,
    type: "issue",
    id,
    project,
    status,
    title: path.split("/").pop()!.replace(/\.md$/, ""),
    resolvedFolder: path.includes("/RESOLVED ISSUES/"),
  };
}

const entries: IssueEntry[] = [
  issue("OP-1", "obsidian-projects", "Projects/obsidian-projects/ISSUES/OP-1 a.md"),
  issue("OP-2", "obsidian-projects", "Projects/obsidian-projects/RESOLVED ISSUES/OP-2 b.md", "resolved"),
  issue("JB-1", "jira-bases", "Projects/jira-bases/ISSUES/JB-1 c.md"),
];

const projects: ProjectInfo[] = [
  { slug: "obsidian-projects", prefix: "OP", statusPath: "Projects/obsidian-projects/STATUS.md" },
  { slug: "jira-bases", prefix: "JB", statusPath: "Projects/jira-bases/STATUS.md" },
];

function fakeStore(): { issues: () => IssueEntry[] } {
  return { issues: () => entries };
}

describe("findIssue", () => {
  const store = fakeStore() as any;

  it("resolves by full id", () => {
    const r = findIssue(store, { raw: "OP-1", projects });
    expect(r.matches.map((e) => e.id)).toEqual(["OP-1"]);
  });

  it("lowercases id prefix, upcases on match", () => {
    const r = findIssue(store, { raw: "op-2", projects });
    expect(r.matches.map((e) => e.id)).toEqual(["OP-2"]);
  });

  it("returns all project issues for a bare prefix", () => {
    const r = findIssue(store, { raw: "OP", projects });
    expect(r.matches.map((e) => e.id).sort()).toEqual(["OP-1", "OP-2"]);
  });

  it("returns all project issues for a bare slug", () => {
    const r = findIssue(store, { raw: "jira-bases", projects });
    expect(r.matches.map((e) => e.id)).toEqual(["JB-1"]);
  });

  it("resolves prefix + N", () => {
    const r = findIssue(store, { raw: "JB 1", projects });
    expect(r.matches.map((e) => e.id)).toEqual(["JB-1"]);
  });

  it("resolves slug + N", () => {
    const r = findIssue(store, { raw: "obsidian-projects 1", projects });
    expect(r.matches.map((e) => e.id)).toEqual(["OP-1"]);
  });

  it("returns empty for unknown token", () => {
    const r = findIssue(store, { raw: "nope", projects });
    expect(r.matches).toEqual([]);
  });
});

describe("nextIssueNumber", () => {
  const store = fakeStore() as any;

  it("returns max+1 for a project", () => {
    expect(nextIssueNumber(store, "obsidian-projects")).toBe(3);
    expect(nextIssueNumber(store, "jira-bases")).toBe(2);
  });

  it("returns 1 for an empty project", () => {
    expect(nextIssueNumber(store, "ghost")).toBe(1);
  });

  it("does not reuse IDs from resolved issues when ISSUES/ is empty", () => {
    const resolvedOnly: IssueEntry[] = [
      issue("XX-1", "x-proj", "Projects/x-proj/RESOLVED ISSUES/XX-1 a.md", "resolved"),
      issue("XX-2", "x-proj", "Projects/x-proj/RESOLVED ISSUES/XX-2 b.md", "resolved"),
    ];
    const s = { issues: () => resolvedOnly } as any;
    expect(nextIssueNumber(s, "x-proj")).toBe(3);
  });
});
