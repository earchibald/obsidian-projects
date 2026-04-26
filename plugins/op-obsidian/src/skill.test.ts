import { describe, expect, it } from "vitest";
import { SKILL_NAMES, getSkill } from "./skill";

describe("getSkill", () => {
  it("returns bundled content for the default name", () => {
    const res = getSkill("skill");
    expect(res.name).toBe("skill");
    expect(res.size).toBeGreaterThan(0);
    expect(res.size).toBe(res.content.length);
    // Sanity-check that we got the operational manual, not some other doc:
    expect(res.content).toMatch(/Obsidian Projects \(op\) workflow/);
  });

  it("defaults to the canonical skill when name is empty", () => {
    expect(getSkill("").name).toBe("skill");
    expect(getSkill("   ").name).toBe("skill");
  });

  it("rejects unknown names with a clear error", () => {
    expect(() => getSkill("nope")).toThrow(/unknown name "nope"/);
  });

  it("only knows about names declared in SKILL_NAMES", () => {
    expect(SKILL_NAMES).toEqual(["skill"]);
  });
});
