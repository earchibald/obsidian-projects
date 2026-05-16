import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

// Stub obsidian and the IO-layer imports that pull in Obsidian runtime classes.
// This test only exercises the pure `planSkillEmission` function and, via mocks,
// the IO `emitLazySkills` function against a real tmpdir.
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

// Mock composeWorkflow so loadAndComposeWorkflow is controllable in IO tests.
vi.mock("./composeWorkflow", () => ({
  loadAndComposeWorkflow: vi.fn(),
}));

// Mock explainWorkflow so buildIssueRenderContext, readProjectVars, and
// resolveProfileById don't need a real Obsidian App instance.
vi.mock("./explainWorkflow", () => ({
  buildIssueRenderContext: vi.fn(),
  readProjectVars: vi.fn(),
  resolveProfileById: vi.fn(),
}));

import { planSkillEmission, emitLazySkills } from "./emitLazySkills";
import { loadAndComposeWorkflow } from "./composeWorkflow";
import { buildIssueRenderContext, readProjectVars } from "./explainWorkflow";
import { renderSkillMd } from "./lazySkillPure";
import type { IssueEntry } from "./types";
import type { OpSettings } from "./settings";

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

// ---------------------------------------------------------------------------
// IO tests — emitLazySkills against a real tmpdir
// ---------------------------------------------------------------------------

const fakeApp = {} as any;
const fakeSettings: Partial<OpSettings> = {
  defaultAgent: "claude",
  workflowVars: {},
  injection: { maxWorkflowChars: 50000 } as any,
};
const fakeEntry: IssueEntry = {
  path: "Projects/testing/OP-1.md",
  type: "issue",
  id: "OP-1",
  project: "testing",
  status: "open",
  title: "Test issue",
  resolvedFolder: false,
};

function makeDeps(tmpdir: string) {
  const mockBuildIssueRenderContext = buildIssueRenderContext as ReturnType<typeof vi.fn>;
  const mockReadProjectVars = readProjectVars as ReturnType<typeof vi.fn>;
  mockBuildIssueRenderContext.mockReturnValue({
    id: "OP-1",
    title: "Test issue",
    project: "testing",
    status: "open",
    parent: null,
    vault_path: "/vault",
    vault_name: "OP-Test",
    today: "2026-05-15",
    agent: "claude",
    mode: "kickoff",
    repo_path: tmpdir,
  });
  mockReadProjectVars.mockReturnValue({});
}

