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
    postLaunchCommands: [],
    evaluatePostLaunchCommands: [],
    planPostLaunchCommands: [],
    reviewPostLaunchCommands: [],
    finalizePostLaunchCommands: [],
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

describe("buildPrompt — OP-198 (2a) / OP-208 (8a, cutover)", () => {
  it("OP-208 cutover: vanilla WORKFLOW.md (no workflow-schema frontmatter) routes through the composer's legacy-fallback ladder and inlines the body", async () => {
    // Pre-OP-208 the buildPrompt legacy `else` branch read WORKFLOW.md
    // verbatim under a `From <path>:` preamble. Post-cutover that branch is
    // gone — vanilla WORKFLOW.md is classified as a legacy shape by
    // `workflowFile.ts` and synthesised into a kickoff step whose
    // `legacyKickoffBody` is the entire body. The composer splices it
    // verbatim, so the user-visible workflow content survives the cutover.
    // The exact byte format differs from the pre-cutover reference (no
    // `From <path>:` preamble) — that drift is expected and intentional.
    const app = fakeApp(legacyWorkflowFiles());
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      mode: "work",
    });
    expect(out).toContain("## Project workflow");
    expect(out).toContain(WORKFLOW_BODY);
    // Header still emitted.
    expect(out).toContain("Issue: OP-1 — Demo issue");
    expect(out).toContain("Note: /Users/me/vault/Projects/demo/ISSUES/OP-1.md");
  });

  it("OP-208 cutover: explicit workflowMode='legacy' is now byte-identical to the implicit default (gate is dead in buildPrompt)", async () => {
    // The `workflowMode` arg no longer gates buildPrompt's behaviour; it's
    // kept on `BuildPromptArgs` only because `launchAgentModal` still uses it
    // for UI panel affordances. Confirming the implicit and 'legacy'-explicit
    // outputs are byte-identical guards against accidentally re-introducing
    // the gate.
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

  it("OP-208 cutover: shape-4 WORKFLOW.md (type: <other>) synthesises body instead of being dropped", async () => {
    // Pre-OP-208, the legacy inline blob read WORKFLOW.md verbatim via
    // stripFrontmatter — `type: project` (shape 4) would have been read and
    // its body inlined. Post-cutover the legacy blob is gone, so a shape-4
    // file that previously got content inlined would silently lose it.
    // Fix: workflowFile.ts now synthesises shape 4 like shapes 1/2/3/5 so
    // the body is preserved (with a warning diagnostic to signal the author
    // should fix the type field).
    const shape4Body = "# Workflow\n\nDo the thing.";
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        raw: `---\ntype: note\n---\n${shape4Body}\n`,
        frontmatter: { type: "note" },
      },
    ]);
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      mode: "work",
    });
    expect(out).toContain("## Project workflow");
    expect(out).toContain(shape4Body);
    expect(out).toContain("Issue: OP-1 — Demo issue");
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

  it("no WORKFLOW.md on disk → composer returns null → no workflow section emitted", async () => {
    // Pre-OP-208 this test described "modules mode falls back to legacy block
    // when WORKFLOW.md is missing" — the legacy fallback also emitted nothing
    // because there was no file to inline. Post-cutover the fallback is gone;
    // the composer's null return means "no WORKFLOW.md", and the section is
    // simply suppressed. Net behaviour is unchanged: no workflow section.
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

// ---------------------------------------------------------------------------
// buildPrompt — OP-199 (2b): per-mode injection + launch context
// ---------------------------------------------------------------------------

import { composeWorkflowSection } from "./promptBuild";

/**
 * Workflow file with one step per mode + a kickoff step. Each step's only
 * module emits a unique sentinel string so the test asserts which step
 * actually composed.
 */
function perModeWorkflowFiles(): FakeFile[] {
  const steps = ["kickoff", "evaluate", "plan", "implement", "review", "finalize"];
  const files: FakeFile[] = [
    {
      path: "Projects/demo/WORKFLOW.md",
      frontmatter: {
        type: "workflow",
        schema: 1,
        project: "demo",
        default_agent: "claude",
        default_model: "opus",
        steps: steps.map((s) => ({ step: s, modules: [`${s}-mod`] })),
      },
      raw: "---\n# yaml omitted\n---\n",
    },
  ];
  for (const s of steps) {
    files.push({
      path: `Projects/_op-modules/${s}-mod.md`,
      frontmatter: {
        id: `${s}-mod`,
        title: `${s} module`,
        type: "workflow-module",
        scope: s,
        vars: [],
      },
      raw: `---\n# yaml omitted\n---\nSTEP=${s}\n`,
    });
  }
  return files;
}

describe("buildPrompt — OP-199 (2b)", () => {
  it.each([
    ["evaluate", "STEP=evaluate"],
    ["plan", "STEP=plan"],
    ["implement", "STEP=implement"],
    ["review", "STEP=review"],
    ["finalize", "STEP=finalize"],
  ])("workflowStep='%s' composes its own step's modules", async (step, expected) => {
    const app = fakeApp(perModeWorkflowFiles());
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: step,
    });
    expect(out).toContain(expected);
    // Sibling steps must not bleed in.
    for (const sibling of ["evaluate", "plan", "implement", "review", "finalize"]) {
      if (sibling === step) continue;
      expect(out).not.toContain(`STEP=${sibling}`);
    }
  });

  it("lenient kickoff fallback: workflow has only 'kickoff', non-kickoff step requested → kickoff content composes", async () => {
    // Authors who haven't migrated to per-mode steps still get the kickoff
    // content at every mode launch.
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [{ step: "kickoff", modules: ["kickoff-only"] }],
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
        raw: "---\n# yaml omitted\n---\nKickoff fallback content.\n",
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
    expect(out).toContain("Kickoff fallback content.");
  });

  it("explicit-suppress preserved: step exists with modules:[] → no fallback to kickoff", async () => {
    // OP-198 contract — author-defined empty step suppresses the section
    // entirely. The lenient fallback must NOT trigger here.
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
            { step: "plan", modules: [] },
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
        raw: "---\n# yaml omitted\n---\nKickoff content (must NOT bleed in).\n",
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
    expect(out).not.toContain("## Project workflow");
    expect(out).not.toContain("Kickoff content (must NOT bleed in).");
  });

  it("launch-context fields populate {{repo_path}}, {{branch}}, {{parent}} in module bodies", async () => {
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [{ step: "implement", modules: ["context"] }],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
      {
        path: "Projects/_op-modules/context.md",
        frontmatter: {
          id: "context",
          title: "Context",
          type: "workflow-module",
          scope: "implement",
          vars: [],
        },
        raw:
          "---\n# yaml omitted\n---\n" +
          "repo={{repo_path}} branch={{branch}} parent={{parent}}\n",
      },
    ]);
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: "implement",
      repoPath: "/Users/me/Projects/demo",
      branch: "feature/op-199",
      parentId: "OP-185",
    });
    expect(out).toContain("repo=/Users/me/Projects/demo");
    expect(out).toContain("branch=feature/op-199");
    expect(out).toContain("parent=OP-185");
  });

  it("parent: null renders {{parent}} as PARENT_NONE_SENTINEL", async () => {
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [{ step: "implement", modules: ["par"] }],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
      {
        path: "Projects/_op-modules/par.md",
        frontmatter: {
          id: "par",
          title: "Par",
          type: "workflow-module",
          scope: "implement",
          vars: [],
        },
        raw: "---\n# yaml omitted\n---\nparent={{parent}}\n",
      },
    ]);
    const out = await buildPrompt(app, fakeStore(), {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: "implement",
      // parentId omitted → null in render context.
    });
    // PARENT_NONE_SENTINEL = "(none — this is a top-level issue)"
    expect(out).toContain("parent=(none — this is a top-level issue)");
  });
});

