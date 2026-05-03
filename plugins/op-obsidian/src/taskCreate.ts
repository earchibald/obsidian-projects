import { App, TFile, normalizePath } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import { issueFilename } from "./sanitize";
import {
  nextTaskNumber,
  renderTaskNote,
  validateExplicitTaskId,
} from "./taskCreatePure";

export interface TaskCreateInput {
  issueId: string;
  /** Optional explicit task id (e.g. "OP-255.3"). Auto-allocated when omitted. */
  taskId?: string;
  title: string;
  body?: string;
  status?: "pending" | "in-progress" | "completed" | "blocked";
}

export interface TaskCreateResult {
  taskId: string;
  issueId: string;
  path: string;
  file: TFile;
}

/**
 * Create a new TASK note under `Projects/<slug>/TASKS/`. Allocates the next
 * `<issueId>.<N>` id (or honors an explicit `taskId` arg). Writes
 * `op_managed: true` into the frontmatter so the Phase 2 pretool guard can
 * refuse direct Edits to it.
 */
export async function taskCreate(
  app: App,
  store: IssueStore,
  input: TaskCreateInput,
): Promise<TaskCreateResult> {
  const issue = findIssueById(store, input.issueId);
  const folder = `Projects/${issue.project}/TASKS`;
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder);
  }

  const existingIds = store
    .tasks()
    .map((t) => t.id)
    .filter((id) => id.startsWith(`${issue.id}.`));

  let taskId: string;
  if (input.taskId) {
    const v = validateExplicitTaskId(issue.id, input.taskId, existingIds);
    if (!v.ok) throw new Error(`op-task-create: ${v.error}`);
    taskId = v.taskId;
  } else {
    const n = nextTaskNumber(issue.id, existingIds);
    taskId = `${issue.id}.${n}`;
  }

  const issueBasename = issue.path.split("/").pop()!.replace(/\.md$/, "");
  const filename = issueFilename(taskId, input.title);
  const path = normalizePath(`${folder}/${filename}`);
  if (app.vault.getAbstractFileByPath(path)) {
    throw new Error(`op-task-create: file already exists at ${path}`);
  }
  const content = renderTaskNote(
    {
      taskId,
      issueId: issue.id,
      issueBasename,
      project: issue.project,
      title: input.title,
      status: input.status,
    },
    input.body,
  );
  const file = await app.vault.create(path, content);
  return { taskId, issueId: issue.id, path, file };
}

function findIssueById(store: IssueStore, id: string): IssueEntry {
  const e = store.issues().find((i) => i.id === id);
  if (!e) throw new Error(`Issue not found: ${id}`);
  return e;
}
