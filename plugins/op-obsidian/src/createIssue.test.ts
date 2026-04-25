import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => {
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  return {
    TFile,
    normalizePath: (p: string) => p,
  };
});

import {
  renderIssueNote,
  PLAN_PLACEHOLDER,
  INITIAL_EVAL_PLACEHOLDER,
  NOTES_PLACEHOLDER,
  SUMMARY_PLACEHOLDER,
} from "./issueTemplate";
import { createIssue } from "./createIssue";
import { TFile } from "obsidian";

function render(overrides: Partial<Parameters<typeof renderIssueNote>[0]> = {}) {
  return renderIssueNote({
    id: "OP-1",
    project: "demo",
    title: "Test",
    priority: "med",
    scope: [],
    assignee: "me",
    ...overrides,
  });
}

describe("renderIssueNote", () => {
  it("emits all sections with placeholders (no scope bullets — Scope header still present)", () => {
    const out = render();
    expect(out).toContain("\n## Scope\n");
    expect(out).toContain("\n## Plan\n");
    expect(out).toContain("\n## Initial Evaluation\n");
    expect(out).toContain("\n## Tasks\n");
    expect(out).toContain("\n## Notes\n");
    expect(out).toContain("\n## Summary\n");
    expect(out).toContain(PLAN_PLACEHOLDER);
    expect(out).toContain(INITIAL_EVAL_PLACEHOLDER);
    expect(out).toContain(NOTES_PLACEHOLDER);
    expect(out).toContain(SUMMARY_PLACEHOLDER);
    expect(out).not.toContain("- [ ]");
  });

  it("includes Scope when bullets supplied", () => {
    const out = render({ scope: ["one", "two"] });
    expect(out).toContain("\n## Scope\n");
    expect(out).toContain("- [ ] one");
    expect(out).toContain("- [ ] two");
  });

  it("heading order is Scope → Plan → Initial Evaluation → Tasks → Notes → Summary", () => {
    const out = render({ scope: ["a"] });
    const body = out.slice(out.indexOf("# Test"));
    const order = [
      "## Scope",
      "## Plan",
      "## Initial Evaluation",
      "## Tasks",
      "## Notes",
      "## Summary",
    ].map((h) => body.indexOf(h));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("exact placeholder strings match the module constants", () => {
    expect(PLAN_PLACEHOLDER).toBe(
      "_To be written at /op:issue time — approach, key decisions, files to touch._",
    );
    expect(INITIAL_EVAL_PLACEHOLDER).toBe(
      "_Filled by the evaluator agent — what's being asked, complexity, where it lands, open questions._",
    );
    expect(NOTES_PLACEHOLDER).toBe(
      "_Filled as work progresses; one ### <ID>.<N> block per task._",
    );
    expect(SUMMARY_PLACEHOLDER).toBe(
      "_Written at /op:resolve time — what shipped, key commits, follow-ups._",
    );
  });

  it("scopeBody renders verbatim under ## Scope (no - [ ] wrapping)", () => {
    const out = render({
      scope: [],
      // @ts-expect-error — exercise the new field
      scopeBody: "Para one.\n\n- a sub-bullet\n- another",
    });
    expect(out).toContain("\n## Scope\n\nPara one.\n\n- a sub-bullet\n- another\n");
    expect(out).not.toContain("- [ ] Para one");
  });

  it("scopeBody takes precedence over bullets when both supplied", () => {
    const out = render({
      scope: ["bullet"],
      // @ts-expect-error — exercise the new field
      scopeBody: "verbatim text",
    });
    expect(out).toContain("\n## Scope\n\nverbatim text\n");
    expect(out).not.toContain("- [ ] bullet");
  });

  it("Plan/Initial Evaluation/Notes/Summary appear even when no scope is supplied", () => {
    const out = render({ scope: [] });
    const planIdx = out.indexOf("## Plan");
    const evalIdx = out.indexOf("## Initial Evaluation");
    const tasksIdx = out.indexOf("## Tasks");
    const notesIdx = out.indexOf("## Notes");
    const summaryIdx = out.indexOf("## Summary");
    expect(planIdx).toBeGreaterThan(0);
    expect(evalIdx).toBeGreaterThan(planIdx);
    expect(tasksIdx).toBeGreaterThan(evalIdx);
    expect(notesIdx).toBeGreaterThan(tasksIdx);
    expect(summaryIdx).toBeGreaterThan(notesIdx);
  });
});

function fakeApp(slug: string, prefix: string) {
  // Stand-in for an Obsidian STATUS.md TFile.
  const statusFile = Object.assign(new TFile(), {
    path: `Projects/${slug}/STATUS.md`,
    basename: "STATUS",
    name: "STATUS.md",
  });
  const folders = new Set<string>();
  const created: Array<{ path: string; content: string; file: TFile }> = [];

  const app = {
    vault: {
      getMarkdownFiles: () => [statusFile],
      getAbstractFileByPath: (p: string) => {
        if (folders.has(p)) return { children: [] };
        const hit = created.find((c) => c.path === p);
        return hit ? hit.file : null;
      },
      createFolder: async (p: string) => {
        folders.add(p);
      },
      create: async (path: string, content: string) => {
        const basename = path.split("/").pop()!.replace(/\.md$/, "");
        const file = Object.assign(new TFile(), {
          path,
          basename,
          name: `${basename}.md`,
        });
        created.push({ path, content, file });
        return file;
      },
    },
    metadataCache: {
      getFileCache: (f: TFile) =>
        f === statusFile
          ? { frontmatter: { type: "project-status", prefix } }
          : null,
    },
  };

  return { app: app as any, store: { issues: () => [] } as any, created };
}

describe("createIssue", () => {
  it("returns a populated IssueEntry that mirrors the created file", async () => {
    const { app, store } = fakeApp("demo", "DM");
    const result = await createIssue(app, store, {
      slug: "demo",
      title: "smoke test",
      priority: "high",
      assignee: "alice",
    });

    expect(result.entry).toBeDefined();
    expect(result.entry.path).toBe(result.path);
    expect(result.entry.id).toBe(result.id);
    expect(result.entry.type).toBe("issue");
    expect(result.entry.status).toBe("open");
    expect(result.entry.project).toBe("demo");
    expect(result.entry.priority).toBe("high");
    expect(result.entry.assignee).toBe("alice");
    expect(result.entry.title).toBe(result.file.basename);
    expect(result.entry.resolvedFolder).toBe(false);
    expect(result.entry.githubIssue).toBeUndefined();
  });

  it("falls back to default priority and assignee when omitted", async () => {
    const { app, store } = fakeApp("demo", "DM");
    const result = await createIssue(app, store, {
      slug: "demo",
      title: "defaults",
    });
    expect(result.entry.priority).toBe("med");
    expect(result.entry.assignee).toBe("earchibald");
  });
});