describe("composeWorkflowSection — OP-199 (2b)", () => {
  it("returns the composed `## Project workflow\\n\\n…` section directly (for evaluator-style callers)", async () => {
    const app = fakeApp(perModeWorkflowFiles());
    const section = await composeWorkflowSection(app, {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: "evaluate",
    });
    expect(section).toBe("## Project workflow\n\nSTEP=evaluate");
  });

  it("returns null when WORKFLOW.md is missing (caller falls back to legacy)", async () => {
    const app = fakeApp([]);
    const section = await composeWorkflowSection(app, {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: "evaluate",
    });
    expect(section).toBeNull();
  });

  it("returns '' when the requested step exists but is empty (explicit-suppress)", async () => {
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [{ step: "evaluate", modules: [] }],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
    ]);
    const section = await composeWorkflowSection(app, {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: "evaluate",
    });
    expect(section).toBe("");
  });

  it("returns '' (not kickoff) when step's modules all have unknown ids — broken config suppresses, doesn't fallback", async () => {
    // OP-199 adversarial test (#2): a step whose modules all fail to load with
    // `unknown-module` diagnostics is distinct from "step absent". The step IS
    // defined in the workflow, so we honour the explicit-suppress contract and
    // return "" rather than falling back to kickoff — the author should fix the
    // broken module references, not silently get kickoff content instead.
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
            { step: "evaluate", modules: ["does-not-exist"] },
            { step: "kickoff", modules: ["kickoff-mod"] },
          ],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
      {
        path: "Projects/_op-modules/kickoff-mod.md",
        frontmatter: {
          id: "kickoff-mod",
          title: "Kickoff",
          type: "workflow-module",
          scope: "kickoff",
          vars: [],
        },
        raw: "---\n# yaml omitted\n---\nKickoff content (must NOT bleed in).\n",
      },
    ]);
    const section = await composeWorkflowSection(app, {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: "evaluate",
    });
    // Step "evaluate" is defined (it just has a broken module reference).
    // Returns "" — explicit-suppress contract. Kickoff must NOT bleed in.
    expect(section).toBe("");
  });
});

