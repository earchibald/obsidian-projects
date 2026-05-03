import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("obsidian", () => {
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  return {
    TFile,
    normalizePath: (p: string) => p.replace(/\/+/g, "/").replace(/\/$/g, ""),
  };
});

import { TFile } from "obsidian";
import { loadModuleSources } from "./composeWorkflow";
import { composeWorkflow } from "./composeWorkflowPure";
import type { RenderContext } from "./pluginVarRegistry";
import { worktreeBranchName } from "./worktreeBranch";

// End-to-end integration test for OP-197. Drives the FM-parser → loader →
// composer → renderer chain against a realistic 3-step workflow fixture and
// asserts the composed output is byte-equivalent to a golden snapshot. Drift
// in the snapshot fails CI — this is the canonical guardrail for the whole
// pipeline.
//
// To intentionally re-bake the snapshot after a behavioural change:
//   npm test -- -u plugins/op-obsidian/src/integration.test.ts
//
// Fixture layout (under `__fixtures__/integration/`):
//   global-modules/branching.md           → vault: Projects/_op-modules/branching.md
//   global-modules/version-cadence.md     → vault: Projects/_op-modules/version-cadence.md
//   per-project/MODULES/plan-rules.md     → vault: Projects/fixture-project/MODULES/plan-rules.md
//   per-project/MODULES/review-and-merge.md → vault: Projects/fixture-project/MODULES/review-and-merge.md
//   _op-workflow.md                        → vault: Projects/_op-workflow.md (global default workflow)
//   per-project/WORKFLOW.md                → vault: Projects/fixture-project/WORKFLOW.md (extends global)
//   composed.snapshot.md                   → byte-equivalent expected composed output
//
// The fixture's frontmatter is hand-mirrored into `FIXTURE_FILES` below
// because vitest's mocked `obsidian` module doesn't ship a YAML parser; the
// loaders read frontmatter from `metadataCache.getFileCache(file)?.frontmatter`,
// which the fakeApp returns directly without parsing the raw file's fence.
// Bodies are read from disk so any tweak to the fixture body files
// re-shapes the snapshot automatically — the rendering logic is what we're
// guarding here, not YAML parsing.

const FIXTURE_ROOT = join(__dirname, "__fixtures__", "integration");

interface FixtureFile {
  vaultPath: string;
  diskPath: string;
  frontmatter: Record<string, unknown>;
}

const FIXTURE_FILES: FixtureFile[] = [
  {
    vaultPath: "Projects/_op-modules/branching.md",
    diskPath: join(FIXTURE_ROOT, "global-modules", "branching.md"),
    frontmatter: {
      id: "branching",
      title: "Always work in a git worktree",
      type: "workflow-module",
      scope: "kickoff",
      order: 10,
    },
  },
  {
    vaultPath: "Projects/_op-modules/version-cadence.md",
    diskPath: join(FIXTURE_ROOT, "global-modules", "version-cadence.md"),
    frontmatter: {
      id: "version-cadence",
      title: "Version bump cadence",
      type: "workflow-module",
      scope: "kickoff",
      order: 20,
      vars: ["package_name=op-obsidian"],
    },
  },
  {
    vaultPath: "Projects/fixture-project/MODULES/plan-rules.md",
    diskPath: join(FIXTURE_ROOT, "per-project", "MODULES", "plan-rules.md"),
    frontmatter: {
      id: "plan-rules",
      title: "Plan-mode rules for fixture project",
      type: "workflow-module",
      scope: "plan",
      order: 10,
      vars: ["max_files=10", "reviewer_handle"],
    },
  },
  {
    vaultPath: "Projects/fixture-project/MODULES/review-and-merge.md",
    diskPath: join(FIXTURE_ROOT, "per-project", "MODULES", "review-and-merge.md"),
    frontmatter: {
      id: "review-and-merge",
      title: "Adversarial review then merge",
      type: "workflow-module",
      scope: "review",
      order: 10,
    },
  },
  {
    vaultPath: "Projects/_op-workflow.md",
    diskPath: join(FIXTURE_ROOT, "_op-workflow.md"),
    frontmatter: {
      type: "workflow",
      schema: 1,
      project: "fixture-project",
      default_agent: "claude",
      default_model: "opus",
      steps: [{ step: "kickoff", modules: ["branching", "version-cadence"] }],
    },
  },
  {
    vaultPath: "Projects/fixture-project/WORKFLOW.md",
    diskPath: join(FIXTURE_ROOT, "per-project", "WORKFLOW.md"),
    frontmatter: {
      type: "workflow",
      schema: 1,
      project: "fixture-project",
      default_agent: "claude",
      default_model: "opus",
      extends: "Projects/_op-workflow.md",
      steps: [
        { step: "plan", modules: ["plan-rules"] },
        { step: "review", modules: ["review-and-merge"] },
      ],
    },
  },
];

