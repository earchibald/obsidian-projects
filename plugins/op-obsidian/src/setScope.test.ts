import { describe, it, expect } from "vitest";
import {
  rewriteScopeSection,
  normalizeScopePayload,
  rewriteFullBody,
  normalizeBodyPayload,
  parseNewScopePayload,
} from "./setScopePure";

const FM = `---
id: OP-1
type: issue
---
`;

describe("rewriteScopeSection", () => {
  it("replaces an existing ## Scope section", () => {
    const text = `${FM}
# Title

## Scope
- [ ] old bullet

## Notes

Some notes.
`;
    const { next, replaced } = rewriteScopeSection(text, "- [ ] new bullet\n- [ ] another");
    expect(replaced).toBe(true);
    expect(next).toContain("## Scope\n\n- [ ] new bullet\n- [ ] another\n");
    expect(next).toContain("## Notes");
    expect(next).not.toContain("old bullet");
  });

  it("appends ## Scope when missing", () => {
    const text = `${FM}
# Title

Some body.
`;
    const { next, replaced } = rewriteScopeSection(text, "- [ ] first plan item");
    expect(replaced).toBe(false);
    expect(next).toContain("Some body.\n\n## Scope\n\n- [ ] first plan item\n");
  });

  it("preserves frontmatter exactly", () => {
    const text = `${FM}
# T

## Scope
old
`;
    const { next } = rewriteScopeSection(text, "new");
    expect(next.startsWith(FM)).toBe(true);
  });

  it("rejects payload with H2 heading", () => {
    expect(() => normalizeScopePayload("intro\n## Nope\nbody")).toThrow(/H2 headings/);
  });

  it("error mentions 'Scope' section name (capitalised)", () => {
    expect(() => normalizeScopePayload("intro\n## Nope\nbody")).toThrow(
      /Scope payload must not contain H2 headings/,
    );
  });

  it("rejects empty payload", () => {
    expect(() => normalizeScopePayload("   \n\n")).toThrow(/empty/);
  });

  it("body mode replaces everything after the H1 title", () => {
    const text = `${FM}
# Title

## Scope
- [ ] old

## Plan
old plan
`;
    const { next, replaced } = rewriteFullBody(
      text,
      "## Plan\n\nrewritten plan\n\n## Tasks\n- [ ] do thing",
    );
    expect(replaced).toBe(true);
    expect(next.startsWith(FM)).toBe(true);
    expect(next).toContain("# Title\n\n## Plan\n\nrewritten plan");
    expect(next).toContain("## Tasks\n- [ ] do thing");
    expect(next).not.toContain("old plan");
    expect(next).not.toContain("## Scope");
  });

  it("body mode preserves H1 when body has only a title", () => {
    const text = `${FM}
# Title
`;
    const { next, replaced } = rewriteFullBody(text, "fresh body");
    expect(replaced).toBe(false);
    expect(next).toBe(`${FM}# Title\n\nfresh body\n`);
  });

  it("body mode allows H2 headings in payload", () => {
    expect(() => normalizeBodyPayload("## allowed\nbody")).not.toThrow();
  });

  it("body mode rejects empty payload", () => {
    expect(() => normalizeBodyPayload("   \n")).toThrow(/empty/);
  });

  it("parseNewScopePayload bullets mode splits on newlines into trimmed bullets", () => {
    const out = parseNewScopePayload("first bullet\n  second bullet  \n\nthird", "bullets");
    expect(out).toEqual({
      kind: "bullets",
      bullets: ["first bullet", "second bullet", "third"],
    });
  });

  it("parseNewScopePayload bullets mode also splits on commas (legacy URI delimiter)", () => {
    const out = parseNewScopePayload("a, b, c", "bullets");
    expect(out).toEqual({ kind: "bullets", bullets: ["a", "b", "c"] });
  });

  it("parseNewScopePayload bullets mode rejects payload containing an H2", () => {
    expect(() =>
      parseNewScopePayload("intro\n## Deliverables\nfoo", "bullets"),
    ).toThrow(/H2|scope_mode=body/);
  });

  it("parseNewScopePayload bullets mode rejects payload containing a code fence", () => {
    expect(() =>
      parseNewScopePayload("intro\n```yaml\nkey: val\n```", "bullets"),
    ).toThrow(/code fence|scope_mode=body/);
  });

  it("parseNewScopePayload body mode returns the trimmed payload verbatim", () => {
    const out = parseNewScopePayload("Para one.\n\n- a\n- b\n", "body");
    expect(out).toEqual({ kind: "body", body: "Para one.\n\n- a\n- b" });
  });

  it("parseNewScopePayload body mode allows code fences", () => {
    const raw = "Spec:\n```yaml\nkey: val\n```";
    const out = parseNewScopePayload(raw, "body");
    expect(out).toEqual({ kind: "body", body: raw });
  });

  it("parseNewScopePayload body mode rejects H2 (would terminate ## Scope section)", () => {
    expect(() =>
      parseNewScopePayload("Intro\n## Deliverables\nfoo", "body"),
    ).toThrow(/H2/);
  });

  it("parseNewScopePayload rejects empty payload in either mode", () => {
    expect(() => parseNewScopePayload("", "bullets")).toThrow(/empty/);
    expect(() => parseNewScopePayload("   \n\n", "body")).toThrow(/empty/);
  });

  it("handles ## Scope at end of file (no trailing section)", () => {
    const text = `${FM}
# T

## Scope
- [ ] old
`;
    const { next, replaced } = rewriteScopeSection(text, "- [ ] replaced");
    expect(replaced).toBe(true);
    expect(next).toMatch(/## Scope\n\n- \[ \] replaced\n$/);
  });
});
