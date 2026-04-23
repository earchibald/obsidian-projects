import { App, TFile, normalizePath } from "obsidian";
import type { IssueStore } from "./issueStore";
import { findProjectBySlug, type ProjectInfo } from "./projects";
import { nextIssueNumberFromVault } from "./findIssue";
import { issueFilename } from "./sanitize";
import { renderIssueNote, type Priority } from "./issueTemplate";

export type { Priority };
export {
  PLAN_PLACEHOLDER,
  NOTES_PLACEHOLDER,
  SUMMARY_PLACEHOLDER,
  renderIssueNote,
} from "./issueTemplate";

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
  const re = new RegExp(`^${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\b|[ .])`);
  return folder.children.some((c) => re.test(c.name));
}
