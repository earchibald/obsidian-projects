import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { TaskEntry } from "./types";
import { appendTaskBody } from "./taskAppendNotePure";

export interface TaskAppendNoteResult {
  taskId: string;
  path: string;
  appended: boolean;
  beforeSize: number;
  afterSize: number;
}

export async function taskAppendNote(
  app: App,
  store: IssueStore,
  taskId: string,
  body: string,
): Promise<TaskAppendNoteResult> {
  const entry = findTaskById(store, taskId);
  const file = app.vault.getAbstractFileByPath(entry.path);
  if (!(file instanceof TFile)) {
    throw new Error(`Task file not found on disk: ${entry.path}`);
  }
  const text = await app.vault.read(file);
  const { next, appended } = appendTaskBody(text, body);
  if (next !== text) {
    await app.vault.modify(file, next);
  }
  return {
    taskId: entry.id,
    path: entry.path,
    appended,
    beforeSize: text.length,
    afterSize: next.length,
  };
}

function findTaskById(store: IssueStore, id: string): TaskEntry {
  const t = store.tasks().find((e) => e.id === id);
  if (!t) throw new Error(`Task not found: ${id}`);
  return t;
}
