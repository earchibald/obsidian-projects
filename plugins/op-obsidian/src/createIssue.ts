import { App, TFile, normalizePath } from "obsidian";
import type { IssueStore } from "./issueStore";
import { findProjectBySlug, type ProjectInfo } from "./projects";
import { nextIssueNumberFromVault } from "./findIssue";
import { issueFilename } from "./sanitize";

export type Priority = "low" | "med" | "high";

export interface CreateIssueInput {
  slug: string;
  title: string;
  priority?: Priority;
  scope?: string[];
  assignee?: string;
  githubIssue?: string;
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

  const folder = `Projects/${project.slug}/ISSUES`;
  const resolvedFolder = `Projects/${project.slug}/RESOLVED ISSUES`;
  await ensureFolder(app, folder);

  let n = nextIssueNumberFromVault(app, { slug: project.slug, prefix: project.prefix });
  let id = `${project.prefix}-${n}`;
  let filename = issueFilename(id, input.title);
  let path = normalizePath(`${folder}/${filename}`);

  // Belt-and-suspenders: if any file already claims this ID in either folder,
  // walk forward until free. Guards against races with scaffolding and any
  // future drift between the filesystem scan and the actual vault state.
  const MAX_ATTEMPTS = 1000;
  let attempts = 0;
  while (
    idExistsInFolder(app, folder, project.prefix, n) ||
    idExistsInFolder(app, resolvedFolder, project.prefix, n) ||
    app.vault.getAbstractFileByPath(path)
  ) {
    n += 1;
    id = `${project.prefix}-${n}`;
    filename = issueFilename(id, input.title);
    path = normalizePath(`${folder}/${filename}`);
    if (++attempts > MAX_ATTEMPTS) {
      throw new Error(`Could not find a free issue id for ${project.prefix}`);
    }
  }

  const content = renderIssueNote({
    id,
    project: project.slug,
    title: input.title,
    priority: input.priority ?? "med",
    scope: input.scope ?? [],
    assignee: input.assignee ?? "earchibald",
    githubIssue: input.githubIssue?.trim() || undefined,
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
  githubIssue?: string;
}

function renderIssueNote(i: RenderInput): string {
  const today = new Date().toISOString().slice(0, 10);
  const fmLines = [
    "---",
    `id: ${i.id}`,
    `project: ${i.project}`,
    "type: issue",
    "status: open",
    `priority: ${i.priority}`,
    `created: ${today}`,
    `assignee: ${i.assignee}`,
  ];
  if (i.githubIssue) fmLines.push(`github_issue: ${i.githubIssue}`);
  fmLines.push("tags:", `  - project/${i.project}`, "  - issue", "---", "");
  const fm = fmLines.join("\n");

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

function idExistsInFolder(app: App, folderPath: string, prefix: string, n: number): boolean {
  const folder = app.vault.getAbstractFileByPath(folderPath) as unknown as
    | { children?: { name: string }[] }
    | null;
  if (!folder || !folder.children) return false;
  const needle = `${prefix}-${n}`;
  // Match the id as a standalone token at the start: "<PREFIX>-<N>" followed by
  // end-of-name, space, or a file extension dot.
  const re = new RegExp(`^${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\b|[ .])`);
  return folder.children.some((c) => re.test(c.name));
}
