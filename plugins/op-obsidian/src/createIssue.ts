import { App, TFile, normalizePath } from "obsidian";
import type { IssueStore } from "./issueStore";
import { findProjectBySlug, type ProjectInfo } from "./projects";
import { nextIssueNumber } from "./findIssue";
import { issueFilename } from "./sanitize";

export type Priority = "low" | "med" | "high";

export interface CreateIssueInput {
  slug: string;
  title: string;
  priority?: Priority;
  scope?: string[];
  assignee?: string;
}

export interface CreateIssueResult {
  file: TFile;
  id: string;
  path: string;
  project: ProjectInfo;
}

export async function createIssue(
  app: App,
  store: IssueStore,
  input: CreateIssueInput,
): Promise<CreateIssueResult> {
  const project = findProjectBySlug(app, input.slug);
  if (!project) throw new Error(`Unknown project slug: ${input.slug}`);
  if (!project.prefix) {
    throw new Error(
      `Project "${project.slug}" is missing a prefix in STATUS.md — set it before creating issues.`,
    );
  }

  const n = nextIssueNumber(store, project.slug);
  const id = `${project.prefix}-${n}`;
  const filename = issueFilename(id, input.title);
  const folder = `Projects/${project.slug}/ISSUES`;
  const path = normalizePath(`${folder}/${filename}`);

  if (app.vault.getAbstractFileByPath(path)) {
    throw new Error(`Issue file already exists: ${path}`);
  }
  await ensureFolder(app, folder);

  const content = renderIssueNote({
    id,
    project: project.slug,
    title: input.title,
    priority: input.priority ?? "med",
    scope: input.scope ?? [],
    assignee: input.assignee ?? "earchibald",
  });

  const file = await app.vault.create(path, content);
  return { file, id, path, project };
}

interface RenderInput {
  id: string;
  project: string;
  title: string;
  priority: Priority;
  scope: string[];
  assignee: string;
}

function renderIssueNote(i: RenderInput): string {
  const today = new Date().toISOString().slice(0, 10);
  const fm = [
    "---",
    `id: ${i.id}`,
    `project: ${i.project}`,
    "type: issue",
    "status: open",
    `priority: ${i.priority}`,
    `created: ${today}`,
    `assignee: ${i.assignee}`,
    "tags:",
    `  - project/${i.project}`,
    "  - issue",
    "---",
    "",
  ].join("\n");

  const body = [`# ${i.title}`, ""];
  if (i.scope.length > 0) {
    body.push("## Scope");
    for (const bullet of i.scope) {
      body.push(`- [ ] ${bullet.trim()}`);
    }
    body.push("");
  }
  return fm + body.join("\n");
}

async function ensureFolder(app: App, folder: string): Promise<void> {
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder);
  }
}
