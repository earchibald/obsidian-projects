import { describe, it, expect } from "vitest";
import { slugifySkillName, renderSkillMd } from "./lazySkillPure";

describe("slugifySkillName (OP-192)", () => {
  it("prefixes op-module- and lowercases", () => {
    expect(slugifySkillName("Tmux-Gotchas")).toBe("op-module-tmux-gotchas");
  });
  it("replaces invalid chars and collapses dashes", () => {
    expect(slugifySkillName("a b/c__d")).toBe("op-module-a-b-c-d");
  });
  it("trims leading/trailing dashes and caps at 64 chars", () => {
    const long = "x".repeat(100);
    const out = slugifySkillName(long);
    expect(out.length).toBeLessThanOrEqual(64);
    expect(out.startsWith("op-module-")).toBe(true);
    expect(/^[a-z0-9-]+$/.test(out)).toBe(true);
    expect(out.endsWith("-")).toBe(false);
  });
});

describe("renderSkillMd (OP-192)", () => {
  it("emits valid YAML frontmatter + body", () => {
    const md = renderSkillMd({ name: "op-module-tmux", description: "tmux gotchas", body: "Body here" });
    expect(md).toBe(
      "---\nname: op-module-tmux\ndescription: \"tmux gotchas\"\n---\n\nBody here\n",
    );
  });
  it("YAML-escapes a description containing quotes, colons, and newlines", () => {
    const md = renderSkillMd({
      name: "op-module-x",
      description: 'has: a "quote" and\nnewline',
      body: "B",
    });
    const fm = md.split("---")[1];
    expect(fm).toContain('description: "has: a \\"quote\\" and\\nnewline"');
    expect(md.endsWith("B\n")).toBe(true);
  });
});
