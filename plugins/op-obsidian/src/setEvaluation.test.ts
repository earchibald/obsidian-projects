import { describe, it, expect } from "vitest";
import {
  normalizeEvaluationPayload,
  rewriteEvaluationSection,
} from "./setEvaluationPure";

const FM = `---
id: OP-1
type: issue
---
`;

describe("rewriteEvaluationSection", () => {
  it("replaces an existing ## Initial Evaluation section", () => {
    const text = `${FM}
# Title

## Initial Evaluation

old notes

## Plan

plan lives on.
`;
    const { next, replaced } = rewriteEvaluationSection(text, "new notes\n\n- observation");
    expect(replaced).toBe(true);
    expect(next).toContain("## Initial Evaluation\n\nnew notes\n\n- observation\n");
    expect(next).toContain("## Plan");
    expect(next).not.toContain("old notes");
  });

  it("appends ## Initial Evaluation when missing", () => {
    const text = `${FM}
# Title

Some body.
`;
    const { next, replaced } = rewriteEvaluationSection(text, "first observation");
    expect(replaced).toBe(false);
    expect(next).toContain("Some body.\n\n## Initial Evaluation\n\nfirst observation\n");
  });

  it("preserves frontmatter exactly", () => {
    const text = `${FM}
# T

## Initial Evaluation
old
`;
    const { next } = rewriteEvaluationSection(text, "new");
    expect(next.startsWith(FM)).toBe(true);
  });

  it("handles ## Initial Evaluation at end of file (no trailing section)", () => {
    const text = `${FM}
# T

## Initial Evaluation
old
`;
    const { next, replaced } = rewriteEvaluationSection(text, "replaced");
    expect(replaced).toBe(true);
    expect(next).toMatch(/## Initial Evaluation\n\nreplaced\n$/);
  });

  it("preserves sections before and after", () => {
    const text = `${FM}
# T

## Scope
- [ ] scope bullet

## Initial Evaluation

old eval

## Plan

the plan
`;
    const { next } = rewriteEvaluationSection(text, "the eval");
    expect(next).toContain("## Scope\n- [ ] scope bullet");
    expect(next).toContain("## Initial Evaluation\n\nthe eval\n");
    expect(next).toContain("## Plan\n\nthe plan");
    expect(next).not.toContain("old eval");
  });

  it("does not match ## Initial   Evaluation (multiple spaces between words)", () => {
    // escapeRegExp passes spaces through unchanged; `## Initial   Evaluation`
    // differs from the literal `Initial Evaluation` in the regex and must not
    // be treated as the target section.
    const text = `${FM}
# T

## Initial   Evaluation
old
`;
    const { replaced } = rewriteEvaluationSection(text, "new");
    expect(replaced).toBe(false);
  });

  it("does not match ## Initial Evaluations (extra chars before end-of-line)", () => {
    // The `\\s*$` anchor in the heading regex prevents over-matching a heading
    // that has a suffix like `s`.
    const text = `${FM}
# T

## Initial Evaluations
old
`;
    const { replaced } = rewriteEvaluationSection(text, "new");
    expect(replaced).toBe(false);
  });
});

describe("normalizeEvaluationPayload", () => {
  it("rejects payload with H2 heading", () => {
    expect(() => normalizeEvaluationPayload("intro\n## Nope\nbody")).toThrow(/H2 headings/);
  });

  it("error mentions 'Initial Evaluation' section name (capitalised)", () => {
    expect(() => normalizeEvaluationPayload("intro\n## Nope\nbody")).toThrow(
      /Initial Evaluation payload must not contain H2 headings/,
    );
  });

  it("rejects empty payload", () => {
    expect(() => normalizeEvaluationPayload("   \n\n")).toThrow(/empty/);
  });

  it("strips trailing whitespace", () => {
    expect(normalizeEvaluationPayload("body\n\n  ")).toBe("body");
  });

  it("normalizes CRLF to LF", () => {
    expect(normalizeEvaluationPayload("a\r\nb")).toBe("a\nb");
  });
});
