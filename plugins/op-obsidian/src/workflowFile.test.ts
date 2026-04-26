import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => {
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  return {
    TFile,
    normalizePath: (p: string) => p.replace(/\/+/g, "/").replace(/\/$/g, ""),
  };
});

import { TFile } from "obsidian";
import { loadWorkflowFile, mergeWorkflows, type WorkflowFile } from "./workflowFile";

interface FakeFile {
  path: string;
  raw: string;
  /**
   * Models what `metadataCache.getFileCache(file)?.frontmatter` returns:
   *
   * - `undefined` (default): Obsidian has no cache entry for the file, or the
   *   YAML between fences is empty / parses to a scalar. The IO loader sees
   *   `undefined` for `fmCached`. This is the correct model for shape 1 (no
   *   fence) and shape 5 (empty/null-YAML fence) — the two are distinguished
   *   solely by whether `raw` starts with `---`.
   * - `null`: a non-standard sentinel retained for defensive testing; Obsidian
   *   never returns `null` for `frontmatter` (typed `FrontMatterCache | undefined`),
   *   but the disambiguation code handles it correctly anyway.
   * - A record: simulates a successfully-parsed frontmatter object (the loader
   *   code strips Obsidian's injected `position` key, so it need not be present
   *   in fixtures).
   */
  frontmatter?: Record<string, unknown> | null | undefined;
}

function makeFile(path: string): TFile {
  const basename = path.split("/").pop()!.replace(/\.md$/, "");
  const f = new TFile();
  Object.assign(f, { path, basename, name: `${basename}.md` });
  return f;
}

function fakeApp(files: FakeFile[]) {
  const tfiles = files.map((f) => ({
    tfile: makeFile(f.path),
    raw: f.raw,
    fm: f.frontmatter,
  }));
  return {
    vault: {
      getMarkdownFiles: () => tfiles.map((x) => x.tfile),
      getAbstractFileByPath: (path: string) => {
        const hit = tfiles.find((x) => x.tfile.path === path);
        return hit ? hit.tfile : null;
      },
      read: async (file: TFile) => {
        const hit = tfiles.find((x) => x.tfile === file);
        if (!hit) throw new Error(`fakeApp: missing raw for ${file.path}`);
        return hit.raw;
      },
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        const hit = tfiles.find((x) => x.tfile === file);
        if (!hit) return null;
        if (hit.fm === undefined) return null; // no cache entry
        return { frontmatter: hit.fm };
      },
    },
  } as any;
}

const modernRaw = (over: Record<string, unknown> = {}) => {
  const fm = {
    type: "workflow",
    schema: 1,
    project: "demo",
    default_agent: "claude",
    default_model: "opus",
    steps: [{ step: "kickoff", modules: ["orient"] }],
    ...over,
  };
  // Build a minimal raw representation. The IO loader reads raw via
  // `app.vault.read` to detect the leading fence; we just need the fence to
  // be present so classification picks "modern" / "legacy-N" correctly.
  return { fm, raw: "---\n# yaml omitted (parsed via metadataCache)\n---\nbody\n" };
};

// ---------------------------------------------------------------------------
// loadWorkflowFile — happy path
// ---------------------------------------------------------------------------

describe("loadWorkflowFile — modern", () => {
  it("loads a clean modern workflow with no extends", async () => {
    const { fm, raw } = modernRaw();
    const app = fakeApp([{ path: "Projects/demo/WORKFLOW.md", raw, frontmatter: fm }]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow).not.toBeNull();
    expect(r.diagnostics).toEqual([]);
    expect(r.workflow!.steps).toHaveLength(1);
    expect(r.workflow!.source.isLegacy).toBe(false);
  });

  it("returns null when the file doesn't exist", async () => {
    const app = fakeApp([]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow).toBeNull();
    expect(r.diagnostics[0].code).toBe("schema-mismatch");
    expect(r.diagnostics[0].message).toContain("not found");
  });

  it("returns an error for a blank project slug", async () => {
    const app = fakeApp([]);
    const r = await loadWorkflowFile(app, "  ");
    expect(r.workflow).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });
});

