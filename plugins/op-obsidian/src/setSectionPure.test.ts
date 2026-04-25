import { describe, it, expect } from "vitest";
import {
  isSetSectionName,
  normalizeSectionPayload,
  rewriteSection,
  SET_SECTION_NAMES,
} from "./setSectionPure";

const FM = `---
id: OP-1
type: issue
---
`;

describe("SET_SECTION_NAMES", () => {
  it("includes Plan, Notes, Summary (and only those)", () => {
    expect([...SET_SECTION_NAMES]).toEqual(["Plan", "Notes", "Summary"]);
  });
  it("isSetSectionName narrows correctly", () => {
    expect(isSetSectionName("Plan")).toBe(true);
    expect(isSetSectionName("Scope")).toBe(false);
    expect(isSetSectionName("Initial Evaluation")).toBe(false);
    expect(isSetSectionName("plan")).toBe(false);
  });
});

describe("normalizeSectionPayload", () => {
  it("rejects payload with H2 heading (mentions section name)", () => {
    expect(() => normalizeSectionPayload("body\n## Nope\nx", "Plan")).toThrow(
      /Plan payload must not contain H2 headings/,
    );
  });
  it("rejects empty payload", () => {
    expect(() => normalizeSectionPayload("   \n\n", "Notes")).toThrow(/Notes payload is empty/);
  });
  it("strips trailing whitespace", () => {
    expect(normalizeSectionPayload("body\n\n  ", "Plan")).toBe("body");
  });
  it("normalizes CRLF to LF", () => {
    expect(normalizeSectionPayload("a\r\nb", "Summary")).toBe("a\nb");
  });
});

describe("rewriteSection (replace mode)", () => {
  it("replaces an existing ## Plan section, preserving sections before/after", () => {
    const text = `${FM}
# Title

## Scope
- [ ] s1

## Plan

old plan body

## Tasks
- [ ] t1
`;
    const { next, replaced, appended } = rewriteSection(text, "Plan", "new plan body");
    expect(replaced).toBe(true);
    expect(appended).toBe(false);
    expect(next).toContain("## Scope\n- [ ] s1");
    expect(next).toContain("## Plan\n\nnew plan body\n");
    expect(next).toContain("## Tasks\n- [ ] t1");
    expect(next).not.toContain("old plan body");
  });

  it("appends ## Notes when missing", () => {
    const text = `${FM}
# Title

Some body.
`;
    const { next, replaced, appended } = rewriteSection(text, "Notes", "first note");
    expect(replaced).toBe(false);
    expect(appended).toBe(false);
    expect(next).toContain("Some body.\n\n## Notes\n\nfirst note\n");
  });

  it("preserves frontmatter exactly", () => {
    const text = `${FM}
# T

## Summary
old
`;
    const { next } = rewriteSection(text, "Summary", "new");
    expect(next.startsWith(FM)).toBe(true);
  });

  it("handles section at end-of-file (no trailing section)", () => {
    const text = `${FM}
# T

## Summary
old
`;
    const { next, replaced } = rewriteSection(text, "Summary", "shipped");
    expect(replaced).toBe(true);
    expect(next).toMatch(/## Summary\n\nshipped\n$/);
  });
});

describe("rewriteSection (append mode)", () => {
  it("appends payload to existing section body with blank-line separator", () => {
    const text = `${FM}
# T

## Notes

prior block.

## Summary
done
`;
    const { next, replaced, appended } = rewriteSection(
      text,
      "Notes",
      "### OP-1.2 — second\n\nmore detail",
      { append: true },
    );
    expect(replaced).toBe(true);
    expect(appended).toBe(true);
    expect(next).toContain(
      "## Notes\n\nprior block.\n\n### OP-1.2 — second\n\nmore detail\n",
    );
    expect(next).toContain("## Summary\ndone");
  });

  it("treats placeholder-only section as empty (no double blank)", () => {
    const text = `${FM}
# T

## Notes


## Summary
done
`;
    const { next, replaced, appended } = rewriteSection(text, "Notes", "first", {
      append: true,
    });
    expect(replaced).toBe(true);
    expect(appended).toBe(false);
    expect(next).toContain("## Notes\n\nfirst\n");
  });

  it("creates the section when missing (append acts as replace fallback)", () => {
    const text = `${FM}
# T

Some body.
`;
    const { next, replaced, appended } = rewriteSection(text, "Notes", "first", {
      append: true,
    });
    expect(replaced).toBe(false);
    expect(appended).toBe(false);
    expect(next).toContain("Some body.\n\n## Notes\n\nfirst\n");
  });
});
