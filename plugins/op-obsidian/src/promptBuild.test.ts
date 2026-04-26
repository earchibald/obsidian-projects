import { describe, it, expect, vi } from "vitest";

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
import { agentizeBody } from "./agentizeBody";
import { buildPrompt } from "./promptBuild";
import type { AgentProfile } from "./agentProfiles";
import type { InjectionSettings } from "./settingsPure";
import type { IssueEntry } from "./types";
import type { IssueStore } from "./issueStore";
import {
  PLAN_PLACEHOLDER,
  INITIAL_EVAL_PLACEHOLDER,
  NOTES_PLACEHOLDER,
  SUMMARY_PLACEHOLDER,
} from "./issueTemplate";

const PLAN_EMPTY = "<!-- empty — write this section now, before making changes -->";
const INITIAL_EVAL_EMPTY =
  "<!-- empty — populated by the evaluator agent (op-evaluate) before planning -->";
const NOTES_EMPTY =
  "<!-- empty — append a ### <ID>.<N> block per task as work completes -->";
const SUMMARY_EMPTY = "<!-- empty — write this at /op:resolve time -->";

function skeleton(): string {
  return [
    "# Title",
    "",
    "## Plan",
    "",
    PLAN_PLACEHOLDER,
    "",
    "## Initial Evaluation",
    "",
    INITIAL_EVAL_PLACEHOLDER,
    "",
    "## Tasks",
    "",
    "## Notes",
    "",
    NOTES_PLACEHOLDER,
    "",
    "## Summary",
    "",
    SUMMARY_PLACEHOLDER,
    "",
  ].join("\n");
}

describe("agentizeBody", () => {
  it("replaces fresh-skeleton placeholders with empty-section comments", () => {
    const out = agentizeBody(skeleton());
    expect(out).toContain(PLAN_EMPTY);
    expect(out).toContain(INITIAL_EVAL_EMPTY);
    expect(out).toContain(NOTES_EMPTY);
    expect(out).toContain(SUMMARY_EMPTY);
    expect(out).not.toContain(PLAN_PLACEHOLDER);
    expect(out).not.toContain(INITIAL_EVAL_PLACEHOLDER);
    expect(out).not.toContain(NOTES_PLACEHOLDER);
    expect(out).not.toContain(SUMMARY_PLACEHOLDER);
  });

  it("Initial Evaluation collapses to empty comment when blank, preserves when filled", () => {
    const blank = ["# T", "", "## Initial Evaluation", "", "## Plan", ""].join("\n");
    expect(agentizeBody(blank)).toContain(INITIAL_EVAL_EMPTY);

    const filled = [
      "# T",
      "",
      "## Initial Evaluation",
      "",
      "Complexity: simple. Lands in foo.ts.",
      "",
      "## Plan",
      "",
    ].join("\n");
    const out = agentizeBody(filled);
    expect(out).toContain("Complexity: simple. Lands in foo.ts.");
    expect(out).not.toContain(INITIAL_EVAL_EMPTY);
  });

  it("preserves filled sections and fills only the empty ones (partial)", () => {
    const body = [
      "# T",
      "",
      "## Plan",
      "",
      "Real plan content here.",
      "",
      "## Notes",
      "",
      NOTES_PLACEHOLDER,
      "",
      "## Summary",
      "",
      SUMMARY_PLACEHOLDER,
      "",
    ].join("\n");
    const out = agentizeBody(body);
    expect(out).toContain("Real plan content here.");
    expect(out).not.toContain(PLAN_EMPTY);
    expect(out).toContain(NOTES_EMPTY);
    expect(out).toContain(SUMMARY_EMPTY);
  });

  it("leaves a fully filled body unchanged (no empty comments inserted)", () => {
    const body = [
      "# T",
      "",
      "## Plan",
      "",
      "plan body",
      "",
      "## Notes",
      "",
      "### OP-1.1 — did a thing",
      "",
      "## Summary",
      "",
      "shipped.",
      "",
    ].join("\n");
    const out = agentizeBody(body);
    expect(out).not.toContain(PLAN_EMPTY);
    expect(out).not.toContain(NOTES_EMPTY);
    expect(out).not.toContain(SUMMARY_EMPTY);
    expect(out).toContain("plan body");
    expect(out).toContain("### OP-1.1 — did a thing");
    expect(out).toContain("shipped.");
  });

  it("legacy bodies lacking the three sections pass through untouched", () => {
    const body = ["# T", "", "## Scope", "", "- [x] done", ""].join("\n");
    expect(agentizeBody(body)).toBe(body);
  });

  it("does not strip legitimate italic one-liners (false-positive guard)", () => {
    const body = [
      "# T",
      "",
      "## Plan",
      "",
      "_some legitimate aside_",
      "",
      "real content",
      "",
    ].join("\n");
    const out = agentizeBody(body);
    expect(out).toContain("_some legitimate aside_");
    expect(out).toContain("real content");
    expect(out).not.toContain(PLAN_EMPTY);
  });

  it("does not treat ^## inside a fenced code block as a section boundary", () => {
    const body = [
      "# T",
      "",
      "## Plan",
      "",
      "```md",
      "## Not a heading",
      "```",
      "",
      "## Summary",
      "",
      SUMMARY_PLACEHOLDER,
      "",
    ].join("\n");
    const out = agentizeBody(body);
    // Plan has real content (the fenced block) → no Plan empty comment
    expect(out).not.toContain(PLAN_EMPTY);
    expect(out).toContain("## Not a heading");
    expect(out).toContain(SUMMARY_EMPTY);
  });

  it("classifies whitespace-only section body as empty", () => {
    const body = ["## Plan", "", "", "## Tasks", ""].join("\n");
    const out = agentizeBody(body);
    expect(out).toContain(PLAN_EMPTY);
  });

  it("Scope and unknown sections pass through unchanged", () => {
    const body = [
      "## Scope",
      "",
      "- bullet",
      "",
      "## Random",
      "",
      "stuff",
      "",
    ].join("\n");
    const out = agentizeBody(body);
    expect(out).toContain("- bullet");
    expect(out).toContain("stuff");
  });
});

