import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyLegacy,
  parseWorkflowFile,
  stripWorkflowFrontmatter,
  synthesizeLegacyWorkflow,
} from "./workflowFilePure";

// Fixture-driven coverage of the legacy WORKFLOW.md fallback ladder. The six
// shapes from OP-196 scope live as real markdown files under
// `src/__fixtures__/legacy-workflow/`. Each test reads its fixture from disk,
// runs `classifyLegacy` (modelling what the IO layer would do with the
// metadataCache frontmatter) and asserts the classification + synth output.
//
// Why fixtures vs. inline strings: fixtures are easy to eyeball as an author
// debugging shape mismatches, and they exercise the same string-shape the
// loader sees in the real vault (no escaping artifacts from JS literals).

const FIXTURES_DIR = resolve(__dirname, "__fixtures__/legacy-workflow");

function readFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), "utf8");
}

describe("legacy fallback fixtures", () => {
  it("(1) 1-no-frontmatter.md classifies as legacy-1 and synthesises the body verbatim", () => {
    const raw = readFixture("1-no-frontmatter.md");
    const c = classifyLegacy(raw, undefined);
    expect(c.shape).toBe("legacy-1");
    expect(c.body).toBe(raw); // entire file becomes body — no fence to strip
    const wf = synthesizeLegacyWorkflow({
      path: "Projects/demo/WORKFLOW.md",
      project: "demo",
      body: c.body,
      shape: c.shape,
    });
    expect(wf.steps[0].step).toBe("kickoff");
    expect(wf.steps[0].legacyKickoffBody).toBe(raw);
    expect(wf.source.isLegacy).toBe(true);
  });

  it("(2) 2-no-type.md classifies as legacy-2 (frontmatter without type field)", () => {
    const raw = readFixture("2-no-type.md");
    // Mirror what Obsidian's metadataCache would parse from the fixture's
    // frontmatter: `project` + `updated`, no `type`.
    const c = classifyLegacy(raw, { project: "demo-project", updated: "2026-04-25" });
    expect(c.shape).toBe("legacy-2");
    expect(c.body).toBe(stripWorkflowFrontmatter(raw));
    // The body retains its leading blank line (the empty line after the
    // closing fence in the fixture). Heading appears immediately after.
    expect(c.body).toContain("# Project workflow");
  });

  it("(3) 3-no-steps.md classifies as legacy-3 (type: workflow without steps)", () => {
    const raw = readFixture("3-no-steps.md");
    const c = classifyLegacy(raw, {
      type: "workflow",
      schema: 1,
      project: "demo-project",
      default_agent: "claude",
      default_model: "opus",
    });
    expect(c.shape).toBe("legacy-3");
    expect(c.body).toBe(stripWorkflowFrontmatter(raw));
  });

  it("(4) 4-wrong-type.md classifies as legacy-4 — caller drops with schema-mismatch", () => {
    const raw = readFixture("4-wrong-type.md");
    const c = classifyLegacy(raw, { type: "project", project: "demo-project" });
    expect(c.shape).toBe("legacy-4");
    // synthesizeLegacyWorkflow refuses to handle this shape — caller must
    // emit a schema-mismatch and return null instead. We assert the refusal.
    expect(() =>
      synthesizeLegacyWorkflow({
        path: "Projects/demo/WORKFLOW.md",
        project: "demo",
        body: c.body,
        shape: c.shape,
      }),
    ).toThrow(/not synthesisable/);
  });

  it("(5) 5-null-frontmatter.md classifies as legacy-5", () => {
    const raw = readFixture("5-null-frontmatter.md");
    // Empty fence: in Obsidian the metadataCache may return `undefined` (no
    // cache entry) or `null`; the IO layer normalises to `null` when the file
    // begins with a fence. Verify the null path lands at legacy-5.
    const c = classifyLegacy(raw, null);
    expect(c.shape).toBe("legacy-5");
    expect(c.body).toContain("# Project workflow");
  });

  it("(6) 6-body-fence.md classifies as modern — fence-detection runs against first --- only", () => {
    const raw = readFixture("6-body-fence.md");
    const fm = {
      type: "workflow",
      schema: 1,
      project: "demo-project",
      default_agent: "claude",
      default_model: "opus",
      steps: [{ step: "kickoff", modules: ["orient"] }],
    };
    const c = classifyLegacy(raw, fm);
    expect(c.shape).toBe("modern");
    // Body retains the inline `---` HRs verbatim — the closing fence at the
    // first occurrence is the only one consumed.
    expect(c.body).toContain("Section heading after HR");
    expect(c.body).toContain("Another section after another HR");
    // And the modern parser produces a clean workflow with the declared step.
    const r = parseWorkflowFile({
      path: "Projects/demo/WORKFLOW.md",
      project: "demo-project",
      frontmatter: fm,
    });
    expect(r.workflow!.steps).toEqual([{ step: "kickoff", modules: ["orient"] }]);
    expect(r.diagnostics).toEqual([]);
  });
});

describe("legacy fixtures — round-trip via stripWorkflowFrontmatter", () => {
  it("legacy-1 fixture: stripFrontmatter is the identity", () => {
    const raw = readFixture("1-no-frontmatter.md");
    expect(stripWorkflowFrontmatter(raw)).toBe(raw);
  });

  it("legacy-2 fixture: stripFrontmatter drops the fence", () => {
    const raw = readFixture("2-no-type.md");
    const body = stripWorkflowFrontmatter(raw);
    expect(body).toContain("# Project workflow");
    expect(body.includes("project: demo-project")).toBe(false); // frontmatter stripped
  });

  it("legacy-6 fixture: stripFrontmatter preserves inline --- HRs in body", () => {
    const raw = readFixture("6-body-fence.md");
    const body = stripWorkflowFrontmatter(raw);
    // Two inline `---` HRs in the body must survive.
    const hrCount = body.match(/^---$/gm)?.length ?? 0;
    expect(hrCount).toBeGreaterThanOrEqual(2);
  });
});