// ---------------------------------------------------------------------------
// loadWorkflowFile — legacy fallback ladder (six shapes via raw input)
// ---------------------------------------------------------------------------

describe("loadWorkflowFile — legacy fallback shapes", () => {
  it("(1) raw with no frontmatter fence → legacy-1 synthetic step", async () => {
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        raw: "Just freeform workflow prose, no frontmatter.\n",
        frontmatter: undefined,
      },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow).not.toBeNull();
    expect(r.workflow!.source.isLegacy).toBe(true);
    expect(r.workflow!.steps).toHaveLength(1);
    expect(r.workflow!.steps[0].step).toBe("kickoff");
    expect(r.workflow!.steps[0].legacyKickoffBody).toBe(
      "Just freeform workflow prose, no frontmatter.\n",
    );
    expect(r.diagnostics.some((d) => d.code === "schema-mismatch" && d.severity === "warning")).toBe(true);
  });

  it("(2) frontmatter present, no type field → legacy-2 synthetic step", async () => {
    const raw = "---\nproject: demo\nupdated: 2026-04-25\n---\nbody content here\n";
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        raw,
        frontmatter: { project: "demo", updated: "2026-04-25" },
      },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow!.source.isLegacy).toBe(true);
    expect(r.workflow!.steps[0].legacyKickoffBody).toBe("body content here\n");
  });

  it("(3) type: workflow but no steps → legacy-3 synthetic step", async () => {
    const raw = "---\ntype: workflow\nschema: 1\nproject: demo\n---\n# Body\ntext\n";
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        raw,
        frontmatter: { type: "workflow", schema: 1, project: "demo" },
      },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow!.source.isLegacy).toBe(true);
    expect(r.workflow!.steps[0].legacyKickoffBody).toBe("# Body\ntext\n");
  });

  it("(4) type: <other> → legacy-4 synthesises body with warning diagnostic (OP-208 cutover fix)", async () => {
    // Pre-OP-208 the legacy inline blob in buildPrompt read WORKFLOW.md
    // verbatim regardless of frontmatter. The new shape-4 handler synthesises
    // from the body (like shapes 1/2/3/5) so users whose WORKFLOW.md carries
    // `type: <other>` from a metadata plugin don't silently lose their
    // workflow content after the cutover.
    const raw = "---\ntype: project\n---\nbody\n";
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        raw,
        frontmatter: { type: "project" },
      },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow).not.toBeNull();
    expect(r.workflow!.source.isLegacy).toBe(true);
    expect(r.workflow!.steps[0].legacyKickoffBody).toBe("body\n");
    expect(r.diagnostics[0].code).toBe("schema-mismatch");
    expect(r.diagnostics[0].severity).toBe("warning");
    expect((r.diagnostics[0].extra as Record<string, unknown>).actual).toBe("project");
  });

  it("(5) frontmatter parses to null → legacy-5 synthetic step (fmCached=undefined via fakeApp)", async () => {
    // Real Obsidian: for `---\n---` the YAML engine yields undefined for the
    // fence content, so `getFileCache(file)?.frontmatter` is `undefined`.
    // fakeApp models this by returning `null` from getFileCache when `frontmatter`
    // is `undefined` in the fixture (simulating "no usable frontmatter"), which
    // makes `getFileCache(file)?.frontmatter` evaluate to `undefined` via the
    // optional chain.  The raw-starts-with-`---` check then maps fmCached=undefined
    // to fmInput=null → shape 5.
    const raw = "---\n---\nbody after empty fence\n";
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        raw,
        frontmatter: undefined, // fakeApp returns null for getFileCache → null?.frontmatter = undefined = fmCached
      },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow!.source.isLegacy).toBe(true);
    expect(r.workflow!.steps[0].legacyKickoffBody).toBe("body after empty fence\n");
  });

  it("(5-null) defensive: fmCached=null also routes to legacy-5", async () => {
    // Obsidian never returns null for frontmatter (typed FrontMatterCache | undefined),
    // but the disambiguation code handles it gracefully (fmCached=null satisfies
    // `!== undefined`, so fmInput = null → classifyLegacy(raw, null) → shape 5).
    const raw = "---\n---\nbody after empty fence\n";
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        raw,
        frontmatter: null, // fakeApp returns { frontmatter: null } → fmCached = null → fmInput = null
      },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow!.source.isLegacy).toBe(true);
    expect(r.workflow!.steps[0].legacyKickoffBody).toBe("body after empty fence\n");
  });

  it("(6) modern with body containing --- HR after fence → modern, fence-detection runs against first ---", async () => {
    const raw =
      "---\ntype: workflow\nschema: 1\nproject: demo\ndefault_agent: claude\ndefault_model: opus\nsteps: []\n---\n# Section\n\n---\n\nNot a frontmatter close — body HR.\n";
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        raw,
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [],
        },
      },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow).not.toBeNull();
    expect(r.workflow!.source.isLegacy).toBe(false);
    expect(r.workflow!.steps).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// loadWorkflowFile — extends inheritance