async function mkTmp(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("emitLazySkills IO (OP-192)", () => {
  let tmpdir: string;

  beforeEach(async () => {
    tmpdir = await mkTmp("op-emit-lazy-skills-test-");
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.rm(tmpdir, { recursive: true, force: true });
  });

  it("writes SKILL.md + .gitignore for each lazy skill and returns correct result", async () => {
    makeDeps(tmpdir);
    const mockLoadAndCompose = loadAndComposeWorkflow as ReturnType<typeof vi.fn>;
    const skills = [
      { id: "module-a", name: "op-module-a", description: "Module A description", body: "# Module A\nContent here" },
      { id: "module-b", name: "op-module-b", description: "Module B description", body: "# Module B\nContent there" },
    ];
    mockLoadAndCompose.mockResolvedValue({
      composed: {
        lazySkills: skills,
        text: "",
        orderedChunks: [],
        perVarSourceMap: {},
        sizeChars: 0,
        diagnostics: [],
      },
    });

    const result = await emitLazySkills(
      fakeApp,
      { settings: fakeSettings as OpSettings, resolveIssue: () => fakeEntry },
      { issueId: "OP-1", destDir: tmpdir },
    );

    // SKILL.md for module-a
    const skillAPath = path.join(tmpdir, ".claude", "skills", "op-module-a", "SKILL.md");
    const gitignoreAPath = path.join(tmpdir, ".claude", "skills", "op-module-a", ".gitignore");
    const skillBPath = path.join(tmpdir, ".claude", "skills", "op-module-b", "SKILL.md");
    const gitignoreBPath = path.join(tmpdir, ".claude", "skills", "op-module-b", ".gitignore");

    const skillAContent = await fs.readFile(skillAPath, "utf8");
    expect(skillAContent).toBe(renderSkillMd({ name: "op-module-a", description: "Module A description", body: "# Module A\nContent here" }));

    const gitignoreAContent = await fs.readFile(gitignoreAPath, "utf8");
    expect(gitignoreAContent).toBe("*\n");

    const skillBContent = await fs.readFile(skillBPath, "utf8");
    expect(skillBContent).toBe(renderSkillMd({ name: "op-module-b", description: "Module B description", body: "# Module B\nContent there" }));

    const gitignoreBContent = await fs.readFile(gitignoreBPath, "utf8");
    expect(gitignoreBContent).toBe("*\n");

    // result metadata
    expect(result.written.sort()).toEqual([skillAPath, gitignoreAPath, skillBPath, gitignoreBPath].sort());
    expect(result.empty).toBe(false);
    expect(result.pruned).toEqual([]);
    expect(result.skillNames).toEqual(["op-module-a", "op-module-b"]);
    expect(result.emptyBodySkills).toEqual([]);
  });

  it("prunes stale op-module-* dirs not in the current lazy skill set", async () => {
    makeDeps(tmpdir);
    const mockLoadAndCompose = loadAndComposeWorkflow as ReturnType<typeof vi.fn>;
    mockLoadAndCompose.mockResolvedValue({
      composed: {
        lazySkills: [{ id: "module-a", name: "op-module-a", description: "d", body: "body" }],
        text: "",
        orderedChunks: [],
        perVarSourceMap: {},
        sizeChars: 0,
        diagnostics: [],
      },
    });

    // Pre-create stale dir
    const staleDir = path.join(tmpdir, ".claude", "skills", "op-module-stale");
    await fs.mkdir(staleDir, { recursive: true });
    await fs.writeFile(path.join(staleDir, "SKILL.md"), "stale content", "utf8");

    const result = await emitLazySkills(
      fakeApp,
      { settings: fakeSettings as OpSettings, resolveIssue: () => fakeEntry },
      { issueId: "OP-1", destDir: tmpdir },
    );

    // Stale dir should be gone
    await expect(fs.stat(staleDir)).rejects.toThrow();
    expect(result.pruned).toContain(staleDir);
    // The new skill is still written
    const skillAPath = path.join(tmpdir, ".claude", "skills", "op-module-a", "SKILL.md");
    expect(await fs.readFile(skillAPath, "utf8")).toBeTruthy();
  });

  it("still writes SKILL.md for whitespace-body skills and reports them in emptyBodySkills", async () => {
    makeDeps(tmpdir);
    const mockLoadAndCompose = loadAndComposeWorkflow as ReturnType<typeof vi.fn>;
    mockLoadAndCompose.mockResolvedValue({
      composed: {
        lazySkills: [{ id: "empty-skill", name: "op-module-empty-skill", description: "d", body: "  " }],
        text: "",
        orderedChunks: [],
        perVarSourceMap: {},
        sizeChars: 0,
        diagnostics: [],
      },
    });

    const result = await emitLazySkills(
      fakeApp,
      { settings: fakeSettings as OpSettings, resolveIssue: () => fakeEntry },
      { issueId: "OP-1", destDir: tmpdir },
    );

    const skillPath = path.join(tmpdir, ".claude", "skills", "op-module-empty-skill", "SKILL.md");
    // SKILL.md is still written even though body is whitespace
    expect(await fs.readFile(skillPath, "utf8")).toBeTruthy();
    // emptyBodySkills contains the skill's name
    expect(result.emptyBodySkills).toContain("op-module-empty-skill");
  });

  it("throws 'no destination' when destDir is absent and repo_path is undefined", async () => {
    const mockBuildIssueRenderContext = buildIssueRenderContext as ReturnType<typeof vi.fn>;
    const mockReadProjectVars = readProjectVars as ReturnType<typeof vi.fn>;
    // Return a context with no repo_path
    mockBuildIssueRenderContext.mockReturnValue({
      id: "OP-1",
      title: "Test issue",
      project: "testing",
      status: "open",
      parent: null,
      vault_path: "/vault",
      vault_name: "OP-Test",
      today: "2026-05-15",
      agent: "claude",
      mode: "kickoff",
      // repo_path intentionally absent
    });
    mockReadProjectVars.mockReturnValue({});
    const mockLoadAndCompose = loadAndComposeWorkflow as ReturnType<typeof vi.fn>;
    mockLoadAndCompose.mockResolvedValue({
      composed: {
        lazySkills: [],
        text: "",
        orderedChunks: [],
        perVarSourceMap: {},
        sizeChars: 0,
        diagnostics: [],
      },
    });

    await expect(
      emitLazySkills(
        fakeApp,
        { settings: fakeSettings as OpSettings, resolveIssue: () => fakeEntry },
        { issueId: "OP-1" /* no destDir */ },
      ),
    ).rejects.toThrow(/no destination/);
  });
});
