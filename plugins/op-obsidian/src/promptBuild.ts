import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import type { AgentLaunchMode, AgentProfile } from "./agentProfiles";
import { promptPreambleFor, renderSkillTrigger } from "./agentProfiles";
import type { InjectionSettings } from "./settings";
import { agentizeBody } from "./agentizeBody";

export { agentizeBody } from "./agentizeBody";

export interface BuildPromptArgs {
  entry: IssueEntry;
  profile: AgentProfile;
  injection: InjectionSettings;
  vaultBasePath?: string;
  mode?: AgentLaunchMode;
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
