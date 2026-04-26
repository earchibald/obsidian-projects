import { describe, expect, it } from "vitest";
import { SKILL_NAMES, getSkill } from "./skill";
import { parseGetSkillParams } from "./cliHandlers";

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

  it("is case-insensitive — Skill and SKILL both resolve to skill", () => {
    expect(getSkill("Skill").name).toBe("skill");
    expect(getSkill("SKILL").name).toBe("skill");
  });

  it("rejects unknown names with a clear error", () => {
    expect(() => getSkill("nope")).toThrow(/unknown name "nope"/);
  });

  it("rejects future names that are not yet implemented", () => {
    expect(() => getSkill("cli-gotchas")).toThrow(/unknown name "cli-gotchas"/);
  });

  it("the error message lists expected names", () => {
    let msg = "";
    try {
      getSkill("nope");
    } catch (e: any) {
      msg = e.message;
    }
    for (const name of SKILL_NAMES) {
      expect(msg).toContain(name);
    }
  });

  it("only knows about names declared in SKILL_NAMES", () => {
    expect(SKILL_NAMES).toEqual(["skill"]);
  });

  it("parseGetSkillParams → getSkill round-trip handles capitalized input end-to-end", () => {
    const parsed = parseGetSkillParams({ name: "Skill" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const res = getSkill(parsed.value.name);
    expect(res.name).toBe("skill");
    expect(res.size).toBeGreaterThan(0);
  });
});