function makeFile(path: string): TFile {
  const basename = path.split("/").pop()!.replace(/\.md$/, "");
  const f = new TFile();
  Object.assign(f, { path, basename, name: `${basename}.md` });
  return f;
}

function buildFakeApp() {
  const tfiles = FIXTURE_FILES.map((ff) => ({
    tfile: makeFile(ff.vaultPath),
    raw: readFileSync(ff.diskPath, "utf8"),
    fm: ff.frontmatter,
  }));

  return {
    vault: {
      getMarkdownFiles: () => tfiles.map((x) => x.tfile),
      getAbstractFileByPath: (p: string) => tfiles.find((x) => x.tfile.path === p)?.tfile ?? null,
      read: async (file: TFile) => tfiles.find((x) => x.tfile === file)!.raw,
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        const hit = tfiles.find((x) => x.tfile === file);
        if (!hit || !hit.fm) return null;
        return { frontmatter: hit.fm };
      },
    },
  } as any;
}

const RENDER_CTX: RenderContext = {
  id: "OP-FIX-1",
  title: "Integration fixture issue",
  project: "fixture-project",
  status: "in-progress",
  priority: "high",
  parent: "OP-FIX-PARENT",
  pr_url: "https://github.com/example/repo/pull/42",
  github_issue: undefined,
  repo_path: "/repo",
  vault_path: "/vault",
  vault_name: "Agent-Vault",
  branch: worktreeBranchName("OP-FIX-1", "Integration fixture issue"),
  today: "2026-04-26",
  agent: "claude",
  model: "claude-opus-4-7",
  mode: "kickoff",
};

describe("end-to-end integration: load + compose 3-step workflow against golden snapshot", () => {
  it("loads modules + workflow (with extends:), composes each step, snapshots match", async () => {
    const app = buildFakeApp();

    const bundle = await loadModuleSources(app, { project: "fixture-project" });
    expect(bundle.workflow).not.toBeNull();
    // Loader-level diagnostics: no errors. Warnings are acceptable (the
    // workflow merge surfaces a diagnostic when the parent file's project
    // doesn't exactly match the child's expected slug — fine here).
    expect(bundle.diagnostics.find((d) => d.severity === "error")).toBeUndefined();

    // Workflow extends the global default → merged step list is
    // [kickoff (parent), plan (child), review (child)].
    expect(bundle.workflow!.steps.map((s) => s.step)).toEqual(["kickoff", "plan", "review"]);

    const ctxBase = {
      render: RENDER_CTX,
      launchVars: {
        reviewer_handle: "@earchibald",
      },
    };

    const composedKickoff = composeWorkflow({
      loadedModules: bundle.loadedModules,
      workflow: bundle.workflow!,
      step: "kickoff",
      ctx: { ...ctxBase, render: { ...RENDER_CTX, mode: "kickoff" } },
    });
    const composedPlan = composeWorkflow({
      loadedModules: bundle.loadedModules,
      workflow: bundle.workflow!,
      step: "plan",
      ctx: { ...ctxBase, render: { ...RENDER_CTX, mode: "plan" } },
    });
    const composedReview = composeWorkflow({
      loadedModules: bundle.loadedModules,
      workflow: bundle.workflow!,
      step: "review",
      ctx: { ...ctxBase, render: { ...RENDER_CTX, mode: "review" } },
    });

    // Sanity: every step produced text and no error-severity diagnostics.
    expect(composedKickoff.text.length).toBeGreaterThan(0);
    expect(composedPlan.text.length).toBeGreaterThan(0);
    expect(composedReview.text.length).toBeGreaterThan(0);
    for (const c of [composedKickoff, composedPlan, composedReview]) {
      const errs = c.diagnostics.filter((d) => d.severity === "error");
      expect(errs).toEqual([]);
    }

    // Build the snapshot text — combines all three composed steps with
    // delimiters so a diff-on-failure is human-readable.
    const snapshot = [
      "## STEP: kickoff",
      "",
      composedKickoff.text,
      "",
      "## STEP: plan",
      "",
      composedPlan.text,
      "",
      "## STEP: review",
      "",
      composedReview.text,
      "",
    ].join("\n");

    await expect(snapshot).toMatchFileSnapshot(
      join(FIXTURE_ROOT, "composed.snapshot.md"),
    );
  });
});
