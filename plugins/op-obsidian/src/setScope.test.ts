import { describe, it, expect } from "vitest";
import { rewriteScopeSection, normalizeScopePayload } from "./setScopePure";

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

  it("rejects empty payload", () => {
    expect(() => normalizeScopePayload("   \n\n")).toThrow(/empty/);
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
