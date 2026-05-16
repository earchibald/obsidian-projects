# Lazy Skill Emission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a workflow module flagged `lazy: true` be materialized as an on-demand Claude Code skill the agent pulls into its worktree, instead of burning kickoff context inlining it.

**Architecture:** Pure schema/composer changes partition `lazy` modules out of the inlined prompt into a `ComposedPrompt.lazySkills[]` data array (vars fully resolved, one `info` diagnostic each). A new `op-emit-lazy-skills` CLI — invoked by the agent from inside its worktree — recomposes the kickoff step and writes each lazy skill to `<dir>/.claude/skills/op-module-<id>/SKILL.md` with a self-ignoring `.gitignore`, pruning orphans. `composeWorkflowSection` appends a 3-line pointer at kickoff (or inlines the bodies when the project has no working dir).

**Tech Stack:** TypeScript, Obsidian plugin API, vitest, Node `fs`/`path`. Strict pure/IO split (mirror `composeWorkflowPure.ts` ↔ `composeWorkflow.ts`).

**Spec:** `docs/superpowers/specs/2026-05-15-lazy-skill-emission-design.md`

**Test commands:** from `plugins/op-obsidian/`: `npx vitest run <file>` (single file), `npm test` (full suite), `npm run build` (esbuild). All paths below are relative to `plugins/op-obsidian/` unless absolute.

---

### Task 1: Schema — `lazy` + `description` on workflow modules

**Files:**
- Modify: `src/workflowModulePure.ts` (`WorkflowModule` interface ~line 59; `parseModule` ~line 378–417)
- Modify: `src/workflowDiagnostic.ts` (`WorkflowDiagnosticCode` union ~line 10–22)
- Test: `src/workflowModulePure.test.ts`

- [ ] **Step 1: Add the `lazy-skill` diagnostic code**

In `src/workflowDiagnostic.ts`, add to the `WorkflowDiagnosticCode` union (after `"size-budget"`):

```ts
  | "size-budget"
  // OP-192: emitted when a `lazy: true` module is partitioned out of the
  // inlined prompt into a skill (`info`), or when such a module lacks a
  // `description:` and falls back to its title (`warning`).
  | "lazy-skill";
```

- [ ] **Step 2: Write failing tests for the schema fields**

Append to `src/workflowModulePure.test.ts`:

```ts
describe("parseModule lazy + description (OP-192)", () => {
  const baseFm = { id: "m", title: "M", type: "workflow-module", scope: "kickoff" };
  const src = { kind: "global" as const, path: "Projects/_op-modules/m.md" };

  it("defaults lazy to false and description to undefined", () => {
    const r = parseModule({ id: "m", frontmatter: { ...baseFm }, source: src });
    expect(r.module).not.toBeNull();
    expect(r.module!.lazy).toBe(false);
    expect(r.module!.description).toBeUndefined();
  });

  it("accepts lazy: true and a string description", () => {
    const r = parseModule({
      id: "m",
      frontmatter: { ...baseFm, lazy: true, description: "tmux gotchas catalog" },
      source: src,
    });
    expect(r.module!.lazy).toBe(true);
    expect(r.module!.description).toBe("tmux gotchas catalog");
  });

  it("rejects non-boolean lazy without coercion (still loadable)", () => {
    const r = parseModule({ id: "m", frontmatter: { ...baseFm, lazy: "true" }, source: src });
    expect(r.module).toBeNull();
    expect(r.diagnostics.some(d => d.code === "malformed-frontmatter" && /lazy/.test(d.message))).toBe(true);
  });

  it("rejects non-string description", () => {
    const r = parseModule({ id: "m", frontmatter: { ...baseFm, description: 42 }, source: src });
    expect(r.module).toBeNull();
    expect(r.diagnostics.some(d => d.code === "malformed-frontmatter" && /description/.test(d.message))).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/workflowModulePure.test.ts -t "OP-192"`
Expected: FAIL — `r.module!.lazy` is `undefined` (field not parsed yet).

- [ ] **Step 4: Add the fields to the interface and parser**

In `src/workflowModulePure.ts`, add to the `WorkflowModule` interface (after `order: number;`):

```ts
  /** OP-192: when true, this module is emitted as an on-demand skill instead
   *  of being inlined into the composed prompt. Default false. */
  lazy: boolean;
  /** OP-192: one-line activation hint used as the emitted skill's
   *  `description:`. Optional; lazy modules without it fall back to `title`. */
  description?: string;
```

In `parseModule`, after the `order` block (ends ~line 388, before `const varsResult =`):

```ts
  let lazy = false;
  if (Object.prototype.hasOwnProperty.call(frontmatter, "lazy")) {
    const v = frontmatter.lazy;
    if (v !== undefined && v !== null) {
      if (typeof v !== "boolean") {
        diagnostics.push(invalidFieldDiag(path, id, "lazy", v, "boolean"));
      } else {
        lazy = v;
      }
    }
  }

  let description: string | undefined;
  if (Object.prototype.hasOwnProperty.call(frontmatter, "description")) {
    const v = frontmatter.description;
    if (v !== undefined && v !== null) {
      if (typeof v !== "string") {
        diagnostics.push(invalidFieldDiag(path, id, "description", v, "string"));
      } else if (v.trim().length > 0) {
        description = v;
      }
    }
  }
```