describe("composeWorkflowSection lazy skills (OP-192)", () => {
  // Shared workflow + module fixture: one inline module ("Inline") and one lazy
  // module ("tmux"). The lazy module has `lazy: true` and a `description`.
  function lazyFiles(): FakeFile[] {
    return [
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [{ step: "kickoff", modules: ["inline-mod", "tmux"] }],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
      {
        path: "Projects/_op-modules/inline-mod.md",
        frontmatter: {
          id: "inline-mod",
          title: "Inline",
          type: "workflow-module",
          scope: "kickoff",
          vars: [],
        },
        raw: "---\n# yaml omitted\n---\nInline\n",
      },
      {
        path: "Projects/_op-modules/tmux.md",
        frontmatter: {
          id: "tmux",
          title: "op-module-tmux",
          type: "workflow-module",
          scope: "kickoff",
          lazy: true,
          description: "d",
          vars: [],
        },
        raw: "---\n# yaml omitted\n---\nLAZY BODY\n",
      },
    ];
  }

  it("Case A: repoPath set → pointer block emitted; lazy body NOT inlined", async () => {
    const app = fakeApp(lazyFiles());
    const section = await composeWorkflowSection(app, {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: "kickoff",
      repoPath: "/wt",
    });
    // Inline module content must be present.
    expect(section).toContain("Inline");
    // Lazy body must NOT be inlined.
    expect(section).not.toContain("LAZY BODY");
    // Pointer block must reference the CLI command.
    expect(section).toContain("op-emit-lazy-skills");
    // Pointer block must include the dir=$(pwd) snippet.
    expect(section).toContain('dir="$(pwd)"');
    // Pointer block must include the issue id.
    expect(section).toContain("issue=OP-1");
  });

  it("Case B: repoPath undefined → lazy body inlined with no-working-directory note", async () => {
    const app = fakeApp(lazyFiles());
    const section = await composeWorkflowSection(app, {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: "kickoff",
      // repoPath deliberately omitted (meta-only)
    });
    // Lazy body must be present (inlined fallback).
    expect(section).toContain("LAZY BODY");
    // Heading for the inlined-because-no-working-dir block.
    expect(section).toContain("## Optional reference");
    // Inline module content must still be present.
    expect(section).toContain("Inline");
  });
});

describe("composeWorkflowSection — OP-199 (2b) repoPath undefined (#10)", () => {
  it.each([
    ["evaluate"],
    ["plan"],
    ["implement"],
    ["review"],
    ["finalize"],
  ])("mode '%s' step composes correctly when repoPath is undefined (meta-only project)", async (step) => {
    // Modules that reference {{repo_path}} / {{branch}} get missing-var
    // diagnostics but the section is still returned — launch context is
    // best-effort, not a hard gate on composition.
    const app = fakeApp([
      {
        path: "Projects/demo/WORKFLOW.md",
        frontmatter: {
          type: "workflow",
          schema: 1,
          project: "demo",
          default_agent: "claude",
          default_model: "opus",
          steps: [{ step, modules: [`${step}-mod`] }],
        },
        raw: "---\n# yaml omitted\n---\n",
      },
      {
        path: `Projects/_op-modules/${step}-mod.md`,
        frontmatter: {
          id: `${step}-mod`,
          title: `${step} module`,
          type: "workflow-module",
          scope: step,
          vars: [],
        },
        raw: `---\n# yaml omitted\n---\nSTEP=${step} repo={{repo_path}}\n`,
      },
    ]);
    const section = await composeWorkflowSection(app, {
      entry: entry(),
      profile: profile(),
      injection: injection(),
      vaultBasePath: "/Users/me/vault",
      workflowMode: "modules",
      workflowStep: step,
      // repoPath deliberately omitted (meta-only project)
      // branch deliberately omitted
    });
    // Step content is present even without repoPath.
    expect(section).toContain(`STEP=${step}`);
    // {{repo_path}} is left verbatim when repoPath is absent (missing-var
    // contract: soft failure, never a silent corruption or blank).
    expect(section).toContain("{{repo_path}}");
  });
});