// ---------------------------------------------------------------------------
// buildPrompt — OP-198 (2a)
// ---------------------------------------------------------------------------

interface FakeFile {
  path: string;
  raw: string;
  /** Pass `null` to model "frontmatter exists but empty"; omit for "no metadata cache entry". */
  frontmatter?: Record<string, unknown> | null;
}

function makeFile(path: string): TFile {
  const basename = path.split("/").pop()!.replace(/\.md$/, "");
  const f = new TFile();
  Object.assign(f, { path, basename, name: `${basename}.md` });
  return f;
}

function fakeApp(files: FakeFile[], opts: { vaultName?: string } = {}) {
  const tfiles = files.map((f) => ({
    tfile: makeFile(f.path),
    raw: f.raw,
    fm: f.frontmatter,
  }));
  return {
    vault: {
      getName: () => opts.vaultName ?? "Test-Vault",
      getMarkdownFiles: () => tfiles.map((x) => x.tfile),
      getAbstractFileByPath: (path: string) => {
        const hit = tfiles.find((x) => x.tfile.path === path);
        return hit ? hit.tfile : null;
      },
      read: async (file: TFile) => {
        const hit = tfiles.find((x) => x.tfile === file);
        if (!hit) throw new Error(`fakeApp: missing raw for ${file.path}`);
        return hit.raw;
      },
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        const hit = tfiles.find((x) => x.tfile === file);
        if (!hit) return null;
        if (hit.fm === undefined) return null;
        return { frontmatter: hit.fm };
      },
    },
  } as any;
}

function fakeStore(): IssueStore {
  return {
    tasks: () => [],
    issues: () => [],
  } as unknown as IssueStore;
}

function profile(): AgentProfile {
  return {
    id: "claude",
    label: "Claude",
    binary: "claude",
    launchFlags: [],
    evaluateLaunchFlags: [],
    planLaunchFlags: [],
    reviewLaunchFlags: [],
    finalizeLaunchFlags: [],
    promptPreamble: "",
    evaluatePromptPreamble: "",
    planPromptPreamble: "",
    reviewPromptPreamble: "",
    finalizePromptPreamble: "",
    skillTrigger: "/op:issue {{id}}",
  };
}

function injection(over: Partial<InjectionSettings> = {}): InjectionSettings {
  return {
    injectBody: false,
    maxBodyChars: 8000,
    includeTasksList: false,
    includeRecentCommits: 0,
    extraPreamble: "",
    includeWorkflow: true,
    maxWorkflowChars: 50000,
    ...over,
  };
}

function entry(over: Partial<IssueEntry> = {}): IssueEntry {
  return {
    path: "Projects/demo/ISSUES/OP-1.md",
    type: "issue",
    id: "OP-1",
    project: "demo",
    status: "in-progress",
    title: "Demo issue",
    resolvedFolder: false,
    ...over,
  };
}

const WORKFLOW_BODY = "# Project workflow\n\nDo good things.";
const WORKFLOW_RAW = `---\nproject: demo\nupdated: 2026-04-26\n---\n${WORKFLOW_BODY}\n`;

function legacyWorkflowFiles(): FakeFile[] {
  return [
    {
      path: "Projects/demo/WORKFLOW.md",
      raw: WORKFLOW_RAW,
    },
  ];
}

