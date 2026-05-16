import { App, TFile, normalizePath } from "obsidian";
import type { IssueStore } from "./issueStore";
import { resolveProjectBySlug, type ProjectInfo } from "./projects";
import { nextIssueNumberFromVault } from "./findIssue";
import { joinVaultPath } from "./projectPaths";
import { issueFilename } from "./sanitize";
import { renderIssueNote, type Priority } from "./issueTemplate";
import type { IssueEntry } from "./types";

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
  // When set, the renderer writes this verbatim under `## Scope` instead of
  // wrapping `scope` bullets. Use for multi-paragraph / structured scope.
  scopeBody?: string;
  assignee?: string;
  githubIssue?: string;
}

export interface CreateIssueResult {
  file: TFile;
  id: string;
  path: string;
  project: ProjectInfo;
  entry: IssueEntry;
}

export async function createIssue(
  app: App,
  store: IssueStore,
  input: CreateIssueInput,
): Promise<CreateIssueResult> {
  const project = await resolveProjectBySlug(app, input.slug);
  if (!project) throw new Error(`Unknown project slug: ${input.slug}`);
  if (!project.prefix) {
    throw new Error(
      `Project "${project.slug}" is missing a prefix in STATUS.md — set it before creating issues.`,
    );
  }

  const folder = joinVaultPath(project.folderPath, "ISSUES");
  const resolvedFolder = joinVaultPath(project.folderPath, "RESOLVED ISSUES");
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
    scopeBody: input.scopeBody,
    assignee: input.assignee ?? "earchibald",
    githubIssue: input.githubIssue?.trim() || undefined,
  });

  const file = await app.vault.create(path, content);
  // Synthesize the IssueEntry synchronously so callers can act on the new
  // issue without waiting for metadataCache.changed → IssueStore to catch up.
  const entry: IssueEntry = {
    path,
    type: "issue",
    id,
    project: project.slug,
    status: "open",
    priority: input.priority ?? "med",
    assignee: input.assignee ?? "earchibald",
    githubIssue: input.githubIssue?.trim() || undefined,
    title: input.title,
    resolvedFolder: false,
  };
  return { file, id, path, project, entry };
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
