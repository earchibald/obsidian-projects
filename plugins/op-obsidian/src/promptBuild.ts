import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import type { AgentLaunchMode, AgentProfile } from "./agentProfiles";
import { promptPreambleFor, renderSkillTrigger } from "./agentProfiles";
import type { InjectionSettings, WorkflowMode } from "./settings";
import { agentizeBody } from "./agentizeBody";
import { loadAndComposeWorkflow } from "./composeWorkflow";
import type { RenderContext } from "./pluginVarRegistry";

export { agentizeBody } from "./agentizeBody";

export interface BuildPromptArgs {
  entry: IssueEntry;
  profile: AgentProfile;
  injection: InjectionSettings;
  vaultBasePath?: string;
  mode?: AgentLaunchMode;
  /** OP-198 (2a): selects the workflow-injection engine. `'modules'` calls
   *  `loadAndComposeWorkflow` for the kickoff step; `'legacy'` (default)
   *  inlines `Projects/<slug>/WORKFLOW.md` verbatim. Per-mode and per-step
   *  injection arrive in OP-199 / OP-200. */
  workflowMode?: WorkflowMode;
  /** OP-198 (2a): vault-wide user vars threaded into the composer's Global
   *  precedence layer. Unused when `workflowMode === 'legacy'`. */
  workflowVars?: Record<string, string>;
}

