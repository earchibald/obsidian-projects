import { promises as fs } from "fs";
import * as path from "path";
import { App } from "obsidian";
import type { IssueEntry } from "./types";
import type { OpSettings } from "./settings";
import { loadAndComposeWorkflow } from "./composeWorkflow";
import { buildIssueRenderContext, readProjectVars, resolveProfileById } from "./explainWorkflow";
import { renderSkillMd } from "./lazySkillPure";
import type { LazySkill } from "./composeWorkflowPure";

export type SkillWrite =
  | { path: string; kind: "skill"; skill: LazySkill }
  | { path: string; kind: "gitignore" };
export interface EmissionPlan {
  writes: SkillWrite[];
  prunes: string[];
}

/** Pure: decide which files to write and which `op-module-*` dirs to prune. */
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
  empty: boolean;
  /** OP-192 review M1: lazy modules whose rendered body was empty/whitespace —
   *  emitted anyway but surfaced so the caller can warn. */
  emptyBodySkills: string[];
}

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
  const profile = resolveProfileById(deps.settings, entry.agent ?? deps.settings.defaultAgent);
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
    (args.destDir && args.destDir.trim()) || renderContext.repo_path || "";
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
    existing = [];
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
        renderSkillMd({ name: w.skill.name, description: w.skill.description, body: w.skill.body }),
        "utf8",
      );
    }
    written.push(w.path);
  }

  const emptyBodySkills = lazySkills
    .filter((s) => s.body.trim().length === 0)
    .map((s) => s.name);

  return {
    issueId: args.issueId,
    project,
    destDir,
    written,
    pruned: plan.prunes,
    skillNames: lazySkills.map((s) => s.name),
    empty: lazySkills.length === 0,
    emptyBodySkills,
  };
}
