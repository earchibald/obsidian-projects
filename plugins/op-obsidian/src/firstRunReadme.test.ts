import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  TFile: class {},
  normalizePath: (p: string) => p,
}));

import {
  buildDemoIssueNote,
  buildReadmeBody,
  DEMO_ISSUES,
  parseOpActionBlock,
  scaffoldFirstRunReadme,
  shouldScaffoldReadme,
  type ReadmeWriter,
} from "./firstRunReadme";

describe("buildReadmeBody", () => {
  it("includes the Apply preset and Start tour codeblocks", () => {
    const body = buildReadmeBody();
    expect(body).toContain("```op-action");
    expect(body).toMatch(/action:\s*op-apply-preset/);
    expect(body).toMatch(/label:\s*Apply preset/);
    expect(body).toMatch(/action:\s*op-start-tour/);
    expect(body).toMatch(/label:\s*Start tour/);
  });

  it("starts with an H1", () => {
    expect(buildReadmeBody().startsWith("# ")).toBe(true);
  });

  it("links to the workflow-modules docs (OP-211)", () => {
    const body = buildReadmeBody();
    expect(body).toContain("## Workflow modules");
    expect(body).toContain(
      "https://github.com/earchibald/obsidian-projects/blob/main/docs/workflow-modules/01-overview.md",
    );
    expect(body).toContain(
      "https://github.com/earchibald/obsidian-projects/blob/main/docs/workflow-modules/02-quickstart.md",
    );
  });
});

describe("DEMO_ISSUES", () => {
  it("has exactly three pre-seeded issues", () => {
    expect(DEMO_ISSUES.length).toBe(3);
    expect(DEMO_ISSUES.map((s) => s.number)).toEqual([1, 2, 3]);
  });

  it("renders an issue note with valid frontmatter", () => {
    const note = buildDemoIssueNote(DEMO_ISSUES[0]);
    expect(note).toContain("id: DEMO-1");
    expect(note).toContain("type: issue");
    expect(note).toContain("status: open");
    expect(note).toContain("project: op-demo");
  });
});

describe("shouldScaffoldReadme", () => {
  it("scaffolds when flag is false and file is absent", () => {
    expect(shouldScaffoldReadme({ firstRunCompleted: false }, false)).toBe(true);
  });

  it("skips when flag is already flipped", () => {
    expect(shouldScaffoldReadme({ firstRunCompleted: true }, false)).toBe(false);
  });

  it("skips when the README already exists (manual-delete dismissal is durable)", () => {
    expect(shouldScaffoldReadme({ firstRunCompleted: false }, true)).toBe(false);
  });
});

describe("scaffoldFirstRunReadme", () => {
  function makeWriter(): {
    writer: ReadmeWriter;
    written: Map<string, string>;
  } {
    const written = new Map<string, string>();
    const writer: ReadmeWriter = {
      exists: (p) => written.has(p),
      write: async (p, c) => {
        written.set(p, c);
      },
    };
    return { writer, written };
  }

  it("writes the README and flips the flag on first run", async () => {
    const settings = { firstRunCompleted: false };
    const { writer, written } = makeWriter();
    let saved = false;
    const result = await scaffoldFirstRunReadme(settings, writer, async () => {
      saved = true;
    });
    expect(result.scaffolded).toBe(true);
    expect(written.get(result.readmePath)).toContain("# Welcome to op");
    expect(settings.firstRunCompleted).toBe(true);
    expect(saved).toBe(true);
  });

  it("is a no-op on the second call (idempotent)", async () => {
    const settings = { firstRunCompleted: true };
    const { writer, written } = makeWriter();
    const result = await scaffoldFirstRunReadme(settings, writer, async () => {});
    expect(result.scaffolded).toBe(false);
    expect(written.size).toBe(0);
  });

  it("skips re-writing when the file already exists", async () => {
    const settings = { firstRunCompleted: false };
    const { writer, written } = makeWriter();
    written.set("Projects/_op-readme.md", "user-edited content");
    const result = await scaffoldFirstRunReadme(settings, writer, async () => {});
    expect(result.scaffolded).toBe(false);
    expect(written.get("Projects/_op-readme.md")).toBe("user-edited content");
  });
});

describe("parseOpActionBlock", () => {
  it("parses the canonical shape", () => {
    expect(parseOpActionBlock("action: op-apply-preset\nlabel: Apply preset")).toEqual({
      action: "op-apply-preset",
      label: "Apply preset",
    });
  });

  it("tolerates whitespace + comments", () => {
    expect(
      parseOpActionBlock([
        "# this is a chip",
        "  action:   op-start-tour  ",
        "label: Start the tour",
      ].join("\n")),
    ).toEqual({ action: "op-start-tour", label: "Start the tour" });
  });

  it("returns null when either field is missing", () => {
    expect(parseOpActionBlock("action: op-x")).toBeNull();
    expect(parseOpActionBlock("label: nope")).toBeNull();
    expect(parseOpActionBlock("")).toBeNull();
  });
});
