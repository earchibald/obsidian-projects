import { describe, it, expect, vi } from "vitest";

// Stub obsidian and the IO-layer imports that pull in Obsidian runtime classes.
// This test only exercises the pure `planSkillEmission` function; the IO half
// (`emitLazySkills`) is not invoked here, but vitest loads the whole module.
vi.mock("obsidian", () => ({
  App: class {},
  TFile: class { path = ""; basename = ""; name = ""; },
  TFolder: class {},
  Modal: class {},
  FuzzySuggestModal: class {},
  SuggestModal: class {},
  Notice: class {},
  Setting: class {},
  ItemView: class {},
  WorkspaceLeaf: class {},
  MarkdownView: class {},
  Component: class {},
  Menu: class {},
  Platform: { isDesktop: true },
  normalizePath: (p: string) => p,
  parseYaml: (s: string) => s,
  setIcon: () => {},
  setTooltip: () => {},
  prepareFuzzySearch: () => () => null,
}));

import { planSkillEmission } from "./emitLazySkills";

describe("planSkillEmission (OP-192)", () => {
  const lazy = [
    { id: "tmux", name: "op-module-tmux", description: "d", body: "B1" },
    { id: "git", name: "op-module-git", description: "d", body: "B2" },
  ];

  it("plans a SKILL.md + self-ignoring .gitignore per lazy skill", () => {
    const plan = planSkillEmission({ destDir: "/wt", lazySkills: lazy, existingOpModuleDirs: [] });
    expect(plan.writes).toEqual([
      { path: "/wt/.claude/skills/op-module-tmux/SKILL.md", kind: "skill", skill: lazy[0] },
      { path: "/wt/.claude/skills/op-module-tmux/.gitignore", kind: "gitignore" },
      { path: "/wt/.claude/skills/op-module-git/SKILL.md", kind: "skill", skill: lazy[1] },
      { path: "/wt/.claude/skills/op-module-git/.gitignore", kind: "gitignore" },
    ]);
    expect(plan.prunes).toEqual([]);
  });

  it("prunes orphaned op-module-* dirs not in the current set", () => {
    const plan = planSkillEmission({
      destDir: "/wt", lazySkills: [lazy[0]],
      existingOpModuleDirs: ["op-module-tmux", "op-module-stale"],
    });
    expect(plan.prunes).toEqual(["/wt/.claude/skills/op-module-stale"]);
  });

  it("prunes ALL op-module-* dirs when there are no lazy skills", () => {
    const plan = planSkillEmission({
      destDir: "/wt", lazySkills: [], existingOpModuleDirs: ["op-module-tmux"],
    });
    expect(plan.writes).toEqual([]);
    expect(plan.prunes).toEqual(["/wt/.claude/skills/op-module-tmux"]);
  });
});