Then add both to the constructed `module` object (after `order,`):

```ts
    order,
    lazy,
    ...(description !== undefined ? { description } : {}),
    vars: varsResult.decls,
```

Note: `invalidFieldDiag` pushes a hard-fail diagnostic, so a bad `lazy`/`description` makes `parseModule` return `module: null` via the existing `hardFail` check — matching the test expectations.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/workflowModulePure.test.ts`
Expected: PASS (all existing + new OP-192 cases).

- [ ] **Step 6: Commit**

```bash
git add src/workflowModulePure.ts src/workflowDiagnostic.ts src/workflowModulePure.test.ts
git commit -m "OP-192: parse lazy + description on workflow modules

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Pure composer — partition lazy modules into `lazySkills`

**Files:**
- Modify: `src/composeWorkflowPure.ts` (`ComposedPrompt` ~line 88; `composeWorkflow` loop ~line 475–499; `finaliseComposed` ~line 512; `emptyComposed` ~line 536)
- Test: `src/composeWorkflowPure.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/composeWorkflowPure.test.ts` (reuse the file's existing test helpers — `makeModule`/`makeWorkflow`-style builders already present near the top of that file; match their signatures):

```ts
describe("lazy skill partition (OP-192)", () => {
  it("excludes lazy modules from text/orderedChunks and emits them as lazySkills with an info diagnostic", () => {
    const normal = loaded({ id: "intro", scope: "kickoff", body: "Normal body" });
    const lazyMod = loaded({
      id: "tmux", scope: "kickoff", lazy: true,
      description: "tmux gotchas catalog", body: "Lazy body {{id}}",
    });
    const wf = workflowWith("kickoff", ["intro", "tmux"]);
    const r = composeWorkflow({
      loadedModules: [normal, lazyMod], workflow: wf, step: "kickoff",
      ctx: { render: renderCtx({ id: "OP-1" }) },
    });
    expect(r.text).toBe("Normal body");
    expect(r.orderedChunks.map(c => c.moduleId)).toEqual(["intro"]);
    expect(r.lazySkills).toEqual([
      { id: "tmux", name: "op-module-tmux", description: "tmux gotchas catalog", body: "Lazy body OP-1" },
    ]);
    expect(r.diagnostics.some(d => d.code === "lazy-skill" && d.severity === "info" && d.moduleId === "tmux")).toBe(true);
  });

  it("falls back to title with a lazy-skill warning when a lazy module has no description", () => {
    const lazyMod = loaded({ id: "tmux", scope: "kickoff", lazy: true, title: "Tmux Notes", body: "Body" });
    const wf = workflowWith("kickoff", ["tmux"]);
    const r = composeWorkflow({ loadedModules: [lazyMod], workflow: wf, step: "kickoff", ctx: { render: renderCtx({}) } });
    expect(r.lazySkills[0].description).toBe("Tmux Notes");
    expect(r.diagnostics.some(d => d.code === "lazy-skill" && d.severity === "warning" && /no .description/.test(d.message))).toBe(true);
  });
});
```

> If the existing test file uses different builder names, adapt `loaded`/`workflowWith`/`renderCtx` to whatever that file already defines (it has helpers that build `LoadedModule`, a `WorkflowFile`, and a `RenderContext`). Do NOT introduce new builders if equivalents exist — reuse keeps the suite DRY.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/composeWorkflowPure.test.ts -t "lazy skill partition"`
Expected: FAIL — `r.lazySkills` is `undefined`.

- [ ] **Step 3: Add the `LazySkill` type and field to `ComposedPrompt`**

In `src/composeWorkflowPure.ts`, after the `ComposedChunk` interface (~line 84):

```ts
/**
 * One `lazy: true` module, fully rendered, ready to be written as a Claude
 * Code skill by the IO layer (`emitLazySkills.ts`). Not part of the inlined
 * prompt `text`.
 */
export interface LazySkill {
  /** Module id (post-shadowing). */
  id: string;
  /** Derived, Claude-Code-valid skill name (`op-module-<id>` slugified). */
  name: string;
  /** SKILL.md `description:` — module.description, else module.title. */
  description: string;
  /** Fully var-resolved module body. */
  body: string;
}
```

Add to the `ComposedPrompt` interface (after `orderedChunks: ComposedChunk[];`):

```ts
  /** OP-192: `lazy: true` modules, partitioned out of `text`. Empty when no
   *  composed module is lazy. */
  lazySkills: LazySkill[];
```

- [ ] **Step 4: Import the slugifier and partition in the compose loop**

At the top of `src/composeWorkflowPure.ts`, add to the imports:

```ts
import { slugifySkillName } from "./lazySkillPure";
```

> `slugifySkillName` is created in Task 3. Tasks may be implemented out of order; if Task 3 is not yet done, create a minimal `src/lazySkillPure.ts` exporting `export function slugifySkillName(id: string): string { return ("op-module-" + id).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 64); }` — Task 3 replaces it with the tested version and adds the renderer.

Replace the `orderedChunks` build loop (currently ~line 475–491):

```ts
  const orderedChunks: ComposedChunk[] = [];
  const lazySkills: LazySkill[] = [];
  for (const lm of orderedModules) {
    const r = renderModule({
      module: lm.module,
      body: lm.body,
      allModulesByVarName,
      perVarSourceMap,
      ctx,
    });
    diagnostics.push(...r.diagnostics);
    if (lm.module.lazy) {
      let description = lm.module.description;
      if (description === undefined) {
        description = lm.module.title;
        diagnostics.push({
          code: "lazy-skill",
          severity: "warning",
          message: `Module ${lm.module.id} is lazy but has no \`description:\` — using its title as the skill activation hint, which may reduce activation accuracy.`,
          moduleId: lm.module.id,
        });
      }
      diagnostics.push({
        code: "lazy-skill",
        severity: "info",
        message: `Module ${lm.module.id} emitted as on-demand skill op-module-${lm.module.id}, not inlined. Run op-emit-lazy-skills to materialize it.`,
        moduleId: lm.module.id,
      });
      lazySkills.push({
        id: lm.module.id,
        name: slugifySkillName(lm.module.id),
        description,
        body: r.text,
      });
      continue;
    }
    orderedChunks.push({
      moduleId: lm.module.id,
      scope: lm.module.scope,
      text: r.text,
      sizeChars: r.text.length,
    });
  }
