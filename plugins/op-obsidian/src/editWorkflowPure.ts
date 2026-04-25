// Pure helpers for op-edit-workflow. Kept separate from editWorkflow.ts so
// they can be unit-tested without loading the obsidian module.

export interface BuildEditWorkflowPromptArgs {
  slug: string;
  workflowPath: string;
  repoPath: string;
  vaultBasePath?: string;
  /** Existing WORKFLOW.md body (frontmatter stripped). `null` if the file doesn't exist. */
  existingContent: string | null;
}

const PREAMBLE =
  "You were launched to author or refine an Obsidian Projects WORKFLOW.md — the project's authoritative SDLC policy. Your job is to interview the user about how this project ships work (branching strategy, version cadence, PR rules, commit-to-issue mapping, release flow, anything else load-bearing) and write that policy to the workflow path below. Do NOT touch issue notes, do NOT run op-work / op-resolve / op-set-scope, do NOT bump versions or commit code. The workflow file is the only artifact you produce.";

const INSTRUCTIONS = [
  "1. Read this project's STATUS.md and a sample of recent issues to ground yourself in how the project actually works today.",
  "2. If a WORKFLOW.md already exists (its current contents are inlined below), treat it as the starting point — refine, don't replace, unless the user asks you to start over.",
  "3. Interview the user. Cover at minimum: branching (straight-to-main vs PRs vs feature/integration/dev/main pipeline), worktrees policy, commit/PR conventions, version-bump cadence (patch/minor/major rules; one bump per issue?), commits: tracking on issues, PR linkage, release/deploy steps, GitHub-issue mirroring.",
  "4. Keep the file concise and agent-optimized — bulleted prose, not a manual. Future agents will read it as kickoff context, capped by an inline-injection budget.",
  "5. Write the file via `obsidian create path=<workflowPath> body=...` (or `obsidian property:set` for in-place edits). Frontmatter should set `type: workflow` (and optionally `project: <slug>`). No other op-obsidian command is in scope for this session.",
  "6. When the user signals they're done, summarize what you wrote and exit. Do NOT offer to dispatch follow-ups, plan issues, or implement anything.",
];

export function buildEditWorkflowPrompt(args: BuildEditWorkflowPromptArgs): string {
  const { slug, workflowPath, repoPath, vaultBasePath, existingContent } = args;
  const parts: string[] = [];

  parts.push(PREAMBLE);

  const header: string[] = [];
  header.push(`Project: ${slug}`);
  header.push(`Workflow path: ${workflowPath}`);
  if (vaultBasePath) {
    header.push(`Workflow absolute path: ${stripTrailingSlash(vaultBasePath)}/${workflowPath}`);
  }
  header.push(`Working dir: ${repoPath}`);
  header.push(
    `Status: ${existingContent === null ? "no WORKFLOW.md yet — author from scratch" : "WORKFLOW.md exists — refine in place"}`,
  );
  parts.push(header.join("\n"));

  parts.push(`## What to do\n\n${INSTRUCTIONS.join("\n")}`);

  if (existingContent && existingContent.trim()) {
    parts.push(`## Current WORKFLOW.md\n\n${existingContent.trim()}`);
  }

  return parts.join("\n\n");
}

function stripTrailingSlash(p: string): string {
  return p.endsWith("/") ? p.slice(0, -1) : p;
}