describe("buildPrompt — OP-198 (2a)", () => {
  it("legacy default (workflowMode unset): inlines WORKFLOW.md verbatim — byte-identical reference", async () => {
    const app = fakeApp(legacyWorkflowFiles());
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      mode: "work",
      // workflowMode unset — default 'legacy'.
    });
    // Reference snapshot for the legacy code path. Drift in this assertion
    // means the legacy block changed shape, which OP-198 forbids.
    const REFERENCE_LEGACY =
      "/op:issue OP-1\n\n" +
      "## Project workflow\n\n" +
      "From Projects/demo/WORKFLOW.md:\n\n" +
      WORKFLOW_BODY +
      "\n\n" +
      "Issue: OP-1 — Demo issue\nProject: demo\nStatus: in-progress\nNote: /Users/me/vault/Projects/demo/ISSUES/OP-1.md";
    expect(out).toBe(REFERENCE_LEGACY);
  });

  it("legacy explicit (workflowMode='legacy'): byte-identical to the implicit default", async () => {
    const app = fakeApp(legacyWorkflowFiles());
    const implicit = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
    });
    const explicit = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "legacy",
    });
    expect(explicit).toBe(implicit);
  });

  it("modules mode: composer output replaces the legacy 'From Projects/.../WORKFLOW.md' blob", async () => {
    const app = fakeApp([
      // Modern WORKFLOW.md frontmatter (OP-196 schema).
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [{ step: "kickoff", modules: ["branching"] }],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
      // One global module covering the kickoff step.
      {
        path: "Projects/_op-modules/branching.md",
        frontmatter: {
          id: "branching",
          title: "Branching rules",
          type: "workflow-module",
          scope: "kickoff",
          vars: [],
        },
        raw: "---\n# yaml omitted\n---\nAlways work on a worktree off main for {{id}}.\n",
      },
    ]);
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
    });
    expect(out).toContain("## Project workflow\n\nAlways work on a worktree off main for OP-1.");
    // The legacy "From Projects/.../WORKFLOW.md:" header is NOT present —
    // composer output supplants it.
    expect(out).not.toContain("From Projects/demo/WORKFLOW.md:");
  });

  it("modules mode threads workflowVars through the Global precedence layer", async () => {
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [{ step: "kickoff", modules: ["intro"] }],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
      {
        path: "Projects/_op-modules/intro.md",
        frontmatter: {
          id: "intro",
          title: "Intro",
          type: "workflow-module",
          scope: "kickoff",
          vars: [{ name: "reviewer_handle", kind: "bare" }],
        },
        raw: "---\n# yaml omitted\n---\nAsk {{vars.reviewer_handle}} for review.\n",
      },
    ]);
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowVars: { reviewer_handle: "@you" },
    });
    expect(out).toContain("Ask @you for review.");
  });

  it("modules mode falls back to legacy block when WORKFLOW.md is missing", async () => {
    // No WORKFLOW.md on disk — composer returns null. Caller falls through
    // to the legacy `## Project workflow` block, which itself emits nothing
    // because there's no file to inline. Net: no workflow section at all.
    const app = fakeApp([]);
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
    });
    expect(out).not.toContain("## Project workflow");
    // Header still emitted.
    expect(out).toContain("Issue: OP-1 — Demo issue");
  });

  it("modules mode: empty kickoff step (modules:[]) suppresses section — does NOT fall back to legacy", async () => {
    // WORKFLOW.md exists, step is found, but `modules: []` — the composer
    // returns an empty ComposedPrompt (text: ''). The caller must suppress
    // the section without injecting the legacy inline blob. A user who opts
    // into modules mode with an empty kickoff step is explicitly requesting
    // no workflow injection at that step — silently getting the old inline
    // blob would be surprising.
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [{ step: "kickoff", modules: [] }],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
    ]);
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
    });
    // No workflow section at all — neither the legacy blob nor an empty header.
    expect(out).not.toContain("## Project workflow");
    // Header and meta still present.
    expect(out).toContain("Issue: OP-1 — Demo issue");
  });

  it("modules mode: workflowStep param selects a non-kickoff step (OP-199 readiness)", async () => {
    // Pre-wires the `workflowStep` param so OP-199 can pass 'plan' / 'review'
    // without a signature change. Here we verify that 'plan' reads the plan
    // step's modules, not the kickoff ones.
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [
            { step: "kickoff", modules: ["kickoff-only"] },
            { step: "plan", modules: ["plan-only"] },
          ],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
      {
        path: "Projects/_op-modules/kickoff-only.md",
        frontmatter: {
          id: "kickoff-only",
          title: "Kickoff",
          type: "workflow-module",
          scope: "kickoff",
          vars: [],
        },
        raw: "---\n# yaml omitted\n---\nKickoff content.\n",
      },
      {
        path: "Projects/_op-modules/plan-only.md",
        frontmatter: {
          id: "plan-only",
          title: "Plan",
          type: "workflow-module",
          scope: "plan",
          vars: [],
        },
        raw: "---\n# yaml omitted\n---\nPlan content.\n",
      },
    ]);
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: "plan",
    });
    expect(out).toContain("Plan content.");
    expect(out).not.toContain("Kickoff content.");
  });

  it("modules mode: when composer succeeds, includeWorkflow=false suppresses just like legacy", async () => {
    // includeWorkflow gates the entire workflow branch, modules or otherwise.
    const app = fakeApp(legacyWorkflowFiles());
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection({ includeWorkflow: false }),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
    });
    expect(out).not.toContain("## Project workflow");
  });
});