```

- [ ] **Step 5: Thread `lazySkills` through `finaliseComposed` / `emptyComposed`**

Change `FinaliseArgs` to add `lazySkills: LazySkill[];`. In `finaliseComposed`, accept and return it on the `ComposedPrompt`. In `emptyComposed`, return `lazySkills: []`. Update the three `finaliseComposed({...})` call sites in `composeWorkflow` (legacy-kickoff path, the `orderedModules.length === 0` path, and the final return) to pass `lazySkills`:
- legacy-kickoff path and empty-modules path: `lazySkills: []`
- final return: `lazySkills` (the array built in Step 4)

Concretely, `finaliseComposed`:

```ts
interface FinaliseArgs {
  orderedChunks: ComposedChunk[];
  lazySkills: LazySkill[];
  perVarSourceMap: Record<string, UserVarSource>;
  diagnostics: WorkflowDiagnostic[];
  maxChars: number;
}

function finaliseComposed(args: FinaliseArgs): ComposedPrompt {
  const text = args.orderedChunks.map((c) => c.text).join("\n\n");
  const sizeChars = text.length;
  const diagnostics = [...args.diagnostics];
  if (sizeChars > args.maxChars) {
    diagnostics.push({
      code: "size-budget",
      severity: "info",
      message:
        `Composed workflow is ${sizeChars} chars (cap ${args.maxChars}). ` +
        `Modern models tolerate this comfortably; the cap is a guardrail, not a constraint. ` +
        `Consider splitting a module if this surprises you.`,
      extra: { sizeChars, maxWorkflowChars: args.maxChars },
    });
  }
  return {
    text,
    orderedChunks: args.orderedChunks,
    lazySkills: args.lazySkills,
    perVarSourceMap: args.perVarSourceMap,
    sizeChars,
    diagnostics,
  };
}

function emptyComposed(diagnostics: WorkflowDiagnostic[]): ComposedPrompt {
  return {
    text: "",
    orderedChunks: [],
    lazySkills: [],
    perVarSourceMap: {},
    sizeChars: 0,
    diagnostics,
  };
}
```

- [ ] **Step 6: Run the full composer test file**

Run: `npx vitest run src/composeWorkflowPure.test.ts`
Expected: PASS (existing tests still green — `lazySkills: []` added everywhere — plus the two new ones).

- [ ] **Step 7: Commit**

```bash
git add src/composeWorkflowPure.ts src/composeWorkflowPure.test.ts
git commit -m "OP-192: partition lazy modules into ComposedPrompt.lazySkills

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Pure SKILL.md renderer + skill-name slugifier

**Files:**
- Create: `src/lazySkillPure.ts`
- Test: `src/lazySkillPure.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lazySkillPure.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lazySkillPure.test.ts`
Expected: FAIL — module not found / `renderSkillMd` not exported (if Task 2's minimal stub exists, `renderSkillMd` is still missing).

- [ ] **Step 3: Implement `src/lazySkillPure.ts`**

```ts
// OP-192: pure helpers for emitting `lazy: true` workflow modules as Claude
// Code skills. No I/O — `emitLazySkills.ts` owns filesystem writes.

/**
 * Derive a Claude-Code-valid skill name from a module id. Claude Code skill
 * names: lowercase letters, digits, hyphens only; max 64 chars. The
 * `op-module-` prefix namespaces emitted skills away from the canonical `op`
 * skill so the agent's skill list is unambiguous.
 */
export function slugifySkillName(id: string): string {
  const slug = `op-module-${id}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 64).replace(/-+$/g, "");
}