export async function buildPrompt(
  app: App,
  store: IssueStore,
  args: BuildPromptArgs,
): Promise<string> {
  const { entry, profile, injection, vaultBasePath } = args;
  const mode: AgentLaunchMode = args.mode ?? "work";
  const parts: string[] = [];

  if (injection.extraPreamble.trim()) parts.push(injection.extraPreamble.trim());
  const preamble = promptPreambleFor(profile, mode);
  if (preamble.trim()) parts.push(preamble.trim());

  parts.push(renderSkillTrigger(profile, entry.id));

  if (injection.includeWorkflow && entry.project) {
    const workflowMode: WorkflowMode = args.workflowMode ?? "legacy";
    let composedSection: string | null = null;

    if (workflowMode === "modules") {
      // OP-198 (2a): swap the legacy inline blob for OP-197's composer.
      // Falls through to the legacy block if the composer can't produce
      // anything (no WORKFLOW.md, empty step) so users who flip the flag
      // never lose workflow content silently.
      composedSection = await composeKickoffSection(app, args);
    }

    if (composedSection !== null) {
      parts.push(composedSection);
    } else {
      // Legacy path — kept byte-identical (OP-198 acceptance criterion).
      const workflowPath = `Projects/${entry.project}/WORKFLOW.md`;
      const wf = app.vault.getAbstractFileByPath(workflowPath);
      if (wf instanceof TFile) {
        const raw = await app.vault.read(wf);
        const body = stripFrontmatter(raw).trim();
        if (body) {
          const cap = Math.max(0, injection.maxWorkflowChars | 0);
          if (cap === 0 || body.length > cap) {
            // Over the inline cap (or inlining disabled): point at the file
            // rather than burn kickoff context.
            parts.push(
              `## Project workflow\n\nSee ${workflowPath} for this project's SDLC policy. Read it before touching the repo.`,
            );
          } else {
            parts.push(`## Project workflow\n\nFrom ${workflowPath}:\n\n${body}`);
          }
        }
      }
    }
  }

  const header: string[] = [];
  header.push(`Issue: ${entry.id} — ${entry.title}`);
  header.push(`Project: ${entry.project}`);
  if (entry.status) header.push(`Status: ${entry.status}`);
  if (entry.pr) header.push(`PR: ${entry.pr}`);
  const notePath = vaultBasePath
    ? `${stripTrailingSlash(vaultBasePath)}/${entry.path}`
    : entry.path;
  header.push(`Note: ${notePath}`);
  parts.push(header.join("\n"));

  if (injection.injectBody) {
    const body = await readBodyOnly(app, entry);
    if (body) {
      const truncated = truncate(body, injection.maxBodyChars);
      parts.push(`## Body\n\n${truncated.text}${truncated.truncated ? `\n\n_(truncated — full body at ${notePath})_` : ""}`);
    }
  }

  if (injection.includeTasksList) {
    const tasks = store
      .tasks()
      .filter((t) => t.id.startsWith(`${entry.id}.`))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    if (tasks.length > 0) {
      const lines = tasks.map((t) => `- [${t.status}] ${t.id} — ${t.title}`);
      parts.push(`## Tasks\n\n${lines.join("\n")}`);
    }
  }

  if (injection.includeRecentCommits > 0 && entry.commits && entry.commits.length > 0) {
    const recent = entry.commits.slice(-injection.includeRecentCommits);
    parts.push(`## Recent commits\n\n${recent.map((c) => `- ${c}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

/**
 * OP-198 (2a): compose the kickoff workflow section via OP-197's modular
 * engine. Returns the `## Project workflow` block ready to splice into
 * `parts`, or `null` if the composer produced nothing usable (no
 * `WORKFLOW.md`, empty steps, or the step yielded an empty body) so the
 * caller can fall back to the legacy inline path.
 *
 * The `RenderContext` is built minimally here: 2a only owns the kickoff
 * splice and the global-vars thread, so launch-context fields (`branch`,
 * `model`, `repo_path`) stay `undefined` until OP-199 (2b) plumbs them
 * through `openAgent`. Modules that reference those vars surface
 * `missing-var` diagnostics on `composed.diagnostics` (visible to the dry-
 * run / preview surface in OP-186) but the prompt itself stays sound.
 */
async function composeKickoffSection(
  app: App,
  args: BuildPromptArgs,
): Promise<string | null> {
  const { entry, profile, injection, vaultBasePath } = args;
  if (!entry.project) return null;

  const render = buildKickoffRenderContext(app, args, vaultBasePath);
  const { composed } = await loadAndComposeWorkflow(app, {
    project: entry.project,
    step: "kickoff",
    ctx: {
      render,
      globalVars: args.workflowVars ?? {},
      maxWorkflowChars: injection.maxWorkflowChars,
    },
  });

  if (!composed) return null;
  const text = composed.text.trim();
  if (!text) return null;
  return `## Project workflow\n\n${text}`;
}

function buildKickoffRenderContext(
  app: App,
  args: BuildPromptArgs,
  vaultBasePath: string | undefined,
): RenderContext {
  const { entry, profile } = args;
  const mode: AgentLaunchMode = args.mode ?? "work";
  return {
    id: entry.id,
    title: entry.title,
    project: entry.project,
    status: entry.status,
    priority: entry.priority,
    parent: null,
    pr_url: entry.pr,
    github_issue: entry.githubIssue,
    repo_path: undefined,
    vault_path: vaultBasePath ?? "",
    vault_name: app.vault.getName(),
    branch: undefined,
    today: today(),
    agent: profile.id,
    model: undefined,
    mode,
  };
}

function today(): string {
  // ISO YYYY-MM-DD slice. Caller-side wrapper so tests can shim `Date` if
  // they ever need to assert against the literal date — current tests
  // assert against structure, not the date string.
  return new Date().toISOString().slice(0, 10);
}

async function readBodyOnly(app: App, entry: IssueEntry): Promise<string> {
  const f = app.vault.getAbstractFileByPath(entry.path);
  if (!(f instanceof TFile)) return "";
  const raw = await app.vault.read(f);
  return agentizeBody(stripFrontmatter(raw).trim());
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  const afterFence = raw.indexOf("\n", end + 4);
  return afterFence === -1 ? "" : raw.slice(afterFence + 1);
}

function truncate(s: string, max: number): { text: string; truncated: boolean } {
  if (s.length <= max) return { text: s, truncated: false };
  return { text: s.slice(0, max).trimEnd(), truncated: true };
}

function stripTrailingSlash(p: string): string {
  return p.endsWith("/") ? p.slice(0, -1) : p;
}
