import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { TaskEntry, TaskStatus } from "./types";

export const TASK_STATUS_VALUES: readonly TaskStatus[] = [
  "pending",
  "in-progress",
  "completed",
  "blocked",
];

export interface TaskSetStatusResult {
  taskId: string;
  path: string;
  previousStatus: TaskStatus | undefined;
  status: TaskStatus;
}

/**
 * Flip the `status:` frontmatter on a TASK note via processFrontMatter so the
 * write is atomic and other YAML keys are preserved.
 */
export async function taskSetStatus(
  app: App,
  store: IssueStore,
  taskId: string,
  status: TaskStatus,
): Promise<TaskSetStatusResult> {
  if (!TASK_STATUS_VALUES.includes(status)) {
    throw new Error(
      `op-task-set-status: status must be one of ${TASK_STATUS_VALUES.join("|")} (got ${JSON.stringify(status)})`,
    );
  }
  const entry = findTaskById(store, taskId);
  const file = app.vault.getAbstractFileByPath(entry.path);
  if (!(file instanceof TFile)) {
    throw new Error(`Task file not found on disk: ${entry.path}`);
  }
  let previousStatus: TaskStatus | undefined;
  await app.fileManager.processFrontMatter(file, (fm) => {
    if (typeof fm.status === "string") previousStatus = fm.status as TaskStatus;
    fm.status = status;
  });
  return { taskId: entry.id, path: entry.path, previousStatus, status };
}

function findTaskById(store: IssueStore, id: string): TaskEntry {
  const t = store.tasks().find((e) => e.id === id);
  if (!t) throw new Error(`Task not found: ${id}`);
  return t;
}
