import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";

export interface WorkIssueResult {
  issueId: string;
  path: string;
  previousStatus: string;
  createdTaskPath?: string;
}

export async function workIssue(
  app: App,
  store: IssueStore,
  entry: IssueEntry,
): Promise<WorkIssueResult> {
  const file = app.vault.getAbstractFileByPath(entry.path);
  if (!(file instanceof TFile)) {
    throw new Error(`Issue file not found on disk: ${entry.path}`);
  }

  let previousStatus = entry.status;
  await app.fileManager.processFrontMatter(file, (fm) => {
    previousStatus = typeof fm.status === "string" ? fm.status : previousStatus;
    fm.status = "in-progress";
  });

  const existingTasks = store.tasks().filter((t) => t.id.startsWith(`${entry.id}.`));
  let createdTaskPath: string | undefined;
  if (existingTasks.length === 0) {
    createdTaskPath = await createDefaultTask(app, entry);
  }

  return {
    issueId: entry.id,
    path: entry.path,
    previousStatus,
    createdTaskPath,
  };
}

async function createDefaultTask(app: App, entry: IssueEntry): Promise<string> {
  const folder = `Projects/${entry.project}/TASKS`;
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder);
  }
  const taskId = `${entry.id}.1`;
  const path = `${folder}/${taskId} work.md`;
  if (app.vault.getAbstractFileByPath(path)) return path;

  const issueBasename = entry.path.split("/").pop()!.replace(/\.md$/, "");
  const content = [
    "---",
    `id: ${taskId}`,
    `issue: "[[${issueBasename}]]"`,
    `project: ${entry.project}`,
    "type: task",
    "status: pending",
    "tags:",
    `  - project/${entry.project}`,
    "  - task",
    "---",
    "",
    `# Work on ${entry.id}`,
    "",
    "Default task created by `op:work`. Replace with a real breakdown when scope is known.",
    "",
  ].join("\n");

  await app.vault.create(path, content);
  return path;
}