export interface RenderSkillMdArgs {
  name: string;
  description: string;
  body: string;
}

/**
 * Render a SKILL.md document. `description` is emitted as a YAML double-quoted
 * scalar with `\`, `"`, and newlines escaped so an arbitrary one-liner can
 * never corrupt the frontmatter. Body is appended verbatim with a single
 * trailing newline.
 */
export function renderSkillMd(args: RenderSkillMdArgs): string {
  const desc = args.description
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
  const body = args.body.replace(/\n+$/, "");
  return `---\nname: ${args.name}\ndescription: "${desc}"\n---\n\n${body}\n`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lazySkillPure.test.ts`
Expected: PASS.

- [ ] **Step 5: Re-run the composer suite (it imports `slugifySkillName`)**

Run: `npx vitest run src/composeWorkflowPure.test.ts`
Expected: PASS — confirms Task 2's import resolves against the real implementation.

- [ ] **Step 6: Commit**

```bash
git add src/lazySkillPure.ts src/lazySkillPure.test.ts
git commit -m "OP-192: pure SKILL.md renderer + skill-name slugifier

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: IO seam — `emitLazySkills` (recompose + write/prune)

**Files:**
- Create: `src/emitLazySkills.ts`
- Test: `src/emitLazySkills.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/emitLazySkills.test.ts`. The pure write/prune planner is the testable core; mock nothing — test `planSkillEmission` (pure) which decides files to write and dirs to prune:

```ts
import { describe, it, expect } from "vitest";
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
      destDir: "/wt",
      lazySkills: [lazy[0]],
      existingOpModuleDirs: ["op-module-tmux", "op-module-stale"],
    });
    expect(plan.prunes).toEqual(["/wt/.claude/skills/op-module-stale"]);
  });

  it("prunes ALL op-module-* dirs when there are no lazy skills", () => {
    const plan = planSkillEmission({
      destDir: "/wt",
      lazySkills: [],
      existingOpModuleDirs: ["op-module-tmux"],
    });
    expect(plan.writes).toEqual([]);
    expect(plan.prunes).toEqual(["/wt/.claude/skills/op-module-tmux"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/emitLazySkills.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/emitLazySkills.ts`**

```ts
import { promises as fs } from "fs";
import path from "path";
import { App } from "obsidian";
import type { IssueEntry } from "./types";
import type { OpSettings } from "./settings";
import { resolveProfile } from "./openAgent";
import { AGENT_IDS, type AgentId } from "./agentProfiles";
import { loadAndComposeWorkflow } from "./composeWorkflow";
import {
  buildIssueRenderContext,
  readProjectVars,
} from "./explainWorkflow";
import { renderSkillMd } from "./lazySkillPure";
import type { LazySkill } from "./composeWorkflowPure";

// IO seam for OP-192. Recomposes the kickoff step for an issue, takes
// `composed.lazySkills`, and writes each as `<dir>/.claude/skills/
// op-module-<id>/SKILL.md` (+ a self-ignoring `.gitignore`), pruning any
// stale `op-module-*` dir. The write/prune decision is the pure
// `planSkillEmission`; this file owns the filesystem.

export interface SkillWrite {
  path: string;
  kind: "skill" | "gitignore";
  skill?: LazySkill;
}

export interface EmissionPlan {
  writes: SkillWrite[];
  prunes: string[];
}

/**
 * Pure: given the destination dir, the lazy skills to emit, and the
 * `op-module-*` dir names already on disk under `<dir>/.claude/skills/`,
 * decide exactly which files to write and which dirs to remove. A dir is
 * pruned iff it matches `op-module-*` and is not in the current emit set.
 */
export function planSkillEmission(args: {
  destDir: string;
  lazySkills: LazySkill[];
  existingOpModuleDirs: string[];
}): EmissionPlan {
  const skillsRoot = path.join(args.destDir, ".claude", "skills");
  const keep = new Set(args.lazySkills.map((s) => s.name));
  const writes: SkillWrite[] = [];
  for (const s of args.lazySkills) {
    const dir = path.join(skillsRoot, s.name);
    writes.push({ path: path.join(dir, "SKILL.md"), kind: "skill", skill: s });
    writes.push({ path: path.join(dir, ".gitignore"), kind: "gitignore" });
  }
  const prunes = args.existingOpModuleDirs
    .filter((d) => d.startsWith("op-module-") && !keep.has(d))
    .map((d) => path.join(skillsRoot, d));
  return { writes, prunes };
}

export interface EmitLazySkillsDeps {
  settings: OpSettings;
  resolveIssue: (id: string) => IssueEntry;
}

export interface EmitLazySkillsResult {
  issueId: string;
  project: string;
  destDir: string;
  written: string[];
  pruned: string[];
  skillNames: string[];
  /** True when there were no lazy skills (still a success — nothing to do). */
  empty: boolean;
}

/**
 * Recompose the issue's kickoff step, then materialize its lazy skills under
 * `destDir`. `destDir` is the agent's working directory — the agent passes
 * `dir="$(pwd)"` from inside its worktree so the files land where Claude Code
 * will discover them (a worktree is its own skill-discovery root). Falls back
 * to the issue's resolved repo path when `destDir` is omitted.
 */
export async function emitLazySkills(
  app: App,
  deps: EmitLazySkillsDeps,
  args: { issueId: string; destDir?: string },
): Promise<EmitLazySkillsResult> {
  const entry = deps.resolveIssue(args.issueId);
  const project = entry.project;
  if (!project) {
    throw new Error(`op-emit-lazy-skills: issue ${args.issueId} has no project`);
  }

  const agentRaw = entry.agent ?? deps.settings.defaultAgent;
  const agentId = (AGENT_IDS as readonly string[]).includes(agentRaw)
    ? (agentRaw as AgentId)
    : deps.settings.defaultAgent;
  const profile = resolveProfile(deps.settings, agentId);
  const renderContext = buildIssueRenderContext(app, deps.settings, entry, profile, "kickoff");
  const projectVars = readProjectVars(app, project);

  const { composed } = await loadAndComposeWorkflow(app, {
    project,
    step: "kickoff",
    ctx: {
      render: renderContext,
      globalVars: deps.settings.workflowVars ?? {},
      projectVars,
      launchVars: {},
      maxWorkflowChars: deps.settings.injection.maxWorkflowChars,
    },
  });

  const lazySkills: LazySkill[] = composed?.lazySkills ?? [];

  const destDir =
    (args.destDir && args.destDir.trim()) ||
    renderContext.repo_path ||
    "";
  if (!destDir) {
    throw new Error(
      `op-emit-lazy-skills: no destination — issue ${args.issueId}'s project has no repo path; pass dir="$(pwd)" from inside your working directory.`,
    );
  }

  const skillsRoot = path.join(destDir, ".claude", "skills");
  let existing: string[] = [];
  try {
    existing = (await fs.readdir(skillsRoot, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    existing = []; // skills root doesn't exist yet — nothing to prune
  }

  const plan = planSkillEmission({ destDir, lazySkills, existingOpModuleDirs: existing });

  for (const p of plan.prunes) {
    await fs.rm(p, { recursive: true, force: true });
  }
  const written: string[] = [];
  for (const w of plan.writes) {
    await fs.mkdir(path.dirname(w.path), { recursive: true });
    if (w.kind === "gitignore") {
      await fs.writeFile(w.path, "*\n", "utf8");
    } else {
      await fs.writeFile(
        w.path,
        renderSkillMd({ name: w.skill!.name, description: w.skill!.description, body: w.skill!.body }),
        "utf8",
      );
    }
    written.push(w.path);
  }

  return {
    issueId: args.issueId,
    project,
    destDir,
    written,
    pruned: plan.prunes,
    skillNames: lazySkills.map((s) => s.name),
    empty: lazySkills.length === 0,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/emitLazySkills.test.ts`
Expected: PASS (the pure `planSkillEmission` cases).

- [ ] **Step 5: Commit**

```bash
git add src/emitLazySkills.ts src/emitLazySkills.test.ts
git commit -m "OP-192: emitLazySkills IO seam + pure planSkillEmission

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: CLI param parser for `op-emit-lazy-skills`

**Files:**
- Modify: `src/cliHandlers.ts` (add `parseEmitLazySkillsParams` next to `parseExplainWorkflowParams` ~line 309)
- Test: `src/cliHandlers.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/cliHandlers.test.ts` (match the file's existing import of the parsers):

```ts
import { parseEmitLazySkillsParams } from "./cliHandlers";

describe("parseEmitLazySkillsParams (OP-192)", () => {
  it("requires issue", () => {
    const r = parseEmitLazySkillsParams({});
    expect(r.ok).toBe(false);
  });
  it("accepts issue and optional dir, trimming dir", () => {
    const r = parseEmitLazySkillsParams({ issue: "OP-1", dir: "  /wt  " });
    expect(r).toEqual({ ok: true, value: { issueId: "OP-1", destDir: "/wt" } });
  });
  it("accepts id as an alias and omits destDir when dir absent", () => {
    const r = parseEmitLazySkillsParams({ id: "OP-2" });
    expect(r).toEqual({ ok: true, value: { issueId: "OP-2" } });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/cliHandlers.test.ts -t "parseEmitLazySkillsParams"`
Expected: FAIL — `parseEmitLazySkillsParams` not exported.

- [ ] **Step 3: Implement the parser**

In `src/cliHandlers.ts`, after `parseExplainWorkflowParams` (~line 330):

```ts
export function parseEmitLazySkillsParams(
  params: Record<string, string>,
): ParamsResult<{ issueId: string; destDir?: string }> {
  const id = params.issue ?? params.id;
  if (!id) return { ok: false, error: "op-emit-lazy-skills failed: --issue is required" };
  const dir = nonEmptyTrim(params.dir);
  const out: { issueId: string; destDir?: string } = { issueId: id };
  if (dir !== undefined) out.destDir = dir;
  return { ok: true, value: out };
}
```

(`nonEmptyTrim` and `ParamsResult` are already defined/used in this file — reuse them.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/cliHandlers.test.ts -t "parseEmitLazySkillsParams"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cliHandlers.ts src/cliHandlers.test.ts
git commit -m "OP-192: parseEmitLazySkillsParams CLI parser

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Wire `op-emit-lazy-skills` into the plugin (CLI + URI)

**Files:**
- Modify: `src/main.ts` (import ~line 144 region; `registerObsidianProtocolHandler` block ~line 1181; `registerCliHandler` block ~line 1515; new `handleOpEmitLazySkillsCli` method near `handleOpExplainWorkflowCli` ~line 4028)
- Modify: `src/uriHandlers.ts` (new `handleOpEmitLazySkillsUri` near `handleOpListVarsUri` ~line 410; add to `UriHandlerDeps` if that interface gates verbs)
- Test: manual smoke (Task 8) — wiring is exercised by the smoke harness; no new unit test (consistent with how `op-explain-workflow` wiring is covered).

- [ ] **Step 1: Add the import in `main.ts`**

Near the other workflow imports in `src/main.ts` (search for `from "./explainWorkflow"`), add:

```ts
import { emitLazySkills } from "./emitLazySkills";
import { parseEmitLazySkillsParams } from "./cliHandlers";
```

(If `cliHandlers` is already imported as a grouped `import { ... } from "./cliHandlers"`, add `parseEmitLazySkillsParams` to that existing group instead of a new line.)

- [ ] **Step 2: Register the CLI handler**

In the `registerCliHandler` sequence (immediately after the `op-list-vars` block ~line 1527):

```ts
    this.registerCliHandler(
      "op-emit-lazy-skills",
      "Materialize this issue's `lazy: true` workflow modules as on-demand Claude Code skills under <dir>/.claude/skills/. Run from inside your working directory.",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        dir: {
          value: "<abs-path>",
          description: 'Absolute path of your working directory. Pass dir="$(pwd)" from inside your worktree. Defaults to the project repo path.',
        },
      },
      (params) => this.handleOpEmitLazySkillsCli(params),
    );
```

- [ ] **Step 3: Register the protocol (URI) handler**

After the `op-list-vars` `registerObsidianProtocolHandler` block (~line 1186):

```ts
    this.registerObsidianProtocolHandler("op-emit-lazy-skills", (params) => {
      this.runUri("op-emit-lazy-skills", normalizeUriParams(params), (p) =>
        handleOpEmitLazySkillsUri(this.uriDeps(), p),
      );
    });
```

Add `handleOpEmitLazySkillsUri` to the import from `./uriHandlers` in `main.ts`.

- [ ] **Step 4: Add the CLI handler method**

Immediately after `handleOpExplainWorkflowCli` (~line 4049) in `src/main.ts`:

```ts
  private async handleOpEmitLazySkillsCli(params: Record<string, string>): Promise<string> {
    const command = "op-emit-lazy-skills";
    try {
      const parsed = parseEmitLazySkillsParams(params);
      if (!parsed.ok) return parsed.error;
      const args: { issueId: string; destDir?: string } = { issueId: parsed.value.issueId };
      if (parsed.value.destDir !== undefined) args.destDir = parsed.value.destDir;
      const payload = await emitLazySkills(
        this.app,
        { settings: this.settings, resolveIssue: (i) => this.resolveByIdOrThrow(i) },
        args,
      );
      await writeUriResponse(this.app, { ok: true, command, ...payload });
      return payload.empty
        ? `${command}: ${payload.issueId} — no lazy modules; nothing to emit`
        : `${command}: ${payload.issueId} → wrote ${payload.skillNames.length} skill(s) to ${payload.destDir}/.claude/skills/ (pruned ${payload.pruned.length})`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }
```

- [ ] **Step 5: Add the URI handler in `uriHandlers.ts`**

After `handleOpListVarsUri` (~line 427) in `src/uriHandlers.ts`:

```ts
export async function handleOpEmitLazySkillsUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  if (!deps.emitLazySkills) throw new Error("op-emit-lazy-skills not wired");
  const id = trimOrUndef(params.issue ?? params.id);
  if (!id) throw new Error("op-emit-lazy-skills URI: issue is required");
  const dir = trimOrUndef(params.dir);
  const args: { issueId: string; destDir?: string } = { issueId: id };
  if (dir) args.destDir = dir;
  const payload = await deps.emitLazySkills(args);
  return { ok: true, command: "op-emit-lazy-skills", ...payload };
}
```

Add an optional `emitLazySkills?: (args: { issueId: string; destDir?: string }) => Promise<...>` to the `UriHandlerDeps` interface and wire it in `this.uriDeps()` (mirror exactly how `explainWorkflow` / `listVars` are added to `UriHandlerDeps` and `uriDeps()` — search `explainWorkflow:` in `main.ts` and `uriHandlers.ts` and copy the shape, substituting `emitLazySkills`).

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; `main.js` rebuilt.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS (no regressions).

- [ ] **Step 8: Commit**

```bash
git add src/main.ts src/uriHandlers.ts
git commit -m "OP-192: wire op-emit-lazy-skills CLI + URI handlers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Kickoff pointer block (and meta-only inline fallback)

**Files:**
- Modify: `src/promptBuild.ts` (`composeWorkflowSection` ~line 233–238)
- Test: `src/promptBuild.test.ts`

- [ ] **Step 1: Write failing tests**

In `src/promptBuild.test.ts`, add cases that drive `composeWorkflowSection` with a composed result containing `lazySkills`. Mirror the existing test setup in that file (it already stubs `loadAndComposeWorkflow` or composes against fixtures — reuse that harness; do not invent a new one). Two cases:

```ts
describe("composeWorkflowSection lazy skills (OP-192)", () => {
  it("appends a pointer block (not the bodies) when repoPath is set and lazySkills present", async () => {
    // Arrange a composed result: text "Inline" + lazySkills:[{id:'tmux',...,body:'LAZY BODY'}]
    // and args.repoPath = "/wt".
    const out = await composeWorkflowSection(app, argsWithLazy({ repoPath: "/wt" }));
    expect(out).toContain("Inline");
    expect(out).not.toContain("LAZY BODY");
    expect(out).toContain("op-emit-lazy-skills");
    expect(out).toContain('dir="$(pwd)"');
  });

  it("inlines lazy bodies under a reference heading when no repoPath (meta-only)", async () => {
    const out = await composeWorkflowSection(app, argsWithLazy({ repoPath: undefined }));
    expect(out).toContain("LAZY BODY");
    expect(out).toContain("## Optional reference (no working directory");
  });
});
```

> Use the file's existing app/fixture builders. `argsWithLazy` is shorthand for "the test's existing `BuildPromptArgs` builder, with a workflow whose kickoff step includes a `lazy: true` module". If the test file composes against real fixtures rather than stubs, add a `lazy: true` fixture module under `src/__fixtures__/integration/` and reference it from the kickoff step there.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/promptBuild.test.ts -t "lazy skills"`
Expected: FAIL — pointer block / inline fallback not implemented.

- [ ] **Step 3: Implement the pointer / inline fallback**

In `src/promptBuild.ts`, replace the tail of `composeWorkflowSection` (the block starting `const text = composed.text.trim();` ~line 233):

```ts
  const text = composed.text.trim();
  const lazy = composed.lazySkills ?? [];

  // Lazy modules: emit a pointer (agent pulls them into its worktree) when a
  // working directory exists; otherwise inline the bodies so meta-only
  // projects never lose the content.
  let lazySection = "";
  if (lazy.length > 0) {
    if (args.repoPath) {
      const names = lazy.map((s) => s.name).join(", ");
      lazySection =
        `## Optional reference skills\n\n` +
        `This issue has ${lazy.length} optional reference module(s) (${names}) available as on-demand skills. ` +
        `From inside your working directory (after creating your worktree) run:\n\n` +
        "```bash\n" +
        `obsidian op-emit-lazy-skills issue=${entry.id} dir="$(pwd)"\n` +
        "```\n\n" +
        `Then activate the relevant one via the Skill tool when needed. Skipping this is safe — they are reference-only.`;
    } else {
      lazySection =
        `## Optional reference (no working directory — inlined)\n\n` +
        lazy.map((s) => `### ${s.name}\n\n${s.body}`).join("\n\n");
    }
  }

  // Non-null but empty inline text: suppress the workflow section, but still
  // surface lazy content/pointer if any.
  if (!text) {
    return lazySection ? lazySection : "";
  }
  const section = `## Project workflow\n\n${text}`;
  return lazySection ? `${section}\n\n${lazySection}` : section;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/promptBuild.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + build**

Run: `npm test && npm run build`
Expected: PASS; build clean.

- [ ] **Step 6: Commit**

```bash
git add src/promptBuild.ts src/promptBuild.test.ts src/__fixtures__ 2>/dev/null
git commit -m "OP-192: kickoff pointer block + meta-only inline fallback

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Version bump, dev-sync, smoke test

**Files:**
- Modify: `plugins/op-obsidian/manifest.json`, `plugins/op-obsidian/package.json`, `plugins/op/.claude-plugin/plugin.json` (via the bump script)
- Modify: `scripts/smoke-workflow-modules.mjs` (extend with a lazy assertion)
- Modify: `scripts/build-seeds.mjs` (add one `lazy: true` module to the `seed/workflow-modules` checkpoint)

- [ ] **Step 1: Bump version + build (from repo root)**

Run: `node scripts/bump-version.mjs minor`
(Minor — `op-emit-lazy-skills` is a new additive CLI verb + two new optional schema fields. No breaking change.)
Expected: three JSON files move in lockstep; `npm run build` runs; `main.js` fresher than `manifest.json`.

- [ ] **Step 2: Add a lazy module to the workflow-modules seed**

In `scripts/build-seeds.mjs`, locate where the `seed/workflow-modules` checkpoint writes its per-project module(s) (search for `workflow-modules` / `MODULES/`). Add one module file with frontmatter `type: workflow-module`, `id: tmux-gotchas`, `title: "Tmux gotchas"`, `scope: kickoff`, `lazy: true`, `description: "Tmux pane/window gotchas — activate when wrangling tmux"`, body `"Known tmux gotchas: ..."`, and add `tmux-gotchas` to the kickoff step's `modules:` list in that seed's `_op-workflow.md`. Keep it minimal — one extra module, mirroring the existing seed module's shape exactly.

- [ ] **Step 3: Rebuild seeds**

Run: `node scripts/build-seeds.mjs`
Expected: seeds rebuilt; `git -C ~/Documents/OP-Test/OP-Test tag` lists `seed/workflow-modules`.

- [ ] **Step 4: Extend the smoke harness**

In `scripts/smoke-workflow-modules.mjs`, after the existing `op-explain-workflow` assertions, add:
- assert the explain payload's diagnostics include a `lazy-skill` `info` entry for `tmux-gotchas`;
- assert the composed `text` does NOT contain the tmux-gotchas body;
- run `obsidian vault=OP-Test op-emit-lazy-skills issue=TST-5 dir=<OP-Test repo tmp path>` and assert `<dir>/.claude/skills/op-module-tmux-gotchas/SKILL.md` exists, contains `name: op-module-tmux-gotchas`, and a sibling `.gitignore` containing `*`;
- re-run it and assert idempotency (same files, no error);
- assert a stale `op-module-zzz` dir created beforehand is pruned.

Match the harness's existing assertion style (it already shells `obsidian vault=OP-Test ...` and reads `Projects/_scratch/op-last-response.md`).

- [ ] **Step 5: Sync + reload + smoke (per project CLAUDE.md)**

Run (OP-Test must be open in Obsidian, any window):

```bash
node scripts/dev-sync.mjs
node scripts/reset-test-vault.mjs workflow-modules
node scripts/smoke-workflow-modules.mjs
obsidian vault=OP-Test op-explain-workflow issue=TST-5 mode=kickoff
```

Expected: smoke harness exits 0; explain payload shows the `lazy-skill` info diagnostic and excludes the tmux body; `op-last-response.md` has no `error`-severity diagnostics for the seed checkpoint.

- [ ] **Step 6: Commit**

```bash
git add plugins/op-obsidian/manifest.json plugins/op-obsidian/package.json plugins/op/.claude-plugin/plugin.json scripts/smoke-workflow-modules.mjs scripts/build-seeds.mjs
git commit -m "OP-192: version bump + lazy-module seed + smoke coverage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- §1 schema (`lazy`, `description`, no global setting, boolean type-check) → Task 1 ✓
- §2 pure-composer partition + info diagnostic + description→title warning fallback → Task 2 ✓
- §3 skill-name slug + YAML-safe SKILL.md render → Task 3 ✓
- §4 `op-emit-lazy-skills` CLI: recompose, write, self-ignoring `.gitignore`, prune, idempotent, JSON payload → Tasks 4–6 ✓
- §5 emit at kickoff only (pointer injected by `composeWorkflowSection`) → Task 7 ✓
- §6 edge cases: meta-only inline fallback (Task 7), stale prune (Task 4), shadowing→single id (inherent — composer partitions post-shadow loaded modules), concurrency (writes into agent's own worktree dir — no shared path) ✓
- Testing section (pure unit, IO, smoke + seed) → Tasks 1–8 ✓
- Out-of-scope items: no global setting, no per-step emission, no plugin-push — none implemented ✓

**Placeholder scan:** No TBD/TODO. Test-helper reuse notes ("adapt to existing builders") are explicit instructions, not deferred work — the builder semantics are specified. Every code step shows full code.

**Type consistency:** `LazySkill` (`{id,name,description,body}`) defined in Task 2, consumed identically in Tasks 3 (`renderSkillMd` args subset), 4 (`planSkillEmission`/`emitLazySkills`), 7 (`s.name`/`s.body`). `parseEmitLazySkillsParams` returns `{issueId, destDir?}` (Task 5) consumed unchanged in Task 6. `emitLazySkills` deps `{settings, resolveIssue}` mirror `explainWorkflow`'s. `lazy-skill` diagnostic code added in Task 1, emitted in Task 2, asserted in Task 8. Consistent.