// ---------------------------------------------------------------------------

describe("loadWorkflowFile — extends inheritance", () => {
  it("merges parent and child workflows (one level)", async () => {
    const childRaw = modernRaw({
      extends: "Projects/_op-workflow.md",
      steps: [{ step: "review", modules: ["review-and-merge"] }],
    });
    const parentRaw = modernRaw({
      project: "demo",
      steps: [{ step: "kickoff", modules: ["orient"] }],
    });
    const app = fakeApp([
      { path: "Projects/demo/WORKFLOW.md", raw: childRaw.raw, frontmatter: childRaw.fm },
      { path: "Projects/_op-workflow.md", raw: parentRaw.raw, frontmatter: parentRaw.fm },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow).not.toBeNull();
    expect(r.workflow!.steps.map((s) => s.step)).toEqual(["kickoff", "review"]);
  });

  it("child step overrides parent step with same id", async () => {
    const childRaw = modernRaw({
      extends: "Projects/_op-workflow.md",
      steps: [{ step: "kickoff", modules: ["custom-orient"] }],
    });
    const parentRaw = modernRaw({
      project: "demo",
      steps: [
        { step: "kickoff", modules: ["orient"] },
        { step: "review", modules: ["review-and-merge"] },
      ],
    });
    const app = fakeApp([
      { path: "Projects/demo/WORKFLOW.md", raw: childRaw.raw, frontmatter: childRaw.fm },
      { path: "Projects/_op-workflow.md", raw: parentRaw.raw, frontmatter: parentRaw.fm },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow!.steps).toHaveLength(2);
    expect(r.workflow!.steps[0].modules).toEqual(["custom-orient"]); // child override
    expect(r.workflow!.steps[1].step).toBe("review"); // parent preserved
  });

  it("emits schema-mismatch warning when parent declares its own extends (one-level rule)", async () => {
    const childRaw = modernRaw({ extends: "Projects/_op-workflow.md" });
    const parentRaw = modernRaw({
      project: "demo",
      extends: "Projects/_grandparent.md",
    });
    const app = fakeApp([
      { path: "Projects/demo/WORKFLOW.md", raw: childRaw.raw, frontmatter: childRaw.fm },
      { path: "Projects/_op-workflow.md", raw: parentRaw.raw, frontmatter: parentRaw.fm },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow).not.toBeNull();
    expect(
      r.diagnostics.some(
        (d) =>
          d.code === "schema-mismatch" &&
          d.severity === "warning" &&
          d.message.includes("nested extends"),
      ),
    ).toBe(true);
  });

  it("self-reference: extends pointing at the same file emits schema-mismatch error (not 'nested extends')", async () => {
    // A workflow that extends itself must not loop, and must get a clear
    // "self-reference" diagnostic rather than the confusing "nested extends"
    // warning that would fire if the guard were absent.
    const selfRaw = modernRaw({
      extends: "Projects/demo/WORKFLOW.md", // same path as the file itself
    });
    const app = fakeApp([
      { path: "Projects/demo/WORKFLOW.md", raw: selfRaw.raw, frontmatter: selfRaw.fm },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    // The workflow still parses; the self-merge is skipped.
    expect(r.workflow).not.toBeNull();
    expect(
      r.diagnostics.some(
        (d) =>
          d.code === "schema-mismatch" &&
          d.severity === "error" &&
          d.message.includes("self-reference"),
      ),
    ).toBe(true);
    // Must NOT emit a "nested extends" warning (that's the wrong diagnosis).
    expect(r.diagnostics.some((d) => d.message.includes("nested extends"))).toBe(false);
  });

  it("missing parent file emits schema-mismatch but child still loads", async () => {
    const childRaw = modernRaw({ extends: "Projects/_missing.md" });
    const app = fakeApp([
      { path: "Projects/demo/WORKFLOW.md", raw: childRaw.raw, frontmatter: childRaw.fm },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    // Child's own workflow still parses; diagnostic surfaces the missing parent.
    expect(r.workflow).not.toBeNull();
    expect(
      r.diagnostics.some(
        (d) => d.code === "schema-mismatch" && d.message.includes("not found"),
      ),
    ).toBe(true);
  });

  it("child's defaults win over parent's", async () => {
    const childRaw = modernRaw({
      extends: "Projects/_op-workflow.md",
      default_agent: "gemini",
      default_model: "pro",
    });
    const parentRaw = modernRaw({
      project: "demo",
      default_agent: "claude",
      default_model: "opus",
    });
    const app = fakeApp([
      { path: "Projects/demo/WORKFLOW.md", raw: childRaw.raw, frontmatter: childRaw.fm },
      { path: "Projects/_op-workflow.md", raw: parentRaw.raw, frontmatter: parentRaw.fm },
    ]);
    const r = await loadWorkflowFile(app, "demo");
    expect(r.workflow!.defaultAgent).toEqual(["gemini"]);
    expect(r.workflow!.defaultModel).toEqual({ kind: "all", values: ["pro"] });
  });
});

// ---------------------------------------------------------------------------
// mergeWorkflows — pure
// ---------------------------------------------------------------------------

const wf = (over: Partial<WorkflowFile>): WorkflowFile => ({
  source: { path: "child.md", project: "demo", isLegacy: false },
  type: "workflow",
  schema: 1,
  project: "demo",
  defaultAgent: ["claude"],
  defaultModel: { kind: "all", values: ["opus"] },
  extendsPath: null,
  steps: [],
  ...over,
});

describe("mergeWorkflows", () => {
  it("preserves parent step order, appends child-only steps", () => {
    const parent = wf({
      steps: [
        { step: "kickoff", modules: ["a"] },
        { step: "review", modules: ["b"] },
      ],
    });
    const child = wf({
      source: { path: "child.md", project: "demo", isLegacy: false },
      steps: [{ step: "finalize", modules: ["c"] }],
    });
    const merged = mergeWorkflows(parent, child);
    expect(merged.steps.map((s) => s.step)).toEqual(["kickoff", "review", "finalize"]);
  });

  it("substitutes child override at the parent's slot, doesn't append duplicate", () => {
    const parent = wf({
      steps: [
        { step: "kickoff", modules: ["a"] },
        { step: "review", modules: ["b"] },
      ],
    });
    const child = wf({
      steps: [{ step: "review", modules: ["custom-b"] }],
    });
    const merged = mergeWorkflows(parent, child);
    expect(merged.steps).toHaveLength(2);
    expect(merged.steps[1].modules).toEqual(["custom-b"]);
  });

  it("falls back to parent defaults when child has empty agents/models", () => {
    const parent = wf({
      defaultAgent: ["claude"],
      defaultModel: { kind: "all", values: ["opus"] },
    });
    const child = wf({
      defaultAgent: [],
      defaultModel: { kind: "all", values: [] },
    });
    const merged = mergeWorkflows(parent, child);
    expect(merged.defaultAgent).toEqual(["claude"]);
    expect(merged.defaultModel).toEqual({ kind: "all", values: ["opus"] });
  });

  it("merged source identifies as the child", () => {
    const parent = wf({ source: { path: "parent.md", project: "demo", isLegacy: false } });
    const child = wf({ source: { path: "child.md", project: "demo", isLegacy: false } });
    const merged = mergeWorkflows(parent, child);
    expect(merged.source).toEqual(child.source);
  });
});
